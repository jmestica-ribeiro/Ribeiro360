import { supabase } from '../lib/supabase';

export async function fetchPortalCMASS() {
  const [planesRes, itemsRes, coursesRes, cumplimientoRes] = await Promise.all([
    supabase.from('paf_planes').select('*').order('anio'),
    supabase.from('paf_items').select('*, categoria:cursos_categorias(nombre, color)').order('mes').order('orden'),
    supabase.from('cursos').select('id, titulo, es_paf, paf_item_id, categoria:cursos_categorias(nombre, color)'),
    supabase.from('paf_cumplimiento').select('*'),
  ]);
  const error = planesRes.error || itemsRes.error || coursesRes.error || cumplimientoRes.error || null;
  if (error) console.error('[pafService] fetchPortalCMASS:', error.message);
  return {
    planes: planesRes.data ?? [],
    items: itemsRes.data ?? [],
    courses: coursesRes.data ?? [],
    cumplimiento: cumplimientoRes.data ?? [],
    error,
  };
}

export async function fetchPAF() {
  const [planesRes, itemsRes] = await Promise.all([
    supabase.from('paf_planes').select('*').order('anio', { ascending: false }),
    supabase.from('paf_items').select('*').order('mes').order('orden'),
  ]);
  if (planesRes.error) console.error('[pafService] fetchPAF - planes:', planesRes.error.message);
  if (itemsRes.error) console.error('[pafService] fetchPAF - items:', itemsRes.error.message);
  return {
    planes: planesRes.data ?? [],
    items: itemsRes.data ?? [],
    error: planesRes.error || itemsRes.error || null,
  };
}

export async function createPafPlan(anio) {
  const { data, error } = await supabase.from('paf_planes').insert({ anio }).select();
  if (error) console.error('[pafService] createPafPlan:', error.message);
  return { data, error };
}

export async function savePafItem(payload) {
  const { id, ...fields } = payload;
  const query = id
    ? supabase.from('paf_items').update(fields).eq('id', id).select()
    : supabase.from('paf_items').insert(fields).select();
  const { data, error } = await query;
  if (error) console.error('[pafService] savePafItem:', error.message);
  return { data, error };
}

export async function deletePafItem(id) {
  const { error } = await supabase.from('paf_items').delete().eq('id', id);
  if (error) console.error('[pafService] deletePafItem:', error.message);
  return { error };
}
