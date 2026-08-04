import { supabase } from '../lib/supabase';

const NOVEDADES_BUCKET = 'novedades';
const MULTIMEDIA_BUCKET = 'multimedia';
const PAGE_SIZE = 12;

function getNovedadPublicUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from(NOVEDADES_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

async function getFotoSignedUrl(path) {
  if (!path) return null;
  const { data } = await supabase.storage.from(MULTIMEDIA_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

function normalizeNovedad(n, interactions = {}) {
  return {
    id: n.id,
    _type: 'anuncio',
    _sortDate: n.created_at ?? n.id,
    titulo: n.titulo ?? 'Anuncio',
    imagen_url: getNovedadPublicUrl(n.imagen_url),
    link_url: n.link_url ?? null,
    created_at: n.created_at,
    likes: interactions.likes ?? [],
    comentarios: interactions.comentarios ?? [],
  };
}

async function normalizeFoto(f) {
  const signedUrl = await getFotoSignedUrl(f.imagen_url);
  return {
    ...f,
    _type: 'foto',
    _sortDate: f.created_at,
    // imagen_url keeps the raw storage path so FotoDetalle can regenerate its own signed URL
    imagen_signed_url: signedUrl,
  };
}

// ── Feed paginado para la página Social ───────────────────────────────────────
// Novedades se cargan completas (suelen ser pocas); fotos se paginan.
// página 0 → mezcla novedades + fotos. páginas siguientes → solo más fotos.

export async function fetchSocialFeed({ page = 0, tipo = null } = {}) {
  const fetchNovedades = tipo === 'foto'
    ? Promise.resolve({ data: [] })
    : supabase
        .from('novedades')
        .select('id, titulo, link_url, imagen_url, created_at')
        .eq('activo', true)
        .or('fecha_hasta.is.null,fecha_hasta.gte.' + new Date().toISOString().split('T')[0])
        .order('orden', { ascending: true });

  const fetchFotos = tipo === 'anuncio'
    ? Promise.resolve({ data: [] })
    : supabase
        .from('multimedia_fotos')
        .select(`
          id, titulo, descripcion, imagen_url, created_at,
          uploader:profiles!uploaded_by(full_name),
          likes:multimedia_likes(id, user_id),
          comentarios:multimedia_comentarios(id)
        `)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  const [novedadesRes, fotosRes] = await Promise.all([fetchNovedades, fetchFotos]);

  // Fetch interaction counts separately — silently skipped if tables don't exist yet
  let novedadInteractions = {};
  if (page === 0 && novedadesRes.data?.length) {
    const ids = novedadesRes.data.map(n => n.id);
    const [likesRes, comentRes] = await Promise.all([
      supabase.from('novedad_likes').select('id, novedad_id, user_id').in('novedad_id', ids),
      supabase.from('novedad_comentarios').select('id, novedad_id').in('novedad_id', ids),
    ]);
    if (!likesRes.error && !comentRes.error) {
      ids.forEach(id => {
        novedadInteractions[id] = {
          likes: (likesRes.data ?? []).filter(l => l.novedad_id === id),
          comentarios: (comentRes.data ?? []).filter(c => c.novedad_id === id),
        };
      });
    }
  }

  const novedades = page === 0
    ? (novedadesRes.data ?? []).map(n => normalizeNovedad(n, novedadInteractions[n.id]))
    : [];

  const fotos = await Promise.all((fotosRes.data ?? []).map(normalizeFoto));

  const all = [...novedades, ...fotos].sort(
    (a, b) => new Date(b._sortDate) - new Date(a._sortDate)
  );

  const hasMore = (fotosRes.data?.length ?? 0) === PAGE_SIZE;

  return { data: all, hasMore, error: fotosRes.error ?? novedadesRes.error };
}

// ── Preview para el Dashboard (últimas N publicaciones) ──────────────────────

export async function fetchSocialPreview({ limit = 4 } = {}) {
  const [novedadesRes, fotosRes] = await Promise.all([
    supabase
      .from('novedades')
      .select('id, titulo, link_url, imagen_url, created_at')
      .eq('activo', true)
      .or('fecha_hasta.is.null,fecha_hasta.gte.' + new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('multimedia_fotos')
      .select('id, titulo, imagen_url, created_at, likes:multimedia_likes(id), comentarios:multimedia_comentarios(id)')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const novedades = (novedadesRes.data ?? []).map(normalizeNovedad);
  const fotos = await Promise.all((fotosRes.data ?? []).map(normalizeFoto));

  return {
    data: [...novedades, ...fotos]
      .sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate))
      .slice(0, limit),
    error: novedadesRes.error ?? fotosRes.error,
  };
}
