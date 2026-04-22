import { supabase } from '../lib/supabase';

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, admin_tabs')
    .not('full_name', 'is', null)
    .order('full_name');
  if (error) console.error('[usuariosService] fetchAllUsers:', error.message);
  return { data: data ?? [], error };
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
/**
 * Envía un CSV de Entra ID a la Edge Function para sincronizar usuarios.
 * @param {File} csvFile
 */
export async function syncMsUsers(csvFile) {
  const csvText = await csvFile.text();
  const { data, error } = await supabase.functions.invoke('sync-ms-users', {
    body: { csv: csvText },
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

export async function updateUserRoleAndTabs(userId, newRole, adminTabs) {
  const { error } = await supabase.rpc('admin_update_user_role', {
    target_user_id: userId,
    new_role: newRole,
    new_admin_tabs: adminTabs && adminTabs.length > 0 ? adminTabs : null,
  });
  if (error) console.error('[usuariosService] updateUserRoleAndTabs:', error.message);
  return { error };
}
