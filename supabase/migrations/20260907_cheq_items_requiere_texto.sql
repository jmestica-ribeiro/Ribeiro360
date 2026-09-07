alter table cheq_items
  add column if not exists requiere_texto boolean not null default false;
