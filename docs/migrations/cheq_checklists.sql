-- Checklists de Equipo (maquinaria pesada y vehículos)

-- Ítems de verificación por tipo de equipo (gestionados desde admin)
create table if not exists cheq_items (
  id          uuid primary key default gen_random_uuid(),
  tipo_equipo text not null,
  nombre      text not null,
  orden       integer not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz default now()
);

-- Checklists completados
create table if not exists cheq_checklists (
  id           uuid primary key default gen_random_uuid(),
  tipo_equipo  text not null,
  fecha        date not null,
  lugar        text,
  dominio      text,
  interno_nro  text,
  marca        text,
  modelo       text,
  km_hrs       text,
  operador_id  uuid references profiles(id),
  created_at   timestamptz default now()
);

-- Respuestas por ítem
create table if not exists cheq_respuestas (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references cheq_checklists(id) on delete cascade,
  item_id      uuid not null references cheq_items(id),
  estado       text not null check (estado in ('bien', 'regular', 'mal')),
  observacion  text,
  created_at   timestamptz default now()
);

-- RLS
alter table cheq_items       enable row level security;
alter table cheq_checklists  enable row level security;
alter table cheq_respuestas  enable row level security;

create policy "cheq_items_read"       on cheq_items       for select using (auth.role() = 'authenticated');
create policy "cheq_items_admin"      on cheq_items       for all    using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')));

create policy "cheq_checklists_read"  on cheq_checklists  for select using (auth.role() = 'authenticated');
create policy "cheq_checklists_write" on cheq_checklists  for insert with check (auth.role() = 'authenticated');
create policy "cheq_checklists_admin" on cheq_checklists  for all    using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')));

create policy "cheq_respuestas_read"  on cheq_respuestas  for select using (auth.role() = 'authenticated');
create policy "cheq_respuestas_write" on cheq_respuestas  for insert with check (auth.role() = 'authenticated');
create policy "cheq_respuestas_admin" on cheq_respuestas  for all    using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')));
