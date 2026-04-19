import { supabase } from '../lib/supabase';

export async function fetchCursos() {
  const { data, error } = await supabase
    .from('cursos')
    .select('*, categoria:cursos_categorias(nombre, color)')
    .order('created_at', { ascending: false });
  if (error) console.error('[cursosService] fetchCursos:', error.message);
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
