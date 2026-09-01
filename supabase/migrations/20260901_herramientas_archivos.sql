alter table herramientas_links
  add column if not exists tipo      text not null default 'link' check (tipo in ('link', 'archivo')),
  add column if not exists file_path text;

-- Bucket privado para archivos de herramientas
insert into storage.buckets (id, name, public)
values ('herramientas-archivos', 'herramientas-archivos', false)
on conflict (id) do nothing;

-- Admins pueden subir/borrar; todos los autenticados pueden leer
create policy "herramientas_archivos_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'herramientas-archivos' AND is_admin());

create policy "herramientas_archivos_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'herramientas-archivos' AND is_admin());

create policy "herramientas_archivos_auth_select"
  on storage.objects for select
  using (bucket_id = 'herramientas-archivos' AND auth.role() = 'authenticated');
