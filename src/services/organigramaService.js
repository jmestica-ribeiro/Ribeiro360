import { supabase } from '../lib/supabase';

export async function fetchOrgNodos() {
  const { data, error } = await supabase
    .from('organigrama_nodos')
    .select('*')
    .order('numero_orden');
  if (error) console.error('[organigramaService] fetchOrgNodos:', error.message);
  return { data: data ?? [], error };
}

/**
 * Crea o actualiza un nodo del organigrama.
 * Si el payload incluye `id`, hace update; si no, hace insert.
 */
export async function saveOrgNodo(payload) {
  const { id, ...fields } = payload;
  const normalized = {
    nombre: fields.nombre,
    cargo: fields.cargo,
    area: fields.area || null,
    area_color: fields.area_color || '#cccccc',
    parent_id: fields.parent_id || null,
    foto_url: fields.foto_url || null,
    numero_orden: parseInt(fields.numero_orden) || 0,
    activo: fields.activo,
  };

  const query = id
    ? supabase.from('organigrama_nodos').update(normalized).eq('id', id).select()
    : supabase.from('organigrama_nodos').insert(normalized).select();

  const { data, error } = await query;
  if (error) console.error('[organigramaService] saveOrgNodo:', error.message);
  return { data, error };
}

export async function deleteOrgNodo(id) {
  const { error } = await supabase.from('organigrama_nodos').delete().eq('id', id);
  if (error) console.error('[organigramaService] deleteOrgNodo:', error.message);
  return { error };
}
