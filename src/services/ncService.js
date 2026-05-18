import { supabase } from '../lib/supabase';

// ── Lookup data ───────────────────────────────────────────────────────────────

export async function fetchNcProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, job_title, department, office_location, avatar_url')
    .order('full_name', { ascending: true });
  if (error) console.error('[ncService] fetchProfiles:', error.message);
  return { data: data ?? [], error };
}

export async function fetchNcCentrosDeCostos() {
  const { data, error } = await supabase
    .from('centros_de_costos')
    .select('id, nombre, categoria')
    .eq('activo', true)
    .order('codigo', { ascending: true });
  if (error) console.error('[ncService] fetchCentrosDeCostos:', error.message);
  return { data: data ?? [], error };
}

export async function fetchNcDocumentosInternos() {
  const { data, error } = await supabase
    .from('sgi_documentos')
    .select('id, titulo, codigo, tipo_documento')
    .eq('activo', true)
    .order('titulo', { ascending: true });
  if (error) console.error('[ncService] fetchDocumentosInternos:', error.message);
  return { data: data ?? [], error };
}

// ── Hallazgos ─────────────────────────────────────────────────────────────────

export async function countHallazgosByTipoAndYear(tipo, year) {
  const { count, error } = await supabase
    .from('nc_hallazgos')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', tipo)
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`);
  if (error) console.error('[ncService] countHallazgosByTipoAndYear:', error.message);
  return { count: count ?? 0, error };
}

export async function fetchHallazgo(id) {
  const { data, error } = await supabase
    .from('nc_hallazgos')
    .select('*')
    .eq('id', id)
    .single();
  if (error) console.error('[ncService] fetchHallazgo:', error.message);
  return { data, error };
}

export async function insertHallazgo(payload) {
  const { data, error } = await supabase
    .from('nc_hallazgos')
    .insert(payload)
    .select('id')
    .single();
  if (error) console.error('[ncService] insertHallazgo:', error.message);
  return { data, error };
}

export async function updateHallazgo(id, payload) {
  const { error } = await supabase
    .from('nc_hallazgos')
    .update(payload)
    .eq('id', id);
  if (error) console.error('[ncService] updateHallazgo:', error.message);
  return { error };
}

// ── Adjuntos de Hallazgo ──────────────────────────────────────────────────────

export async function fetchAdjuntosByHallazgo(hallazgoId, paso) {
  let query = supabase.from('nc_adjuntos').select('*').eq('hallazgo_id', hallazgoId);
  if (paso !== undefined) query = query.eq('paso', paso);
  const { data, error } = await query;
  if (error) console.error('[ncService] fetchAdjuntosByHallazgo:', error.message);
  return { data: data ?? [], error };
}

export async function insertAdjuntos(adjuntos) {
  const { error } = await supabase.from('nc_adjuntos').insert(adjuntos);
  if (error) console.error('[ncService] insertAdjuntos:', error.message);
  return { error };
}

// ── Acciones ──────────────────────────────────────────────────────────────────

export async function fetchAccionesNc(hallazgoId) {
  const { data, error } = await supabase
    .from('nc_acciones')
    .select('*, responsable:profiles!responsable_id(full_name)')
    .eq('hallazgo_id', hallazgoId)
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false });
  if (error) console.error('[ncService] fetchAccionesNc:', error.message);
  return { data: data ?? [], error };
}

export async function countAccionesByHallazgo(hallazgoId) {
  const { count, error } = await supabase
    .from('nc_acciones')
    .select('id', { count: 'exact', head: true })
    .eq('hallazgo_id', hallazgoId);
  if (error) console.error('[ncService] countAccionesByHallazgo:', error.message);
  return { count: count ?? 0, error };
}

export async function insertAccionNc(payload) {
  const { data, error } = await supabase
    .from('nc_acciones')
    .insert(payload)
    .select('id')
    .single();
  if (error) console.error('[ncService] insertAccionNc:', error.message);
  return { data, error };
}

export async function updateAccionNc(id, payload) {
  const { error } = await supabase
    .from('nc_acciones')
    .update(payload)
    .eq('id', id);
  if (error) console.error('[ncService] updateAccionNc:', error.message);
  return { error };
}

export async function deleteAccionNc(id) {
  const { error } = await supabase
    .from('nc_acciones')
    .delete()
    .eq('id', id);
  if (error) console.error('[ncService] deleteAccionNc:', error.message);
  return { error };
}

// ── Hitos de Acción ───────────────────────────────────────────────────────────

export async function fetchHitosNc(accionId) {
  const { data, error } = await supabase
    .from('nc_accion_hitos')
    .select('*')
    .eq('accion_id', accionId)
    .order('fecha', { ascending: true });
  if (error) console.error('[ncService] fetchHitosNc:', error.message);
  return { data: data ?? [], error };
}

export async function fetchHitosNcResumen(accionId) {
  const { data, error } = await supabase
    .from('nc_accion_hitos')
    .select('fecha, porcentaje, descripcion')
    .eq('accion_id', accionId)
    .order('fecha', { ascending: true });
  if (error) console.error('[ncService] fetchHitosNcResumen:', error.message);
  return { data: data ?? [], error };
}

export async function insertHitoNc(payload) {
  const { error } = await supabase
    .from('nc_accion_hitos')
    .insert(payload);
  if (error) console.error('[ncService] insertHitoNc:', error.message);
  return { error };
}

export async function deleteHitoNc(id) {
  const { error } = await supabase
    .from('nc_accion_hitos')
    .delete()
    .eq('id', id);
  if (error) console.error('[ncService] deleteHitoNc:', error.message);
  return { error };
}

// ── Storage ───────────────────────────────────────────────────────────────────

export async function uploadNcAdjunto(path, file) {
  const { error } = await supabase.storage
    .from('nc-adjuntos')
    .upload(path, file, { upsert: false });
  if (error) console.error('[ncService] uploadNcAdjunto:', error.message);
  return { error };
}

export async function getNcPublicUrl(path) {
  const { data } = supabase.storage.from('nc-adjuntos').getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export async function getNcSignedUrls(paths, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('nc-adjuntos')
    .createSignedUrls(paths, expiresIn);
  if (error) console.error('[ncService] getNcSignedUrls:', error.message);
  return { data: data ?? [], error };
}
