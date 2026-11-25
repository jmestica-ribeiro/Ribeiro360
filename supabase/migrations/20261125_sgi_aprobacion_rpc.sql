-- Aprobación / rechazo de versiones SGI vía RPC (SECURITY DEFINER).
--
-- Problema: el gerente aprobador no es admin y las políticas RLS de sgi_versiones no le
-- permiten hacer UPDATE. Supabase no devuelve error en ese caso (actualiza 0 filas), así que
-- la UI recargaba y la versión seguía "pendiente de aprobación" sin quedar nunca vigente.
--
-- Solución: la transición de estado la hace la base, validando acá quién puede hacerla
-- (mismas reglas que la UI), de forma atómica (desmarca la vigente anterior y marca la nueva).

-- ¿El usuario actual puede aprobar/rechazar esta versión como Gerencia?
create or replace function sgi_puede_aprobar(p_version_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from sgi_versiones v
      join sgi_documentos d on d.id = v.documento_id
      join profiles me on me.id = auth.uid()
      left join profiles cr on cr.id = d.created_by
     where v.id = p_version_id
       and coalesce(me.is_active, true)
       and (
         me.role in ('admin', 'superadmin')
         or d.aprobador_id = me.id
         or (d.aprobador_id is null
             and me.job_title ~* '^\s*gerente\M'
             and cr.department is not null
             and me.department = cr.department)
       )
  );
$$;

-- ¿El usuario actual es revisor del circuito (área configurada en Admin › SGI o revisor adicional)?
create or replace function sgi_es_revisor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from profiles me
      left join notif_config c on c.key = 'sgi_circuito_aprobacion'
     where me.id = auth.uid()
       and coalesce(me.is_active, true)
       and (
         me.role in ('admin', 'superadmin')
         or lower(trim(coalesce(me.department, ''))) = lower(trim(coalesce(c.opciones->>'revisor_departamento', 'CMASS')))
         or coalesce(c.opciones->'revisores_ids', '[]'::jsonb) ? me.id::text
       )
  );
$$;

create or replace function sgi_aprobar_version(p_version_id uuid, p_comentario text default null)
returns sgi_versiones
language plpgsql security definer set search_path = public as $$
declare
  v  sgi_versiones;
  me profiles;
begin
  select * into v from sgi_versiones where id = p_version_id for update;
  if not found then
    raise exception 'Versión no encontrada';
  end if;
  if v.estado_aprobacion is distinct from 'pendiente_aprobacion' then
    raise exception 'La versión no está pendiente de aprobación (estado actual: %)', coalesce(v.estado_aprobacion, 'sin estado');
  end if;
  if not sgi_puede_aprobar(p_version_id) then
    raise exception 'No tenés permiso para aprobar este documento' using errcode = '42501';
  end if;

  select * into me from profiles where id = auth.uid();

  -- Solo una versión vigente por documento: primero se desmarca la anterior.
  update sgi_versiones set vigente = false
   where documento_id = v.documento_id and id <> v.id and vigente;

  update sgi_versiones
     set estado_aprobacion     = 'aprobado',
         aprobador_id          = me.id,
         aprobador             = me.full_name,
         fecha_aprobacion      = now(),
         comentario_aprobacion = nullif(trim(p_comentario), ''),
         vigente               = true
   where id = v.id
  returning * into v;

  return v;
end;
$$;

create or replace function sgi_rechazar_version(p_version_id uuid, p_comentario text default null)
returns sgi_versiones
language plpgsql security definer set search_path = public as $$
declare
  v sgi_versiones;
begin
  select * into v from sgi_versiones where id = p_version_id for update;
  if not found then
    raise exception 'Versión no encontrada';
  end if;

  if v.estado_aprobacion = 'pendiente_aprobacion' then
    if not sgi_puede_aprobar(p_version_id) then
      raise exception 'No tenés permiso para rechazar este documento' using errcode = '42501';
    end if;
  elsif v.estado_aprobacion = 'en_revision' then
    if not sgi_es_revisor() then
      raise exception 'No tenés permiso para rechazar este documento' using errcode = '42501';
    end if;
  else
    raise exception 'La versión no está en revisión ni pendiente de aprobación (estado actual: %)', coalesce(v.estado_aprobacion, 'sin estado');
  end if;

  update sgi_versiones
     set estado_aprobacion   = 'rechazado',
         comentario_revision = nullif(trim(p_comentario), '')
   where id = v.id
  returning * into v;

  return v;
end;
$$;

revoke all on function sgi_aprobar_version(uuid, text)  from public, anon;
revoke all on function sgi_rechazar_version(uuid, text) from public, anon;
grant execute on function sgi_aprobar_version(uuid, text)  to authenticated;
grant execute on function sgi_rechazar_version(uuid, text) to authenticated;
grant execute on function sgi_puede_aprobar(uuid) to authenticated;
grant execute on function sgi_es_revisor()        to authenticated;
