-- Permite a la Edge Function buscar el UUID de un usuario existente por email.
-- Ejecutar en: Supabase Dashboard → SQL Editor
create or replace function public.get_user_id_by_email(user_email text)
returns uuid
language sql
security definer
stable
as $$
  select id from auth.users where lower(email) = lower(user_email) limit 1;
$$;
