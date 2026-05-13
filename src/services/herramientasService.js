import { supabase } from '../lib/supabase';

// ── Sectores ──────────────────────────────────────────────────────────────────

export async function fetchSectores() {
  const { data, error } = await supabase
    .from('herramientas_sectores')
    .select('*')
    .order('orden', { ascending: true });
  if (error) console.error('[herramientasService] fetchSectores:', error.message);
  return { data: data ?? [], error };
}

export async function saveSector(payload) {
  const { data, error } = await supabase
    .from('herramientas_sectores')
    .upsert([payload])
    .select();
  if (error) console.error('[herramientasService] saveSector:', error.message);
  return { data: data?.[0] ?? null, error };
}

export async function deleteSector(id) {
  const { error } = await supabase.from('herramientas_sectores').delete().eq('id', id);
  if (error) console.error('[herramientasService] deleteSector:', error.message);
  return { error };
}

// ── Links ─────────────────────────────────────────────────────────────────────

export async function fetchLinks(sectorId) {
  const { data, error } = await supabase
    .from('herramientas_links')
    .select('*')
    .eq('sector_id', sectorId)
    .order('orden', { ascending: true });
  if (error) console.error('[herramientasService] fetchLinks:', error.message);
  return { data: data ?? [], error };
}

export async function fetchAllLinks() {
  const { data, error } = await supabase
    .from('herramientas_links')
    .select('*')
    .order('orden', { ascending: true });
  if (error) console.error('[herramientasService] fetchAllLinks:', error.message);
  return { data: data ?? [], error };
}

export async function saveLink(payload) {
  const { data, error } = await supabase
    .from('herramientas_links')
    .upsert([payload])
    .select();
  if (error) console.error('[herramientasService] saveLink:', error.message);
  return { data: data?.[0] ?? null, error };
}

export async function deleteLink(id) {
  const { error } = await supabase.from('herramientas_links').delete().eq('id', id);
  if (error) console.error('[herramientasService] deleteLink:', error.message);
  return { error };
}

export async function swapLinkOrden(a, b) {
  await supabase.from('herramientas_links').update({ orden: b.orden }).eq('id', a.id);
  await supabase.from('herramientas_links').update({ orden: a.orden }).eq('id', b.id);
}

export async function swapSectorOrden(a, b) {
  await supabase.from('herramientas_sectores').update({ orden: b.orden }).eq('id', a.id);
  await supabase.from('herramientas_sectores').update({ orden: a.orden }).eq('id', b.id);
}
