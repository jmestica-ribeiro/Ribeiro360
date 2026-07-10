-- Activa las extensiones necesarias para el cron de recordatorios.
-- El schedule en sí se configura con el script scripts/setup-cron.sql
-- (no commiteado) para no exponer el service_role_key en el repo.
create extension if not exists pg_cron;
create extension if not exists pg_net;
