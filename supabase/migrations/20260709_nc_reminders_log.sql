create table if not exists nc_reminders_log (
  id          uuid primary key default gen_random_uuid(),
  accion_id   uuid not null references nc_acciones(id) on delete cascade,
  enviado_en  date not null default current_date,
  unique (accion_id, enviado_en)
);

create index if not exists idx_nc_reminders_log_accion on nc_reminders_log(accion_id);
