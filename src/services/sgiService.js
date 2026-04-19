import { supabase } from '../lib/supabase';

export async function fetchSGI() {
  const [catsRes, docsRes, versRes] = await Promise.all([
    supabase.from('sgi_categorias').select('*').order('orden'),
    supabase.from('sgi_documentos').select('*').eq('activo', true).order('codigo'),
    supabase.from('sgi_versiones').select('*').order('numero_version', { ascending: true }),
  ]);
  if (catsRes.error) console.error('[sgiService] fetchSGI - categorias:', catsRes.error.message);
  if (docsRes.error) console.error('[sgiService] fetchSGI - documentos:', docsRes.error.message);
  if (versRes.error) console.error('[sgiService] fetchSGI - versiones:', versRes.error.message);
  return {
    categorias: catsRes.data ?? [],
    documentos: docsRes.data ?? [],
    versiones: versRes.data ?? [],
    error: catsRes.error || docsRes.error || versRes.error || null,
  };
}

export async function fetchVersionVigente(documentoId) {
  const { data, error } = await supabase
    .from('sgi_versiones')
    .select('*')
    .eq('documento_id', documentoId)
    .eq('vigente', true)
    .maybeSingle();
  if (error) console.error('[sgiService] fetchVersionVigente:', error.message);
  return { data, error };
}

// ── Categorías ────────────────────────────────────────────────────────────────

export async function saveSgiCategoria(payload) {
  const { id, ...fields } = payload;
  const normalized = {
    nombre: fields.nombre,
    icono: fields.icono || 'Folder',
    color: fields.color || '#6366f1',
    descripcion: fields.descripcion || null,
    orden: parseInt(fields.orden) || 0,
    activo: fields.activo ?? true,
    parent_id: fields.parent_id || null,
  };
  const query = id
    ? supabase.from('sgi_categorias').update(normalized).eq('id', id).select()
    : supabase.from('sgi_categorias').insert(normalized).select();
  const { data, error } = await query;
  if (error) console.error('[sgiService] saveSgiCategoria:', error.message);
  return { data, error };
}

export async function deleteSgiCategoria(id) {
  const { error } = await supabase.from('sgi_categorias').delete().eq('id', id);
  if (error) console.error('[sgiService] deleteSgiCategoria:', error.message);
  return { error };
}

// ── Documentos ────────────────────────────────────────────────────────────────

/**
 * Guarda un documento y crea/actualiza su versión vigente en una sola operación.
 * @param {object} docPayload - datos del documento (puede incluir `id`)
 * @param {{ _ver_id, numero_version, fecha_emision, notas_cambios }} versionData
 */
export async function saveSgiDocumento(docPayload, versionData) {
  const { id: docId, ...docFields } = docPayload;
  let savedDocId = docId;

  if (docId) {
    const { error } = await supabase.from('sgi_documentos').update(docFields).eq('id', docId);
    if (error) {
      console.error('[sgiService] saveSgiDocumento (update):', error.message);
      return { error };
    }
  } else {
    const { data, error } = await supabase.from('sgi_documentos').insert(docFields).select();
    if (error) {
      console.error('[sgiService] saveSgiDocumento (insert):', error.message);
      return { error };
    }
    savedDocId = data?.[0]?.id;
  }

  if (savedDocId && versionData?.numero_version) {
    const isControlado = docFields.documento_controlado ?? false;
    if (versionData._ver_id) {
      await supabase.from('sgi_versiones').update({
        numero_version: versionData.numero_version,
        fecha_emision: versionData.fecha_emision || null,
        notas_cambios: versionData.notas_cambios || null,
        ...(versionData.archivo_url && { archivo_url: versionData.archivo_url }),
      }).eq('id', versionData._ver_id);
    } else {
      if (!isControlado) {
        await supabase.from('sgi_versiones').update({ vigente: false }).eq('documento_id', savedDocId);
      }
      await supabase.from('sgi_versiones').insert({
        documento_id: savedDocId,
        numero_version: versionData.numero_version,
        fecha_emision: versionData.fecha_emision || null,
        notas_cambios: versionData.notas_cambios || null,
        vigente: !isControlado,
        estado_aprobacion: isControlado ? 'en_revision' : 'aprobado',
        ...(versionData.archivo_url && { archivo_url: versionData.archivo_url }),
      });
    }
  }

  return { error: null };
}

