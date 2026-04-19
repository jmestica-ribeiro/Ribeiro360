import { supabase } from '../lib/supabase';

export async function fetchEventos() {
  const { data, error } = await supabase
    .from('eventos')
    .select('*, categoria:eventos_categorias(nombre, color), area:areas(nombre, color)')
    .order('fecha', { ascending: true });
  if (error) console.error('[eventosService] fetchEventos:', error.message);
  return { data: data ?? [], error };
}

export async function fetchEventosCategorias() {
  const { data, error } = await supabase.from('eventos_categorias').select('*');
  if (error) console.error('[eventosService] fetchEventosCategorias:', error.message);
  return { data: data ?? [], error };
}

export async function fetchAreas() {
  const { data, error } = await supabase.from('areas').select('*');
  if (error) console.error('[eventosService] fetchAreas:', error.message);
  return { data: data ?? [], error };
}

export async function fetchEventoVisibilidad(eventoId) {
  const { data, error } = await supabase
    .from('eventos_visibilidad')
    .select('*')
    .eq('evento_id', eventoId);
  if (error) console.error('[eventosService] fetchEventoVisibilidad:', error.message);
  return { data: data ?? [], error };
}

/**
 * Guarda un evento y sus reglas de visibilidad.
 * Si el payload incluye `id`, hace upsert; si no, inserta.
 * @param {object} eventoPayload
 * @param {Array<{campo: string, valor: string}>} visibilidadRules
 */
export async function saveEvento(eventoPayload, visibilidadRules = []) {
  const { data: savedEvento, error } = await supabase
    .from('eventos')
    .upsert([eventoPayload])
    .select();
  if (error) {
    console.error('[eventosService] saveEvento:', error.message);
    return { data: null, error };
  }

  const savedId = savedEvento[0].id;
  await supabase.from('eventos_visibilidad').delete().eq('evento_id', savedId);

  if (visibilidadRules.length > 0) {
    const visPayload = visibilidadRules
      .filter(r => r.valor?.trim())
      .map(r => ({ evento_id: savedId, campo: r.campo, valor: r.valor.trim() }));
    if (visPayload.length > 0) {
      await supabase.from('eventos_visibilidad').insert(visPayload);
    }
  }

  return { data: savedEvento[0], error: null };
}

export async function deleteEvento(id) {
  const { error } = await supabase.from('eventos').delete().eq('id', id);
  if (error) console.error('[eventosService] deleteEvento:', error.message);
  return { error };
}

export async function fetchEventosByDateRange(from, to) {
  const { data, error } = await supabase
    .from('eventos')
    .select('*, categoria:eventos_categorias(nombre, color), area:areas(nombre, color)')
    .gte('fecha', from)
    .lte('fecha', to);
  if (error) console.error('[eventosService] fetchEventosByDateRange:', error.message);
  return { data: data ?? [], error };
}

export async function fetchEventosVisibilidad() {
  const { data, error } = await supabase.from('eventos_visibilidad').select('*');
  if (error) console.error('[eventosService] fetchEventosVisibilidad:', error.message);
  return { data: data ?? [], error };
}
