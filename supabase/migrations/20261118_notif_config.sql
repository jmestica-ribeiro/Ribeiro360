-- Configuración de notificaciones masivas, editable desde el panel de admin.
-- Una fila por tipo de notificación (key). `opciones` guarda los ajustes propios de cada tipo.
create table if not exists notif_config (
  key        text primary key,
  enabled    boolean not null default true,
  opciones   jsonb   not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

alter table notif_config enable row level security;
create policy "notif_config_read"  on notif_config for select using (auth.role() = 'authenticated');
create policy "notif_config_write" on notif_config for all    using (is_admin()) with check (is_admin());

-- Aviso a todos los usuarios cuando un documento SGI queda vigente.
-- El email arranca APAGADO: se activa desde Admin › SGI después de revisar la vista previa.
insert into notif_config (key, enabled, opciones) values (
  'sgi_documento_publicado',
  true,
  '{"email": false, "campana": true, "nuevos": true, "revisiones": true, "excluir_confidenciales": true, "mensaje_extra": ""}'::jsonb
) on conflict (key) do nothing;

-- Evita reenviar el email masivo si se dispara dos veces para la misma versión.
alter table sgi_versiones add column if not exists notificado_at timestamptz;
