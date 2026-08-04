-- Likes y comentarios para novedades/anuncios en Social
create table if not exists novedad_likes (
  id         uuid primary key default gen_random_uuid(),
  novedad_id uuid not null references novedades(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (novedad_id, user_id)
);

create index if not exists idx_novedad_likes_novedad on novedad_likes(novedad_id);

create table if not exists novedad_comentarios (
  id         uuid primary key default gen_random_uuid(),
  novedad_id uuid not null references novedades(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  contenido  text not null check (char_length(contenido) <= 500),
  created_at timestamptz default now()
);

create index if not exists idx_novedad_comentarios_novedad on novedad_comentarios(novedad_id);

-- RLS: cualquier usuario autenticado puede leer/insertar; solo el autor o admin puede borrar
alter table novedad_likes enable row level security;
create policy "read novedad_likes"   on novedad_likes for select using (true);
create policy "insert novedad_likes" on novedad_likes for insert with check (auth.uid() = user_id);
create policy "delete novedad_likes" on novedad_likes for delete using (auth.uid() = user_id);

alter table novedad_comentarios enable row level security;
create policy "read novedad_comentarios"   on novedad_comentarios for select using (true);
create policy "insert novedad_comentarios" on novedad_comentarios for insert with check (auth.uid() = user_id);
create policy "delete novedad_comentarios" on novedad_comentarios for delete using (auth.uid() = user_id);
