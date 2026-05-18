import { supabase } from '../lib/supabase';

// ── Lookup data ───────────────────────────────────────────────────────────────

export async function fetchIncidentesProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, job_title, department, office_location, avatar_url')
    .order('full_name', { ascending: true });
  if (error) console.error('[incidentesService] fetchProfiles:', error.message);
  return { data: data ?? [], error };
}

export async function fetchCentrosDeCostos() {
  const { data, error } = await supabase
    .from('centros_de_costos')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre', { ascending: true });
  if (error) console.error('[incidentesService] fetchCentrosDeCostos:', error.message);
  return { data: data ?? [], error };
}

// ── Incidentes ────────────────────────────────────────────────────────────────

export async function countIncidentesByYear(year) {
  const { count, error } = await supabase
    .from('inc_incidentes')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`);
  if (error) console.error('[incidentesService] countIncidentesByYear:', error.message);
  return { count: count ?? 0, error };
}

export async function fetchIncidente(id) {
  const { data, error } = await supabase
    .from('inc_incidentes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) console.error('[incidentesService] fetchIncidente:', error.message);
  return { data, error };
}

export async function fetchIncidentes(filters = {}) {
  let query = supabase.from('inc_incidentes').select('*').order('created_at', { ascending: false });
  if (filters.estado && filters.estado !== 'todos') query = query.eq('estado', filters.estado);
  if (filters.gerencia) query = query.eq('gerencia', filters.gerencia);
  if (filters.tipo) query = query.eq('tipo_incidente', filters.tipo);
  if (filters.clasificacion) query = query.eq('clasificacion', filters.clasificacion);
  if (filters.fechaDesde) query = query.gte('fecha', filters.fechaDesde);
  if (filters.fechaHasta) query = query.lte('fecha', filters.fechaHasta);
  const { data, error } = await query;
  if (error) console.error('[incidentesService] fetchIncidentes:', error.message);
  return { data: data ?? [], error };
}

export async function insertIncidente(payload) {
  const { data, error } = await supabase
    .from('inc_incidentes')
    .insert(payload)
    .select('id')
    .single();
  if (error) console.error('[incidentesService] insertIncidente:', error.message);
  return { data, error };
}

export async function updateIncidente(id, payload) {
  const { error } = await supabase
    .from('inc_incidentes')
    .update(payload)
    .eq('id', id);
  if (error) console.error('[incidentesService] updateIncidente:', error.message);
  return { error };
}

// ── Acciones ──────────────────────────────────────────────────────────────────

export async function fetchAcciones(incidenteId) {
  const { data, error } = await supabase
    .from('inc_acciones')
    .select('*, responsable:profiles!responsable_id(full_name)')
    .eq('incidente_id', incidenteId)
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false });
  if (error) console.error('[incidentesService] fetchAcciones:', error.message);
  return { data: data ?? [], error };
}

export async function countAccionesByIncidente(incidenteId) {
  const { count, error } = await supabase
    .from('inc_acciones')
    .select('id', { count: 'exact', head: true })
    .eq('incidente_id', incidenteId);
  if (error) console.error('[incidentesService] countAccionesByIncidente:', error.message);
  return { count: count ?? 0, error };
}

export async function insertAccion(payload) {
  const { data, error } = await supabase
    .from('inc_acciones')
    .insert(payload)
    .select('id')
    .single();
  if (error) console.error('[incidentesService] insertAccion:', error.message);
  return { data, error };
}

export async function updateAccion(id, payload) {
  const { error } = await supabase
    .from('inc_acciones')
    .update(payload)
    .eq('id', id);
  if (error) console.error('[incidentesService] updateAccion:', error.message);
  return { error };
}

export async function deleteAccion(id) {
  const { error } = await supabase
    .from('inc_acciones')
    .delete()
    .eq('id', id);
  if (error) console.error('[incidentesService] deleteAccion:', error.message);
  return { error };
}

export async function fetchAccionesRectificativas(parentAccionId) {
  const { data, error } = await supabase
    .from('inc_acciones')
    .select('id, verif_eficaz')
    .eq('parent_accion_id', parentAccionId);
  if (error) console.error('[incidentesService] fetchAccionesRectificativas:', error.message);
  return { data: data ?? [], error };
}

// ── Acciones — Verificación de eficacia ───────────────────────────────────────

export async function updateVerifAccion(id, payload) {
  const { error } = await supabase
    .from('inc_acciones')
    .update(payload)
    .eq('id', id);
  if (error) console.error('[incidentesService] updateVerifAccion:', error.message);
  return { error };
}

// ── Hitos ─────────────────────────────────────────────────────────────────────

export async function fetchHitos(accionId) {
  const { data, error } = await supabase
    .from('inc_acciones_hitos')
    .select('*')
    .eq('accion_id', accionId)
    .order('fecha', { ascending: true });
  if (error) console.error('[incidentesService] fetchHitos:', error.message);
  return { data: data ?? [], error };
}

export async function fetchHitosResumen(accionId) {
  const { data, error } = await supabase
    .from('inc_acciones_hitos')
    .select('fecha, porcentaje, descripcion')
    .eq('accion_id', accionId)
    .order('fecha', { ascending: true });
  if (error) console.error('[incidentesService] fetchHitosResumen:', error.message);
  return { data: data ?? [], error };
}

export async function insertHito(payload) {
  const { error } = await supabase
    .from('inc_acciones_hitos')
    .insert(payload);
  if (error) console.error('[incidentesService] insertHito:', error.message);
  return { error };
}

export async function deleteHito(id) {
  const { error } = await supabase
    .from('inc_acciones_hitos')
    .delete()
    .eq('id', id);
  if (error) console.error('[incidentesService] deleteHito:', error.message);
  return { error };
}

// ── 5P ───────────────────────────────────────────────────────────────────────

export async function fetch5P(incidenteId) {
  const { data, error } = await supabase
    .from('inc_5p')
    .select('*')
    .eq('incidente_id', incidenteId)
    .order('created_at', { ascending: true });
  if (error) console.error('[incidentesService] fetch5P:', error.message);
  return { data: data ?? [], error };
}

export async function insert5P(payload) {
  const { error } = await supabase
    .from('inc_5p')
    .insert(payload);
  if (error) console.error('[incidentesService] insert5P:', error.message);
  return { error };
}

export async function delete5P(id) {
  const { error } = await supabase
    .from('inc_5p')
    .delete()
    .eq('id', id);
  if (error) console.error('[incidentesService] delete5P:', error.message);
  return { error };
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export async function fetchTimeline(incidenteId) {
  const { data, error } = await supabase
    .from('inc_timeline')
    .select('*')
    .eq('incidente_id', incidenteId)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: true });
  if (error) console.error('[incidentesService] fetchTimeline:', error.message);
  return { data: data ?? [], error };
}

export async function insertTimeline(payload) {
  const { error } = await supabase
    .from('inc_timeline')
    .insert(payload);
  if (error) console.error('[incidentesService] insertTimeline:', error.message);
  return { error };
}

export async function updateTimeline(id, payload) {
  const { error } = await supabase
    .from('inc_timeline')
    .update(payload)
    .eq('id', id);
  if (error) console.error('[incidentesService] updateTimeline:', error.message);
  return { error };
}

export async function deleteTimeline(id) {
  const { error } = await supabase
    .from('inc_timeline')
    .delete()
    .eq('id', id);
  if (error) console.error('[incidentesService] deleteTimeline:', error.message);
  return { error };
}

// ── Storage ───────────────────────────────────────────────────────────────────

export async function uploadIncAdjunto(path, file) {
  const { error } = await supabase.storage
    .from('inc-adjuntos')
    .upload(path, file);
  if (error) console.error('[incidentesService] uploadIncAdjunto:', error.message);
  return { error };
}

export async function getSignedUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('inc-adjuntos')
    .createSignedUrl(path, expiresIn);
  if (error) console.error('[incidentesService] getSignedUrl:', error.message);
  return { data, error };
}

export async function getSignedUrls(paths, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('inc-adjuntos')
    .createSignedUrls(paths, expiresIn);
  if (error) console.error('[incidentesService] getSignedUrls:', error.message);
  return { data: data ?? [], error };
}
