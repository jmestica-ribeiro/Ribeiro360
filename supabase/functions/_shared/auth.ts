import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Verifica el JWT del request y devuelve el usuario autenticado.
 * Lanza un error si el token falta o es inválido.
 */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  // Cliente con anon key para validar el JWT del usuario
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

/**
 * Devuelve un cliente con service_role para operaciones privilegiadas.
 * NUNCA exponer este cliente al frontend.
 */
export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Verifica que el usuario tenga rol admin o superadmin.
 * Lanza un error si no tiene permisos.
 */
export async function requireAdminRole(
  adminClient: SupabaseClient,
  userId: string
): Promise<{ role: string; admin_tabs: string[] | null }> {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role, admin_tabs')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('FORBIDDEN');
  }

  if (!['admin', 'superadmin'].includes(profile.role)) {
    throw new Error('FORBIDDEN');
  }

  return profile;
}
