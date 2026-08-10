import { supabase } from '../lib/supabase';

/**
 * Lista usuarios con búsqueda, filtro de inactivos y paginación opcionales,
 * resueltas server-side (antes traía la tabla completa y paginaba con .slice()
 * en el cliente). Sin `page`, se comporta como antes y trae la lista completa
 * (la usan pickers como el de destinatarios de curso en CapacitacionesTab).
 */
export async function fetchAllUsers({ search = '', showInactive = false, page = null, pageSize = 10 } = {}) {
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, role, admin_tabs, is_active', { count: 'exact' })
    .not('full_name', 'is', null);

  if (!showInactive) query = query.neq('is_active', false);

  const q = search.trim().replace(/[%,]/g, ''); // evita romper el filtro .or de PostgREST
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  query = query.order('full_name');
  if (page !== null) {
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) console.error('[usuariosService] fetchAllUsers:', error.message);
  return { data: data ?? [], count: count ?? data?.length ?? 0, error };
}

/**
 * Obtiene los valores únicos de campos de perfil para construir
 * selectores de reglas de visibilidad en el admin.
 * @returns {{ job_title: string[], department: string[], office_location: string[] }}
 */
export async function fetchProfileValues() {
  const { data, error } = await supabase
    .from('profiles')
    .select('job_title, department, office_location')
    .not('full_name', 'is', null);
  if (error) {
    console.error('[usuariosService] fetchProfileValues:', error.message);
    return { data: { job_title: [], department: [], office_location: [] }, error };
  }
  return {
    data: {
      job_title: [...new Set((data || []).map(p => p.job_title).filter(Boolean))].sort(),
      department: [...new Set((data || []).map(p => p.department).filter(Boolean))].sort(),
      office_location: [...new Set((data || []).map(p => p.office_location).filter(Boolean))].sort(),
    },
    error: null,
  };
}

/**
 * Actualiza el rol y los tabs de admin de un usuario vía RPC.
 * @param {string} userId
 * @param {string} newRole - 'user' | 'admin' | 'superadmin'
 * @param {string[]|null} adminTabs - tabs visibles en el admin, o null para todos
 */
export async function syncMsPhotos() {
  const { data, error } = await supabase.functions.invoke('sync-ms-photos', { body: {} });
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function syncMsUsers() {
  const { data, error } = await supabase.functions.invoke('sync-ms-users', {
    body: {},
  });
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function deleteUser(userId) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete_user', payload: { userId } },
  });
  if (error) console.error('[usuariosService] deleteUser:', error.message);
  return { data, error };
}

export async function fetchSgiUploaders() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, can_upload_sgi')
    .not('full_name', 'is', null)
    .order('full_name');
  if (error) console.error('[usuariosService] fetchSgiUploaders:', error.message);
  return { data: data ?? [], error };
}

export async function updateCanUploadSgi(userId, value) {
  const { error } = await supabase
    .from('profiles')
    .update({ can_upload_sgi: value })
    .eq('id', userId);
  if (error) console.error('[usuariosService] updateCanUploadSgi:', error.message);
  return { error };
}

export async function updateUserRoleAndTabs(userId, newRole, adminTabs) {
  const { error } = await supabase.rpc('admin_update_user_role', {
    target_user_id: userId,
    new_role: newRole,
    new_admin_tabs: adminTabs && adminTabs.length > 0 ? adminTabs : null,
  });
  if (error) console.error('[usuariosService] updateUserRoleAndTabs:', error.message);
  return { error };
}

export async function fetchDirectorioProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, job_title, department, office_location, avatar_url, phone, whatsapp_consent')
    .neq('is_active', false)
    .order('full_name', { ascending: true })
    .limit(2000); // tope defensivo: el filtro/paginado de Directorio.jsx es client-side
  if (error) console.error('[usuariosService] fetchDirectorioProfiles:', error.message);
  return { data: data ?? [], error };
}

export async function updateMiPerfil(userId, payload) {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select();
  if (error) console.error('[usuariosService] updateMiPerfil:', error.message);
  return { data: data?.[0] ?? null, error };
}
