import { supabase } from '../lib/supabase';

/**
 * Obtiene la configuración de visibilidad de todos los portales.
 * Retorna un mapa { [departamento]: boolean (publico) }
 */
export async function fetchPortalesConfig() {
  const { data, error } = await supabase
    .from('portales_config')
    .select('departamento, publico');
  if (error) console.error('[portalesService] fetchPortalesConfig:', error.message);
  return { data: data ?? [], error };
}

/**
 * Actualiza (upsert) la visibilidad pública de un portal.
 * @param {string} departamento - Nombre exacto del departamento
 * @param {boolean} publico
 */
export async function updatePortalVisibilidad(departamento, publico) {
  const { data, error } = await supabase
    .from('portales_config')
    .upsert([{ departamento, publico }], { onConflict: 'departamento' })
    .select();
  if (error) console.error('[portalesService] updatePortalVisibilidad:', error.message);
  return { data: data?.[0] ?? null, error };
}