export async function softDeleteSgiDocumento(id) {
  const { error } = await supabase.from('sgi_documentos').update({ activo: false }).eq('id', id);
  if (error) console.error('[sgiService] softDeleteSgiDocumento:', error.message);
  return { error };
}

// ── Versiones ─────────────────────────────────────────────────────────────────

/**
 * Sube un archivo al bucket 'sgi-documentos' y retorna la ruta.
 */
export async function uploadSgiArchivo(documentoId, version, file) {
  const ext = file.name.split('.').pop();
  const fileName = `${documentoId}/rev${version}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('sgi-documentos')
    .upload(fileName, file, { upsert: true });
  if (error) console.error('[sgiService] uploadSgiArchivo:', error.message);
  return { path: error ? null : fileName, error };
}

export async function saveSgiVersion(payload) {
  const { id, ...fields } = payload;
  if (fields.vigente) {
    await supabase
      .from('sgi_versiones')
      .update({ vigente: false })
      .eq('documento_id', fields.documento_id)
      .neq('id', id ?? '');
  }
  const query = id
    ? supabase.from('sgi_versiones').update(fields).eq('id', id).select()
    : supabase.from('sgi_versiones').insert(fields).select();
  const { data, error } = await query;
  if (error) console.error('[sgiService] saveSgiVersion:', error.message);
  return { data, error };
}

export async function deleteSgiVersion(id) {
  const { error } = await supabase.from('sgi_versiones').delete().eq('id', id);
  if (error) console.error('[sgiService] deleteSgiVersion:', error.message);
  return { error };
}

// ── Consultas de lectura para SGI.jsx ─────────────────────────────────────────

export async function fetchSgiCategoriasActivas() {
  const { data, error } = await supabase
    .from('sgi_categorias')
    .select('*')
    .eq('activo', true)
    .order('orden');
  if (error) console.error('[sgiService] fetchSgiCategoriasActivas:', error.message);
  return { data: data ?? [], error };
}

export async function fetchSgiDocsCounts() {
  const { data, error } = await supabase
    .from('sgi_documentos')
    .select('id, categoria_id')
    .eq('activo', true);
  if (error) console.error('[sgiService] fetchSgiDocsCounts:', error.message);
  return { data: data ?? [], error };
}

export async function fetchSgiDocumentosByCategoria(categoriaId) {
  const { data, error } = await supabase
    .from('sgi_documentos')
    .select('*, categoria:sgi_categorias(nombre, color, icono), versiones:sgi_versiones(*)')
    .eq('categoria_id', categoriaId)
    .eq('activo', true)
    .order('codigo', { ascending: true });
  if (error) console.error('[sgiService] fetchSgiDocumentosByCategoria:', error.message);
  return { data: data ?? [], error };
}

// ── Consultas de lectura para SGIDocument.jsx ─────────────────────────────────

export async function fetchSgiDocumentoById(docId) {
  const { data, error } = await supabase
    .from('sgi_documentos')
    .select('*, categoria:sgi_categorias(nombre, color, icono)')
    .eq('id', docId)
    .single();
  if (error) {
    console.error('[sgiService] fetchSgiDocumentoById:', error.message);
    return { data, error };
  }
  if (data?.created_by) {
    const { data: creador } = await supabase
      .from('profiles')
      .select('full_name, department, job_title')
      .eq('id', data.created_by)
      .maybeSingle();
    data.creador = creador ?? null;
  }
  return { data, error };
}

export async function fetchSgiVersionesByDocumento(documentoId) {
  const { data, error } = await supabase
    .from('sgi_versiones')
    .select('*')
    .eq('documento_id', documentoId)
    .order('numero_version', { ascending: true });
  if (error) console.error('[sgiService] fetchSgiVersionesByDocumento:', error.message);
  return { data: data ?? [], error };
}

export async function fetchSgiVersionesPendientes() {
  const { data, error } = await supabase
    .from('sgi_versiones')
    .select('id, estado_aprobacion, numero_version, documento:sgi_documentos!documento_id(id, titulo, codigo, activo, created_by, categoria:sgi_categorias(nombre, color, icono))')
    .in('estado_aprobacion', ['en_revision', 'pendiente_aprobacion']);
  if (error) console.error('[sgiService] fetchSgiVersionesPendientes:', error.message);
  const active = (data ?? []).filter(v => v.documento?.activo !== false);
  if (active.length === 0) return { data: active, error };
  const createdByIds = [...new Set(active.map(v => v.documento?.created_by).filter(Boolean))];
  const { data: perfiles } = await supabase
    .from('profiles')
    .select('id, department')
    .in('id', createdByIds);
  const perfilesMap = Object.fromEntries((perfiles ?? []).map(p => [p.id, p]));
  const enriched = active.map(v => ({
    ...v,
    documento: v.documento
      ? { ...v.documento, creador: perfilesMap[v.documento.created_by] ?? null }
      : v.documento,
  }));
  return { data: enriched, error };
}

// ── Circuito de Aprobación ─────────────────────────────────────────────────────

export async function reviewSgiVersion(versionId, reviewerProfile, comentario = null) {
  const { data, error } = await supabase
    .from('sgi_versiones')
    .update({
      estado_aprobacion: 'pendiente_aprobacion',
      revisor_id: reviewerProfile.id,
      revisor: reviewerProfile.full_name,
      fecha_revision: new Date().toISOString(),
      comentario_revision: comentario || null,
    })
    .eq('id', versionId)
    .select();
  if (error) console.error('[sgiService] reviewSgiVersion:', error.message);
  return { data, error };
}

export async function approveSgiVersion(versionId, documentoId, approverProfile, comentario = null) {
  await supabase.from('sgi_versiones').update({ vigente: false }).eq('documento_id', documentoId);
  const { data, error } = await supabase
    .from('sgi_versiones')
    .update({
      estado_aprobacion: 'aprobado',
      aprobador_id: approverProfile.id,
      aprobador: approverProfile.full_name,
      fecha_aprobacion: new Date().toISOString(),
      comentario_aprobacion: comentario || null,
      vigente: true,
    })
    .eq('id', versionId)
    .select();
  if (error) console.error('[sgiService] approveSgiVersion:', error.message);
  return { data, error };
}

export async function rejectSgiVersion(versionId, comentario = null) {
  const { data, error } = await supabase
    .from('sgi_versiones')
    .update({
      estado_aprobacion: 'rechazado',
      comentario_revision: comentario || null,
    })
    .eq('id', versionId)
    .select();
  if (error) console.error('[sgiService] rejectSgiVersion:', error.message);
  return { data, error };
}

export async function getSgiSignedUrl(path, seconds = 60) {
  const { data, error } = await supabase.storage
    .from('sgi-documentos')
    .createSignedUrl(path, seconds);
  if (error) console.error('[sgiService] getSgiSignedUrl:', error.message);
  return { data, error };
}

// ── Consultas para SGIEstadisticas.jsx ────────────────────────────────────────

export async function fetchSgiEstadisticasData() {
  const [
    { data: documentos, error: e1 },
    { data: hallazgos, error: e2 },
    { data: acciones, error: e3 },
    { data: categorias, error: e4 },
  ] = await Promise.all([
    supabase.from('sgi_documentos').select('id, tipo_documento, categoria_id, created_at, activo').eq('activo', true),
    supabase.from('nc_hallazgos').select('id, tipo, estado, gerencia, paso_actual, fecha, created_at'),
    supabase.from('nc_acciones').select('id, estado, hallazgo_id, fecha_vencimiento, avance'),
    supabase.from('sgi_categorias').select('id, nombre, color').eq('activo', true).is('parent_id', null),
  ]);
  const error = e1 || e2 || e3 || e4;
  if (error) console.error('[sgiService] fetchSgiEstadisticasData:', error.message);
  return { documentos: documentos ?? [], hallazgos: hallazgos ?? [], acciones: acciones ?? [], categorias: categorias ?? [], error };
}

// ── Consultas para NoConformidades.jsx ───────────────────────────────────────

export async function fetchNcHallazgosAbiertos() {
  const { data, error } = await supabase
    .from('nc_hallazgos')
    .select('id, paso_actual, estado')
    .eq('estado', 'abierto');
  if (error) console.error('[sgiService] fetchNcHallazgosAbiertos:', error.message);
  return { data: data ?? [], error };
}

export async function fetchNcGerencias() {
  const { data, error } = await supabase
    .from('nc_hallazgos')
    .select('gerencia')
    .not('gerencia', 'is', null);
  if (error) console.error('[sgiService] fetchNcGerencias:', error.message);
  const unique = [...new Set((data ?? []).map(r => r.gerencia).filter(Boolean))].sort();
  return { data: unique, error };
}

export async function fetchNcHallazgos({ tipo, estado, fechaDesde, fechaHasta, paso, gerencia } = {}) {
  let query = supabase
    .from('nc_hallazgos')
    .select('id, tipo, numero, fecha, descripcion, paso_actual, estado, emisor:profiles!emisor_id(full_name), gerencia')
    .order('created_at', { ascending: false });

  if (tipo) query = query.eq('tipo', tipo);
  if (estado && estado !== 'todos') query = query.eq('estado', estado);
  if (fechaDesde) query = query.gte('fecha', fechaDesde);
  if (fechaHasta) query = query.lte('fecha', fechaHasta);
  if (paso !== null && paso !== undefined) query = query.eq('paso_actual', paso);
  if (gerencia) query = query.eq('gerencia', gerencia);

  const { data, error } = await query;
  if (error) console.error('[sgiService] fetchNcHallazgos:', error.message);
  return { data: data ?? [], error };
}

// ── Consultas para NCInformePDF.jsx ───────────────────────────────────────────

export async function fetchNcInformeData(hallazgoId) {
  const { data: hallazgo, error: errH } = await supabase
    .from('nc_hallazgos')
    .select('*')
    .eq('id', hallazgoId)
    .single();
  if (errH) {
    console.error('[sgiService] fetchNcInformeData - hallazgo:', errH.message);
    return { data: null, error: errH };
  }

  const [
    { data: profiles },
    { data: clientes },
    { data: accionesRaw, error: errA },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name'),
    supabase.from('centros_de_costos').select('id, nombre'),
    supabase
      .from('nc_acciones')
      .select('id, codigo, descripcion, responsable_id, fecha_vencimiento, avance, estado, verif_eficaz, verif_fecha, verif_detalle, responsable:profiles!responsable_id(full_name)')
      .eq('hallazgo_id', hallazgoId)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
  ]);

  if (errA) console.error('[sgiService] fetchNcInformeData - acciones:', errA.message);

  const acciones = await Promise.all((accionesRaw || []).map(async a => {
    const { data: hitos } = await supabase
      .from('nc_accion_hitos')
      .select('fecha, porcentaje, descripcion')
      .eq('accion_id', a.id)
      .order('fecha', { ascending: true });
    return { ...a, hitos: hitos || [] };
  }));

  return {
    data: { hallazgo, profiles: profiles || [], clientes: clientes || [], acciones },
    error: null,
  };
}
