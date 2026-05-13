import { supabase } from '../lib/supabase';

const BUCKET = 'multimedia';

// ── Fotos ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

export async function fetchFotos({ etiquetaId, page = 0 } = {}) {
  let query = supabase
    .from('multimedia_fotos')
    .select(`
      id, titulo, descripcion, imagen_url, created_at,
      uploaded_by,
      uploader:profiles!uploaded_by(full_name, avatar_url),
      etiquetas:multimedia_foto_etiquetas(etiqueta:multimedia_etiquetas(id, nombre)),
      likes:multimedia_likes(id, user_id),
      comentarios:multimedia_comentarios(id)
    `)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (etiquetaId) {
    const { data: fotoIds, error } = await supabase
      .from('multimedia_foto_etiquetas')
      .select('foto_id')
      .eq('etiqueta_id', etiquetaId);
    if (error) return { data: [], error, hasMore: false };
    const ids = fotoIds.map(r => r.foto_id);
    if (ids.length === 0) return { data: [], error: null, hasMore: false };
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  return { data: data ?? [], error, hasMore: (data?.length ?? 0) === PAGE_SIZE };
}

export async function getFotoSignedUrl(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60); // 1 hora
  return { url: data?.signedUrl ?? null, error };
}

export async function uploadFoto({ titulo, descripcion, archivo, etiquetaIds, uploadedBy }) {
  const ext = archivo.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, archivo, { cacheControl: '3600', upsert: false });

  if (uploadError) return { data: null, error: uploadError };

  const { data: foto, error: insertError } = await supabase
    .from('multimedia_fotos')
    .insert({ titulo, descripcion: descripcion || null, imagen_url: fileName, uploaded_by: uploadedBy })
    .select()
    .single();

  if (insertError) return { data: null, error: insertError };

  if (etiquetaIds?.length) {
    const rows = etiquetaIds.map(etiqueta_id => ({ foto_id: foto.id, etiqueta_id }));
    await supabase.from('multimedia_foto_etiquetas').insert(rows);
  }

  return { data: foto, error: null };
}

export async function deleteFoto(id, imagenUrl) {
  await supabase.storage.from(BUCKET).remove([imagenUrl]);
  const { error } = await supabase.from('multimedia_fotos').delete().eq('id', id);
  return { error };
}

// ── Etiquetas ──────────────────────────────────────────────────────────────

export async function fetchEtiquetas() {
  const { data, error } = await supabase
    .from('multimedia_etiquetas')
    .select('id, nombre')
    .order('nombre');
  return { data: data ?? [], error };
}

export async function saveEtiqueta(nombre) {
  const { data, error } = await supabase
    .from('multimedia_etiquetas')
    .insert({ nombre: nombre.trim() })
    .select()
    .single();
  return { data, error };
}

export async function deleteEtiqueta(id) {
  const { error } = await supabase.from('multimedia_etiquetas').delete().eq('id', id);
  return { error };
}

// ── Likes ──────────────────────────────────────────────────────────────────

export async function toggleLike(fotoId, userId) {
  const { data: existing } = await supabase
    .from('multimedia_likes')
    .select('id')
    .eq('foto_id', fotoId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('multimedia_likes').delete().eq('id', existing.id);
    return { liked: false, error };
  } else {
    const { error } = await supabase.from('multimedia_likes').insert({ foto_id: fotoId, user_id: userId });
    return { liked: true, error };
  }
}

// ── Comentarios ────────────────────────────────────────────────────────────

export async function fetchComentarios(fotoId) {
  const { data, error } = await supabase
    .from('multimedia_comentarios')
    .select('id, contenido, created_at, user_id, autor:profiles!user_id(full_name, avatar_url)')
    .eq('foto_id', fotoId)
    .order('created_at', { ascending: true });
  return { data: data ?? [], error };
}

export async function addComentario(fotoId, userId, contenido) {
  const { data, error } = await supabase
    .from('multimedia_comentarios')
    .insert({ foto_id: fotoId, user_id: userId, contenido })
    .select('id, contenido, created_at, user_id, autor:profiles!user_id(full_name, avatar_url)')
    .single();
  return { data, error };
}

export async function deleteComentario(id) {
  const { error } = await supabase.from('multimedia_comentarios').delete().eq('id', id);
  return { error };
}
