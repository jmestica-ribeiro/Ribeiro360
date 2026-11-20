-- Lectura obligatoria de documentos SGI + log de lectura por usuario.
-- La lectura se registra por VERSIÓN: una nueva revisión vigente vuelve a pedir confirmación.

alter table sgi_documentos add column if not exists lectura_obligatoria boolean not null default false;

-- Cuándo se envió el aviso de lectura obligatoria de esta versión (evita duplicados).
alter table sgi_versiones add column if not exists lectura_notificada_at timestamptz;

create table if not exists sgi_lecturas (
  version_id   uuid not null references sgi_versiones(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  documento_id uuid not null references sgi_documentos(id) on delete cascade,
  leido_at     timestamptz not null default now(),
  primary key (version_id, user_id)
);
create index if not exists sgi_lecturas_documento_idx on sgi_lecturas (documento_id);
create index if not exists sgi_lecturas_user_idx on sgi_lecturas (user_id);

-- Quién puede ver el avance de lectura de todos: admins y usuarios que cargan documentos SGI.
create or replace function can_ver_lecturas_sgi() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (role in ('admin', 'superadmin') or can_upload_sgi is true)
  );
$$;

alter table sgi_lecturas enable row level security;

drop policy if exists "sgi_lecturas_select" on sgi_lecturas;
create policy "sgi_lecturas_select" on sgi_lecturas for select
  using (user_id = auth.uid() or can_ver_lecturas_sgi());

-- Cada usuario solo puede registrar su propia lectura (no se edita ni se borra desde el cliente).
drop policy if exists "sgi_lecturas_insert" on sgi_lecturas;
create policy "sgi_lecturas_insert" on sgi_lecturas for insert
  with check (user_id = auth.uid());

-- Email de lectura obligatoria: activo por defecto (se envía aunque el aviso general esté apagado).
update notif_config
   set opciones = opciones || '{"email_obligatoria": true}'::jsonb
 where key = 'sgi_documento_publicado'
   and not (opciones ? 'email_obligatoria');
