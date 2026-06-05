import { supabase } from '../lib/supabase';

export async function uploadArchivoBloque(file) {
  const safeName = file.name.replace(/\s+/g, '_');
  const path = `capacitaciones/archivos/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('novedades').upload(path, file, { upsert: true });
  if (error) return { url: null, error };
  const { data } = supabase.storage.from('novedades').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function uploadBannerImage(file) {
  const ext = file.name.split('.').pop();
  const path = `capacitaciones/banners/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('novedades').upload(path, file, { upsert: true });
  if (error) return { url: null, error };
  const { data } = supabase.storage.from('novedades').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function fetchCursos() {
  const { data, error } = await supabase
    .from('cursos')
    .select('*, categoria:cursos_categorias(nombre, color)')
    .order('created_at', { ascending: false });
  if (error) console.error('[cursosService] fetchCursos:', error.message);
  return { data: data ?? [], error };
}

/**
 * Devuelve únicamente los cursos que el usuario autenticado tiene permitido ver.
 * El filtro de visibilidad corre server-side via RPC — nunca viajan cursos
 * ocultos por la red. Reemplaza el patrón fetchCursos + courseIsVisible en el cliente.
 */
export async function fetchCursosVisibles() {
  const { data, error } = await supabase.rpc('get_cursos_visibles');
  if (error) console.error('[cursosService] fetchCursosVisibles:', error.message);
  return { data: data ?? [], error };
}

export async function fetchCursosCategorias() {
  const { data, error } = await supabase.from('cursos_categorias').select('*');
  if (error) console.error('[cursosService] fetchCursosCategorias:', error.message);
  return { data: data ?? [], error };
}

export async function fetchCursoDetalle(cursoId) {
  const [modRes, visRes, destRes] = await Promise.all([
    supabase
      .from('cursos_modulos')
      .select('*')
      .eq('curso_id', cursoId)
      .order('numero_orden', { ascending: true }),
    supabase.from('cursos_visibilidad').select('*').eq('curso_id', cursoId),
    supabase
      .from('cursos_destinatarios')
      .select('user_id, profile:profiles(full_name, email)')
      .eq('curso_id', cursoId),
  ]);
  if (modRes.error) console.error('[cursosService] fetchCursoDetalle - modulos:', modRes.error.message);
  if (visRes.error) console.error('[cursosService] fetchCursoDetalle - visibilidad:', visRes.error.message);
  if (destRes.error) console.error('[cursosService] fetchCursoDetalle - destinatarios:', destRes.error.message);
  return {
    modulos: modRes.data ?? [],
    visibilidad: visRes.data ?? [],
    destinatarios: (destRes.data ?? []).map(d => ({
      user_id: d.user_id,
      full_name: d.profile?.full_name || '',
      email: d.profile?.email || '',
    })),
  };
}

/**
 * Guarda un curso con sus módulos, reglas de visibilidad y destinatarios.
 * Toda la lógica de upsert/delete-insert se centraliza aquí.
 *
 * @param {object} cursoData - datos del curso (puede incluir `id` para update)
 * @param {Array} modulos - lista completa de módulos
 * @param {Array<{campo, valor}>} visibilidadRules
 * @param {Array<{user_id}>} destinatarios
 */
export async function saveCurso(cursoData, modulos, visibilidadRules, destinatarios) {
  const { data: courseData, error: courseError } = await supabase
    .from('cursos')
    .upsert([cursoData])
    .select();
  if (courseError) {
    console.error('[cursosService] saveCurso:', courseError.message);
    return { error: courseError };
  }

  const savedId = courseData[0].id;

  const existingModules = modulos.filter(m => m.id && !m.id.toString().startsWith('temp-'));
  const newModules = modulos.filter(m => !m.id || m.id.toString().startsWith('temp-'));

  if (existingModules.length > 0) {
    await Promise.all(
      existingModules.map(m =>
        supabase.from('cursos_modulos').update({
          numero_orden: modulos.indexOf(m) + 1,
          titulo: m.titulo,
          contenido: typeof m.contenido === 'string' ? m.contenido : JSON.stringify(m.contenido),
        }).eq('id', m.id)
      )
    );
  }

  if (newModules.length > 0) {
    await supabase.from('cursos_modulos').insert(
      newModules.map(m => ({
        curso_id: savedId,
        numero_orden: modulos.indexOf(m) + 1,
        titulo: m.titulo,
        contenido: typeof m.contenido === 'string' ? m.contenido : JSON.stringify(m.contenido),
      }))
    );
  }

  await supabase.from('cursos_visibilidad').delete().eq('curso_id', savedId);
  if (visibilidadRules.length > 0) {
    await supabase.from('cursos_visibilidad').insert(
      visibilidadRules.map(r => ({ curso_id: savedId, campo: r.campo, valor: r.valor }))
    );
  }

  await supabase.from('cursos_destinatarios').delete().eq('curso_id', savedId);
  if (destinatarios.length > 0) {
    await supabase.from('cursos_destinatarios').insert(
      destinatarios.map(d => ({ curso_id: savedId, user_id: d.user_id }))
    );
  }

  return { data: courseData[0], error: null };
}

export async function deleteCurso(id) {
  const { error } = await supabase.from('cursos').delete().eq('id', id);
  if (error) console.error('[cursosService] deleteCurso:', error.message);
  return { error };
}

// ── Módulos ───────────────────────────────────────────────────────────────────

export async function fetchModulosByCurso(cursoId) {
  const { data, error } = await supabase
    .from('cursos_modulos')
    .select('*')
    .eq('curso_id', cursoId)
    .order('numero_orden', { ascending: true });
  if (error) console.error('[cursosService] fetchModulosByCurso:', error.message);
  return { data: data ?? [], error };
}

// ── Progreso ──────────────────────────────────────────────────────────────────

export async function fetchProgresoByCurso(cursoId, userEmail) {
  const { data, error } = await supabase
    .from('cursos_progreso')
    .select('modulo_id')
    .eq('curso_id', cursoId)
    .eq('user_email', userEmail)
    .eq('completado', true);
  if (error) console.error('[cursosService] fetchProgresoByCurso:', error.message);
  return { data: data ?? [], error };
}

export async function fetchProgresoByUser(userEmail) {
  const { data, error } = await supabase
    .from('cursos_progreso')
    .select('curso_id')
    .eq('user_email', userEmail)
    .eq('completado', true);
  if (error) console.error('[cursosService] fetchProgresoByUser:', error.message);
  return { data: data ?? [], error };
}

export async function upsertProgreso(cursoId, moduloId, userEmail) {
  const { error } = await supabase
    .from('cursos_progreso')
    .upsert([{
      curso_id: cursoId,
      modulo_id: moduloId,
      user_email: userEmail,
      completado: true,
      updated_at: new Date(),
    }], { onConflict: 'modulo_id, user_email' });
  if (error) console.error('[cursosService] upsertProgreso:', error.message);
  return { error };
}

// ── Resultados / Quiz ─────────────────────────────────────────────────────────

export async function fetchUltimoResultado(cursoId, userEmail) {
  const { data, error } = await supabase
    .from('cursos_resultados')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) console.error('[cursosService] fetchUltimoResultado:', error.message);
  return { data: data?.[0] ?? null, error };
}

