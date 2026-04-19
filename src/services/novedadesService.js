import { supabase } from '../lib/supabase';

export async function fetchNovedades() {
  const { data, error } = await supabase
    .from('novedades')
    .select('*')
    .order('orden', { ascending: true });
  if (error) console.error('[novedadesService] fetchNovedades:', error.message);
  return { data: data ?? [], error };
}

/**
 * Sube una imagen al bucket 'novedades' y retorna la ruta del archivo.
 * @param {File} file
 * @returns {Promise<{path: string|null, error: object|null}>}
 */
export async function uploadNovedadImagen(file) {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('novedades').upload(path, file, { upsert: false });
  if (error) console.error('[novedadesService] uploadImagen:', error.message);
  return { path: error ? null : path, error };
}

/**
 * Inserta una nueva novedad.
 * @param {object} payload - { titulo, link_url, imagen_url, activo, orden, fecha_hasta }
 */
export async function insertNovedad(payload) {
  const { data, error } = await supabase.from('novedades').insert(payload).select();
  if (error) console.error('[novedadesService] insertNovedad:', error.message);
  return { data, error };
}

export async function updateNovedad(id, fields) {
  const { data, error } = await supabase.from('novedades').update(fields).eq('id', id).select();
  if (error) console.error('[novedadesService] updateNovedad:', error.message);
  return { data, error };
}

export async function deleteNovedad(id, imagenPath) {
  if (imagenPath && !imagenPath.startsWith('http')) {
    await supabase.storage.from('novedades').remove([imagenPath]);
  }
  const { error } = await supabase.from('novedades').delete().eq('id', id);
  if (error) console.error('[novedadesService] deleteNovedad:', error.message);
  return { error };
}

/**
 * Intercambia el orden entre dos novedades.
 * @param {{ id: string, orden: number }} a
 * @param {{ id: string, orden: number }} b
 */
export async function swapNovedadOrden(a, b) {
  const { error } = await Promise.all([
    supabase.from('novedades').update({ orden: b.orden }).eq('id', a.id),
    supabase.from('novedades').update({ orden: a.orden }).eq('id', b.id),
  ]).then(results => ({ error: results.find(r => r.error)?.error ?? null }));
  if (error) console.error('[novedadesService] swapOrden:', error.message);
  return { error };
}

/**
 * Genera la URL pública de una imagen almacenada en el bucket 'novedades'.
 * Si el path ya es una URL completa, la retorna directamente.
 * @param {string|null} path
 * @returns {string|null}
 */
export function getNovedadPublicUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from('novedades').getPublicUrl(path);
  return data?.publicUrl ?? null;
}
