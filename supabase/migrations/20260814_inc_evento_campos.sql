-- Campos adicionales para Eventos en inc_incidentes
alter table inc_incidentes
  add column if not exists nombre_reporta      text,
  add column if not exists acciones_inmediatas text;