export async function fetchResultadosByUser(userEmail, limit = 5) {
  const { data, error } = await supabase
    .from('cursos_resultados')
    .select('*, curso:cursos(titulo, categoria:cursos_categorias(color))')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('[cursosService] fetchResultadosByUser:', error.message);
  return { data: data ?? [], error };
}

export async function fetchCursosAprobadosByUser(userEmail) {
  const { data, error } = await supabase
    .from('cursos_resultados')
    .select('id, curso_id')
    .eq('user_email', userEmail)
    .eq('aprobado', true);
  if (error) console.error('[cursosService] fetchCursosAprobadosByUser:', error.message);
  return { data: data ?? [], error };
}

export async function insertResultado(payload) {
  const { error } = await supabase.from('cursos_resultados').insert([payload]);
  if (error) console.error('[cursosService] insertResultado:', error.message);
  return { error };
}

// ── Stats globales ────────────────────────────────────────────────────────────

export async function fetchGlobalStats() {
  const [usuariosRes, cursosRes, certsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('cursos').select('id', { count: 'exact', head: true }),
    supabase.from('cursos_resultados').select('id', { count: 'exact', head: true }).eq('aprobado', true),
  ]);
  return {
    data: {
      usuarios: usuariosRes.count ?? 0,
      cursos: cursosRes.count ?? 0,
      certificados: certsRes.count ?? 0,
    },
    error: usuariosRes.error || cursosRes.error || certsRes.error || null,
  };
}

// ── Accesos rápidos ───────────────────────────────────────────────────────────

export async function fetchAccesosRapidos() {
  const { data, error } = await supabase
    .from('accesos_rapidos')
    .select('*')
    .eq('activo', true)
    .order('numero_orden', { ascending: true });
  if (error) console.error('[cursosService] fetchAccesosRapidos:', error.message);
  return { data: data ?? [], error };
}
