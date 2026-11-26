-- Secciones opcionales en los ítems de checklists de equipo.
-- Null = sin sección: los tipos que no la usan se ven igual que antes.
alter table public.cheq_items add column if not exists seccion text;
comment on column public.cheq_items.seccion is 'Título de sección opcional para agrupar ítems en el formulario, el detalle y el PDF. Null = sin sección.';
