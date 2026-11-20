-- Circuito de aprobación SGI: configuración desde Admin › SGI + recordatorios de pendientes.

-- Marcas de tiempo para saber cuánto lleva una versión esperando en su etapa actual.
alter table sgi_versiones add column if not exists created_at      timestamptz not null default now();
alter table sgi_versiones add column if not exists estado_desde    timestamptz not null default now();
alter table sgi_versiones add column if not exists recordatorio_at timestamptz;

-- Cada vez que cambia la etapa, se reinicia el contador de espera y de recordatorios.
create or replace function sgi_versiones_estado_desde() returns trigger
language plpgsql as $$
begin
  if new.estado_aprobacion is distinct from old.estado_aprobacion then
    new.estado_desde    := now();
    new.recordatorio_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_sgi_versiones_estado_desde on sgi_versiones;
create trigger trg_sgi_versiones_estado_desde
  before update on sgi_versiones
  for each row execute function sgi_versiones_estado_desde();

-- Configuración del circuito (reusa notif_config).
--  revisor_departamento: área que revisa (todas sus personas pueden revisar)
--  revisores_ids:        personas extra habilitadas a revisar
--  alertas:              qué emails se envían en cada paso
--  recordatorio_dias:    cada cuántos días recordar un pendiente (0 = nunca)
insert into notif_config (key, enabled, opciones) values (
  'sgi_circuito_aprobacion',
  true,
  '{
    "revisor_departamento": "CMASS",
    "revisores_ids": [],
    "alertas": {
      "revision_pendiente": true,
      "pendiente_aprobacion": true,
      "aprobado_autor": true,
      "aprobado_revisor": true,
      "rechazado_autor": true,
      "rechazado_revisor": true
    },
    "recordatorio_dias": 3
  }'::jsonb
) on conflict (key) do nothing;
