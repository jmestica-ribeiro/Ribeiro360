import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, ChevronDown, FileText, FolderPlus, FilePlus, Download, Folder, Pencil, Search, GripVertical, Move, X, CornerDownRight, ArrowUpDown, FolderInput } from 'lucide-react';
import { formatFecha, hoyISO } from '../../../lib/fechas';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import {
  fetchSGI,
  fetchVersionVigente,
  fetchVersionesByDocumento,
  saveSgiCategoria,
  deleteSgiCategoria,
  saveSgiDocumento,
  softDeleteSgiDocumento,
  saveSgiVersion,
  deleteSgiVersion,
  uploadSgiArchivo,
  getSgiSignedUrl,
  moveSgiCategorias,
  moveSgiDocumento,
} from '../../../services/sgiService';
import { EmptyState, useToast, SubmitButton, FieldError } from '../../../components/common';
import { fetchSgiUploaders, updateCanUploadSgi } from '../../../services/usuariosService';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Select } from '../../../components/common';
import { notificarDocumentoPublicado } from '../../../lib/notificaciones';
import SgiNotifConfig from './SgiNotifConfig';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

const EMPTY_CAT = { nombre: '', icono: 'Folder', color: '#6366f1', descripcion: '', orden: 0, activo: true, parent_id: null, nivel_piramide: '' };
const EMPTY_DOC = { titulo: '', codigo: '', descripcion: '', categoria_id: null, tipo_documento: 'Otro', acceso: 'No Confidencial', lugar_ubicacion: '', periodo_retencion: '', etiquetas: '', documento_controlado: false, activo: true, _ver_id: null, numero_version: '0', fecha_emision: '', notas_cambios: '' };

// Siguiente código según los existentes de la carpeta: prefijo más frecuente + número siguiente (mismo padding)
const sugerirCodigo = (docs) => {
  const grupos = {};
  docs.forEach(d => {
    const m = /^(.*?)(\d+)$/.exec((d.codigo || '').trim());
    if (!m) return;
    const g = (grupos[m[1]] ||= { count: 0, max: -1, pad: 0 });
    g.count += 1;
    g.max = Math.max(g.max, parseInt(m[2], 10));
    g.pad = Math.max(g.pad, m[2].length);
  });
  const [prefijo, g] = Object.entries(grupos).sort((a, b) => b[1].count - a[1].count)[0] || [];
  if (!g) return null;
  const sugerido = `${prefijo}${String(g.max + 1).padStart(g.pad, '0')}`;
  return docs.some(d => (d.codigo || '').trim() === sugerido) ? null : sugerido;
};

const SGITab = () => {
  const confirm = useConfirm();
  const { showToast, toast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [versiones, setVersiones] = useState([]); // solo la version vigente de cada documento
  const [versionesPorDoc, setVersionesPorDoc] = useState({}); // historial completo, cargado bajo demanda al expandir
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedDocs, setExpandedDocs] = useState({});
  const [editMode, setEditMode] = useState(null); // null | 'cat' | 'doc' | 'ver'
  const [editingCat, setEditingCat] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editingVer, setEditingVer] = useState(null);
  const vCat = useRequiredFields([
    { id: 'sgicat-nombre', label: 'Nombre', valid: !!editingCat?.nombre?.trim() },
  ]);
  const vDoc = useRequiredFields([
    { id: 'sgidoc-titulo', label: 'Título', valid: !!editingDoc?.titulo?.trim() },
  ]);
  const [uploaders, setUploaders] = useState([]);
  const [uploadersSearch, setUploadersSearch] = useState('');

  useEffect(() => {
    loadSGI();
    fetchSgiUploaders().then(({ data }) => setUploaders(data));
  }, []);

  const handleToggleUploader = async (user) => {
    const newVal = !user.can_upload_sgi;
    setUploaders(prev => prev.map(u => u.id === user.id ? { ...u, can_upload_sgi: newVal } : u));
    const { error } = await updateCanUploadSgi(user.id, newVal);
    if (error) {
      setUploaders(prev => prev.map(u => u.id === user.id ? { ...u, can_upload_sgi: !newVal } : u));
      showToast('Error al actualizar permiso', 'error');
    } else {
      showToast(newVal ? `${user.full_name} puede subir documentos` : `Permiso removido a ${user.full_name}`, 'success');
    }
  };

  const loadSGI = async () => {
    const { categorias: cats, documentos: docs, versiones: vers } = await fetchSGI();
    setCategorias(cats);
    setDocumentos(docs);
    setVersiones(vers);
  };

  // Trae el historial completo de un documento solo cuando se expande (bajo demanda)
  const toggleDocExpand = async (docId) => {
    const opening = !expandedDocs[docId];
    setExpandedDocs(s => ({ ...s, [docId]: opening }));
    if (opening && !versionesPorDoc[docId]) {
      const { data } = await fetchVersionesByDocumento(docId);
      setVersionesPorDoc(prev => ({ ...prev, [docId]: data }));
    }
  };

  const refreshVersionesDoc = async (docId) => {
    const { data } = await fetchVersionesByDocumento(docId);
    setVersionesPorDoc(prev => ({ ...prev, [docId]: data }));
  };

  const closeEdit = () => { setEditMode(null); setEditingCat(null); setEditingDoc(null); setEditingVer(null); };

  // ── Categorías ───────────────────────────────────────────────────────────
  const handleSaveCat = async () => {
    if (!editingCat.nombre) return;
    const { error } = await saveSgiCategoria(editingCat);
    if (error) return showToast(error.message, 'error');
    await loadSGI();
    closeEdit();
  };

  const handleDeleteCat = async (id) => {
    if (!(await confirm({ message: '¿Eliminar esta categoría y todos sus documentos?', destructive: true }))) return;
    await deleteSgiCategoria(id);
    await loadSGI();
  };

  // ── Documentos ────────────────────────────────────────────────────────────
  const handleCreateDoc = (categoriaId) => {
    setEditingDoc({ ...EMPTY_DOC, categoria_id: categoriaId, fecha_emision: hoyISO() });
    vDoc.reset();
    setEditMode('doc');
  };

  const handleEditDoc = async (doc) => {
    const { data: vigente } = await fetchVersionVigente(doc.id);
    setEditingDoc({
      ...doc,
      etiquetas: doc.etiquetas || '',
      documento_controlado: doc.documento_controlado || false,
      _ver_id: vigente?.id || null,
      numero_version: vigente?.numero_version || '0',
      fecha_emision: vigente?.fecha_emision || '',
      notas_cambios: vigente?.notas_cambios || '',
    });
    vDoc.reset();
    setEditMode('doc');
  };

  const handleSaveDoc = async () => {
    if (!editingDoc.titulo || !editingDoc.categoria_id) return;
    const { id, _ver_id, numero_version, fecha_emision, notas_cambios, ...docFields } = editingDoc;
    const docPayload = { ...docFields };
    if (id) docPayload.id = id;
    const { data: saved, error } = await saveSgiDocumento(docPayload, { _ver_id, numero_version, fecha_emision, notas_cambios });
    if (error) return showToast(error.message, 'error');
    if (saved?.publicadoVersionId) notificarDocumentoPublicado({ versionId: saved.publicadoVersionId });
    await loadSGI();
    closeEdit();
  };

  const handleDeleteDoc = async (id) => {
    if (!(await confirm({ message: '¿Eliminar este documento y todas sus versiones?', destructive: true }))) return;
    await softDeleteSgiDocumento(id);
    await loadSGI();
  };

  // ── Versiones ─────────────────────────────────────────────────────────────
  const handleSaveVer = async () => {
    if (!editingVer.numero_version || !editingVer.documento_id) return;

    let archivoPath = editingVer.archivo_url || null;
    if (editingVer._archivo) {
      const ext = editingVer._archivo.name.split('.').pop();
      const fileName = `${editingVer.documento_id}/rev${editingVer.numero_version}_${Date.now()}.${ext}`;
      const { error: uploadError } = await uploadSgiArchivo(editingVer.documento_id, editingVer.numero_version, editingVer._archivo);
      if (uploadError) { showToast('Error al subir el archivo: ' + uploadError.message, 'error'); return; }
      archivoPath = fileName;
    }

    const payload = {
      id: editingVer.id,
      numero_version: editingVer.numero_version,
      archivo_url: archivoPath,
      notas_cambios: editingVer.notas_cambios || null,
      fecha_emision: editingVer.fecha_emision || null,
      vigente: editingVer.vigente ?? false,
      documento_id: editingVer.documento_id,
      revisor: editingVer.revisor || null,
      aprobador: editingVer.aprobador || null,
      // Versión nueva cargada como vigente por un admin = publicada directamente
      ...(!editingVer.id && editingVer.vigente && { estado_aprobacion: 'aprobado' }),
    };

    const { data: savedVer, error } = await saveSgiVersion(payload);
    if (error) { showToast(error.message, 'error'); return; }
    // Nueva revisión marcada vigente → aviso general
    if (!editingVer.id && payload.vigente && savedVer?.[0]?.id) notificarDocumentoPublicado({ versionId: savedVer[0].id });
    await Promise.all([loadSGI(), refreshVersionesDoc(editingVer.documento_id)]);
    closeEdit();
  };

  const handleDeleteVer = async (id, documentoId) => {
    if (!(await confirm({ message: '¿Eliminar esta versión?', destructive: true }))) return;
    await deleteSgiVersion(id);
    await Promise.all([loadSGI(), refreshVersionesDoc(documentoId)]);
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────
  // Carpeta sobre carpeta: borde superior/inferior = antes/después (mismo nivel), centro = adentro.
  // Documento sobre carpeta (o sobre otro documento) = mover a esa carpeta.
  const [drag, setDrag] = useState(null);             // { type: 'cat' | 'doc', id }
  const [dropTarget, setDropTarget] = useState(null); // { id: carpetaId, pos: 'before' | 'inside' | 'after' }
  const expandTimer = useRef(null);
  const HINT_KEY = 'sgi-admin-dnd-hint-closed';
  const [showDndHint, setShowDndHint] = useState(() => {
    try { return localStorage.getItem(HINT_KEY) !== '1'; } catch { return true; }
  });
  const closeDndHint = () => {
    setShowDndHint(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* sin storage: solo se oculta en esta sesión */ }
  };

  const catName = (id) => categorias.find(c => c.id === id)?.nombre ?? 'la carpeta';
  const sameParent = (a, b) => (a ?? null) === (b ?? null);

  const isDescendant = (catId, ancestorId) => {
    let c = categorias.find(x => x.id === catId);
    while (c?.parent_id) {
      if (c.parent_id === ancestorId) return true;
      c = categorias.find(x => x.id === c.parent_id);
    }
    return false;
  };

  const clearDrag = () => {
    clearTimeout(expandTimer.current);
    setDrag(null);
    setDropTarget(null);
  };

  const handleDragStart = (e, type, id) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id); // requerido por Firefox
    setDrag({ type, id });
  };

  // targetCatId: carpeta destino; overCat: true si el puntero está sobre la fila de esa carpeta
  const handleDragOver = (e, targetCatId, overCat) => {
    if (!drag) return;
    const invalid = () => { if (dropTarget) setDropTarget(null); };
    let pos = 'inside';
    if (drag.type === 'cat') {
      // No se puede soltar sobre un documento, sobre sí misma ni dentro de una subcarpeta propia
      if (!overCat || targetCatId === drag.id || isDescendant(targetCatId, drag.id)) return invalid();
      const { top, height } = e.currentTarget.getBoundingClientRect();
      const y = (e.clientY - top) / height;
      pos = y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'inside';
    } else if (documentos.find(d => d.id === drag.id)?.categoria_id === targetCatId) {
      return invalid(); // ya está en esa carpeta
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget?.id !== targetCatId || dropTarget?.pos !== pos) {
      setDropTarget({ id: targetCatId, pos });
      // Abrir la carpeta si el puntero se queda encima
      clearTimeout(expandTimer.current);
      if (pos === 'inside' && !expandedCats[targetCatId]) {
        expandTimer.current = setTimeout(() => setExpandedCats(s => ({ ...s, [targetCatId]: true })), 700);
      }
    }
  };

  const applyCatMoves = (moves) => setCategorias(prev =>
    prev.map(c => { const m = moves.find(x => x.id === c.id); return m ? { ...c, parent_id: m.parent_id, orden: m.orden } : c; })
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  );

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const d = drag, t = dropTarget;
    clearDrag();
    if (!d || !t) return;

    if (d.type === 'doc') {
      const doc = documentos.find(x => x.id === d.id);
      if (!doc || doc.categoria_id === t.id) return;
      const prevCat = doc.categoria_id;
      const setCat = (catId) => setDocumentos(prev => prev.map(x => x.id === doc.id ? { ...x, categoria_id: catId } : x));
      setCat(t.id);
      setExpandedCats(s => ({ ...s, [t.id]: true }));
      const { error } = await moveSgiDocumento(doc.id, t.id);
      if (error) { setCat(prevCat); return showToast('No se pudo mover el documento', 'error'); }
      toast.success({
        title: `“${doc.titulo}” movido a ${catName(t.id)}`,
        action: { label: 'Deshacer', onClick: async () => {
          setCat(prevCat);
          const { error: undoErr } = await moveSgiDocumento(doc.id, prevCat);
          if (undoErr) { showToast('No se pudo deshacer', 'error'); loadSGI(); }
        } },
      });
      return;
    }

    // Carpeta: recalcular el orden de los hermanos en el nivel destino
    const moved = categorias.find(c => c.id === d.id);
    const target = categorias.find(c => c.id === t.id);
    if (!moved || !target) return;
    const newParent = t.pos === 'inside' ? target.id : (target.parent_id ?? null);
    const siblings = categorias.filter(c => sameParent(c.parent_id, newParent) && c.id !== moved.id);
    const idx = t.pos === 'inside' ? siblings.length
      : siblings.findIndex(c => c.id === target.id) + (t.pos === 'after' ? 1 : 0);
    siblings.splice(idx, 0, moved);

    const moves = siblings
      .map((c, i) => ({ id: c.id, parent_id: newParent, orden: i + 1 }))
      .filter(m => { const c = categorias.find(x => x.id === m.id); return !sameParent(c.parent_id, m.parent_id) || c.orden !== m.orden; });
    if (moves.length === 0) return;
    const snapshot = moves.map(m => { const c = categorias.find(x => x.id === m.id); return { id: c.id, parent_id: c.parent_id ?? null, orden: c.orden }; });

    applyCatMoves(moves);
    if (t.pos === 'inside') setExpandedCats(s => ({ ...s, [target.id]: true }));
    const { error } = await moveSgiCategorias(moves);
    if (error) { showToast('No se pudo mover la carpeta', 'error'); return loadSGI(); }
    toast.success({
      title: t.pos === 'inside' ? `“${moved.nombre}” movida a ${target.nombre}` : `“${moved.nombre}” reordenada`,
      action: { label: 'Deshacer', onClick: async () => {
        applyCatMoves(snapshot);
        const { error: undoErr } = await moveSgiCategorias(snapshot);
        if (undoErr) { showToast('No se pudo deshacer', 'error'); loadSGI(); }
      } },
    });
  };

  // Texto de la barra flotante mientras se arrastra: qué pasa si soltás ahora
  const dragStatus = (() => {
    if (!drag) return null;
    const item = drag.type === 'doc'
      ? documentos.find(x => x.id === drag.id)?.titulo
      : categorias.find(x => x.id === drag.id)?.nombre;
    if (!dropTarget) {
      return { item, accion: drag.type === 'doc' ? 'Soltalo sobre una carpeta' : 'Soltala sobre otra carpeta' };
    }
    const destino = catName(dropTarget.id);
    const accion = dropTarget.pos === 'before' ? `Ubicar antes de “${destino}”`
      : dropTarget.pos === 'after' ? `Ubicar después de “${destino}”`
      : `Mover dentro de “${destino}”`;
    return { item, accion, ok: true };
  })();

  const dropClass = (catId) => {
    if (dropTarget?.id !== catId) return '';
    return ` drop-${dropTarget.pos}`;
  };

  // ── Tree helpers ──────────────────────────────────────────────────────────
  const getRecursiveDocCount = (catId) => {
    const directDocs = documentos.filter(d => d.categoria_id === catId).length;
    const subcats = categorias.filter(c => c.parent_id === catId);
    return directDocs + subcats.reduce((sum, s) => sum + getRecursiveDocCount(s.id), 0);
  };

  const IC = { size: 16, strokeWidth: 1.5 };

  const renderCategory = (cat, depth = 0) => {
    const subcats = categorias.filter(c => c.parent_id === cat.id);
    const catDocs = documentos.filter(d => d.categoria_id === cat.id);
    const isOpen = expandedCats[cat.id];
    const totalDocs = getRecursiveDocCount(cat.id);
    const tone = /^#[0-9a-f]{6}$/i.test(cat.color || '') ? cat.color : undefined;

    return (
      <React.Fragment key={cat.id}>
        <li
          className={`adm-row sgi-adm-cat sgi-dnd${drag?.id === cat.id ? ' is-dragging' : ''}${dropClass(cat.id)}`}
          style={{ '--depth': depth, ...(tone ? { '--tone': tone } : {}) }}
          draggable
          title="Arrastrá para mover o reordenar"
          data-drop-label="Soltar acá"
          onDragStart={e => handleDragStart(e, 'cat', cat.id)}
          onDragOver={e => handleDragOver(e, cat.id, true)}
          onDrop={handleDrop}
          onDragEnd={clearDrag}
        >
          <span className="sgi-grip" aria-hidden="true"><GripVertical size={16} strokeWidth={1.5} /></span>
          <button
            type="button"
            className="adm-action"
            aria-expanded={!!isOpen}
            aria-label={`${isOpen ? 'Contraer' : 'Expandir'} ${cat.nombre}`}
            onClick={() => setExpandedCats(s => ({ ...s, [cat.id]: !s[cat.id] }))}
          >
            {isOpen ? <ChevronDown {...IC} /> : <ChevronRight {...IC} />}
          </button>
          <span className="adm-row-icon"><Folder size={18} strokeWidth={1.5} /></span>
          <div className="adm-row-info">
            <div className="adm-row-title"><span className="adm-ellipsis">{cat.nombre}</span></div>
            <div className="adm-row-meta">
              <span>{totalDocs} doc{totalDocs !== 1 ? 's' : ''}</span>
              {subcats.length > 0 && <span>{subcats.length} subcarpeta{subcats.length !== 1 ? 's' : ''}</span>}
            </div>
          </div>
          <div className="adm-actions hover-reveal">
            <button type="button" className="adm-action" title="Crear carpeta interna" aria-label={`Crear carpeta dentro de ${cat.nombre}`} onClick={() => { setEditingCat({ ...EMPTY_CAT, parent_id: cat.id, orden: categorias.length + 1 }); vCat.reset(); setEditMode('cat'); }}><FolderPlus {...IC} /></button>
            <button type="button" className="adm-action" title="Crear documento" aria-label={`Crear documento en ${cat.nombre}`} onClick={() => handleCreateDoc(cat.id)}><FilePlus {...IC} /></button>
            <button type="button" className="adm-action" title="Editar categoría" aria-label={`Editar ${cat.nombre}`} onClick={() => { setEditingCat({ ...cat }); vCat.reset(); setEditMode('cat'); }}><Pencil {...IC} /></button>
            <button type="button" className="adm-action danger" title="Eliminar categoría" aria-label={`Eliminar ${cat.nombre}`} onClick={() => handleDeleteCat(cat.id)}><Trash2 {...IC} /></button>
          </div>
        </li>

        {isOpen && (
          <>
            {subcats.map(subcat => renderCategory(subcat, depth + 1))}
            {catDocs.length === 0 && subcats.length === 0 ? (
              <li className="adm-row adm-row-note" style={{ '--depth': depth + 1 }}>Carpeta vacía</li>
            ) : catDocs.map(doc => {
              const vigente = versiones.find(v => v.documento_id === doc.id);
              const isDocOpen = expandedDocs[doc.id];
              const docVers = versionesPorDoc[doc.id];
              return (
                <React.Fragment key={doc.id}>
                  <li
                    className={`adm-row sgi-dnd${drag?.id === doc.id ? ' is-dragging' : ''}`}
                    style={{ '--depth': depth + 1 }}
                    draggable
                    title="Arrastrá a otra carpeta para moverlo"
                    onDragStart={e => handleDragStart(e, 'doc', doc.id)}
                    onDragOver={e => handleDragOver(e, cat.id, false)}
                    onDrop={handleDrop}
                    onDragEnd={clearDrag}
                  >
                    <span className="sgi-grip" aria-hidden="true"><GripVertical size={16} strokeWidth={1.5} /></span>
                    <button
                      type="button"
                      className="adm-action"
                      aria-expanded={!!isDocOpen}
                      aria-label={`${isDocOpen ? 'Ocultar' : 'Ver'} versiones de ${doc.titulo}`}
                      onClick={() => toggleDocExpand(doc.id)}
                    >
                      {isDocOpen ? <ChevronDown {...IC} /> : <ChevronRight {...IC} />}
                    </button>
                    <span className="adm-row-icon sgi-adm-doc-icon"><FileText size={18} strokeWidth={1.5} /></span>
                    <div className="adm-row-info">
                      <div className="adm-row-title">
                        <span className="adm-ellipsis">{doc.titulo}</span>
                        {doc.codigo && <span className="adm-badge mono neutral">{doc.codigo}</span>}
                      </div>
                    </div>
                    <div className="adm-row-side">
                      {vigente
                        ? <span className="adm-badge success">Rev. {vigente.numero_version}</span>
                        : <span className="adm-badge neutral">Sin versión</span>}
                    </div>
                    <div className="adm-actions hover-reveal">
                      <button type="button" className="adm-action" title="Nueva versión" aria-label={`Nueva versión de ${doc.titulo}`} onClick={() => {
                        const maxVer = parseInt(vigente?.numero_version) || 0;
                        setEditingVer({ numero_version: String(maxVer + 1), archivo_url: '', notas_cambios: '', fecha_emision: hoyISO(), vigente: true, documento_id: doc.id });
                        setEditMode('ver');
                      }}><Plus {...IC} /></button>
                      <button type="button" className="adm-action" title="Editar documento" aria-label={`Editar ${doc.titulo}`} onClick={() => handleEditDoc(doc)}><Pencil {...IC} /></button>
                      <button type="button" className="adm-action danger" title="Eliminar documento" aria-label={`Eliminar ${doc.titulo}`} onClick={() => handleDeleteDoc(doc.id)}><Trash2 {...IC} /></button>
                    </div>
                  </li>

                  {isDocOpen && (
                    docVers === undefined ? (
                      <li className="adm-row adm-row-note" style={{ '--depth': depth + 2 }}>Cargando…</li>
                    ) : docVers.length === 0 ? (
                      <li className="adm-row adm-row-note" style={{ '--depth': depth + 2 }}>Sin versiones</li>
                    ) : docVers.map(ver => (
                      <li key={ver.id} className="adm-row adm-row-compact sgi-adm-ver" style={{ '--depth': depth + 2 }}>
                        <span className={`sgi-adm-ver-dot${ver.vigente ? ' vigente' : ''}`} aria-hidden="true" />
                        <div className="adm-row-info">
                          <div className="adm-row-title">
                            <span>Rev. {ver.numero_version}</span>
                            {ver.vigente && <span className="adm-badge success">Vigente</span>}
                          </div>
                          {(ver.fecha_emision || ver.notas_cambios) && (
                            <div className="adm-row-meta">
                              {ver.fecha_emision && <span>{formatFecha(ver.fecha_emision, {})}</span>}
                              {ver.notas_cambios && <span className="adm-ellipsis sgi-adm-ver-notes">{ver.notas_cambios}</span>}
                            </div>
                          )}
                        </div>
                        <div className="adm-actions hover-reveal">
                          {ver.archivo_url && (
                            <button type="button" className="adm-action" title="Descargar" aria-label={`Descargar revisión ${ver.numero_version}`} onClick={async () => {
                              const { data } = await getSgiSignedUrl(ver.archivo_url, 60);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }}><Download {...IC} /></button>
                          )}
                          <button type="button" className="adm-action" title="Editar versión" aria-label={`Editar revisión ${ver.numero_version}`} onClick={() => { setEditingVer({ ...ver }); setEditMode('ver'); }}><Pencil {...IC} /></button>
                          <button type="button" className="adm-action danger" title="Eliminar versión" aria-label={`Eliminar revisión ${ver.numero_version}`} onClick={() => handleDeleteVer(ver.id, doc.id)}><Trash2 {...IC} /></button>
                        </div>
                      </li>
                    ))
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
      </React.Fragment>
    );
  };

  // ── Edit forms ───────────────────────────────────────────────────────────
  if (editMode === 'cat') return (
    <div className="edit-card">
      <div className="form-header">
        <button className="btn-back" onClick={closeEdit}><ChevronLeft size={18} /> Volver</button>
        <h3>{editingCat?.id ? 'Editar categoría' : 'Nueva categoría'}</h3>
      </div>
      <div className="form-body">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="sgicat-nombre">Nombre *</label>
            <input id="sgicat-nombre" {...vCat.fieldProps('sgicat-nombre')} className="form-control" value={editingCat.nombre} onChange={e => setEditingCat(d => ({ ...d, nombre: e.target.value }))} placeholder="Ej: Procedimientos" />
            <FieldError show={vCat.isInvalid('sgicat-nombre')}>Ingresá un nombre</FieldError>
          </div>
          <div className="form-group">
            <label>Carpeta Padre</label>
            <Select value={String(editingCat.parent_id || '')} onChange={v => setEditingCat(d => ({ ...d, parent_id: v || null }))} placeholder="(Ninguna - Carpeta Principal)"
              options={[{ value: '', label: '(Ninguna - Carpeta Principal)' }, ...categorias.filter(c => c.id !== editingCat.id).map(c => ({ value: String(c.id), label: c.nombre }))]} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Descripción</label>
            <input className="form-control" value={editingCat.descripcion || ''} onChange={e => setEditingCat(d => ({ ...d, descripcion: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ maxWidth: 220 }}>
            <label>Ícono (nombre Lucide)</label>
            <input className="form-control" value={editingCat.icono} onChange={e => setEditingCat(d => ({ ...d, icono: e.target.value }))} placeholder="FileText..." />
          </div>
          <div className="form-group" style={{ maxWidth: 100 }}>
            <label>Color</label>
            <input type="color" className="form-control" style={{ height: 42, padding: 4, cursor: 'pointer' }} value={editingCat.color} onChange={e => setEditingCat(d => ({ ...d, color: e.target.value }))} />
          </div>
          <div className="form-group" style={{ maxWidth: 100 }}>
            <label>Orden</label>
            <input type="number" className="form-control" value={editingCat.orden} onChange={e => setEditingCat(d => ({ ...d, orden: e.target.value }))} />
          </div>
          <div className="form-group" style={{ maxWidth: 140 }}>
            <label>Nivel pirámide</label>
            <input
              type="number"
              min="1"
              className="form-control"
              placeholder="1, 2, 3..."
              value={editingCat.nivel_piramide ?? ''}
              onChange={e => setEditingCat(d => ({ ...d, nivel_piramide: e.target.value }))}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              1 = cima, 2 = siguiente...
            </span>
          </div>
        </div>
        <SubmitButton className="btn-primary" missing={vCat.missing} onMissing={vCat.revealAll} onClick={handleSaveCat}><Save size={16} /> Guardar</SubmitButton>
      </div>
    </div>
  );

  const codigoSugerido = editMode === 'doc' && editingDoc && !editingDoc.id
    ? sugerirCodigo(documentos.filter(d => d.categoria_id === editingDoc.categoria_id))
    : null;

  if (editMode === 'doc') return (
    <div className="edit-card">
      <div className="form-header">
        <button className="btn-back" onClick={closeEdit}><ChevronLeft size={18} /> Volver</button>
        <h3>{editingDoc?.id ? 'Editar documento' : 'Agregar documento'}</h3>
        <SubmitButton className="btn-primary" style={{ marginLeft: 'auto' }} missing={vDoc.missing} onMissing={vDoc.revealAll} onClick={handleSaveDoc}><Save size={16} /> Guardar</SubmitButton>
      </div>
      <div className="form-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
          <div>
            <div className="form-group">
              <label htmlFor="sgidoc-codigo">Código</label>
              <input id="sgidoc-codigo" className="form-control" value={editingDoc.codigo || ''} onChange={e => setEditingDoc(d => ({ ...d, codigo: e.target.value }))} placeholder="Código del documento" />
              {!editingDoc.id && !editingDoc.codigo && codigoSugerido && (
                <button type="button" className="adm-suggest-chip" onClick={() => setEditingDoc(d => ({ ...d, codigo: codigoSugerido }))}>
                  Usar {codigoSugerido}
                </button>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="sgidoc-titulo">Título *</label>
              <input id="sgidoc-titulo" {...vDoc.fieldProps('sgidoc-titulo')} className="form-control" value={editingDoc.titulo} onChange={e => setEditingDoc(d => ({ ...d, titulo: e.target.value }))} placeholder="Título del documento" />
              <FieldError show={vDoc.isInvalid('sgidoc-titulo')}>Ingresá un título</FieldError>
            </div>
            <div className="form-group">
              <label>Revisión</label>
              <Select value={String(editingDoc.numero_version || '0')} onChange={v => setEditingDoc(d => ({ ...d, numero_version: v }))}
                options={Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }))} />
            </div>
            <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={editingDoc.fecha_emision || ''} onChange={e => setEditingDoc(d => ({ ...d, fecha_emision: e.target.value }))} /></div>
            <div className="form-group">
              <label>Tipo de documento</label>
              <Select value={editingDoc.tipo_documento || 'Otro'} onChange={v => setEditingDoc(d => ({ ...d, tipo_documento: v }))}
                options={['Procedimiento', 'Manual', 'Instructivo', 'Registro', 'Formato', 'Otro']} />
            </div>
            <div className="form-group">
              <label>Acceso</label>
              <Select value={editingDoc.acceso || 'No Confidencial'} onChange={v => setEditingDoc(d => ({ ...d, acceso: v }))}
                options={['No Confidencial', 'Confidencial', 'Restringido']} />
            </div>
            <div className="form-group">
              <label>Documento Controlado</label>
              <Select value={editingDoc.documento_controlado ? 'si' : 'no'} onChange={v => setEditingDoc(d => ({ ...d, documento_controlado: v === 'si' }))}
                options={[{ value: 'no', label: 'No requiere aprobación' }, { value: 'si', label: 'Sí, requiere aprobación' }]} />
            </div>
          </div>
          <div>
            <div className="form-group"><label>Etiquetas</label><input className="form-control" value={editingDoc.etiquetas || ''} onChange={e => setEditingDoc(d => ({ ...d, etiquetas: e.target.value }))} placeholder="Etiquetas del documento" /></div>
            <div className="form-group"><label>Descripción</label><textarea className="form-control" rows={4} value={editingDoc.descripcion || ''} onChange={e => setEditingDoc(d => ({ ...d, descripcion: e.target.value }))} placeholder="Descripción del documento..." /></div>
            <div className="form-group"><label>Histórico</label><textarea className="form-control" rows={4} value={editingDoc.notas_cambios || ''} onChange={e => setEditingDoc(d => ({ ...d, notas_cambios: e.target.value }))} placeholder="Descripción de cambio o aprobación..." /></div>
            <div className="form-group"><label>Lugar Ubicación</label><input className="form-control" value={editingDoc.lugar_ubicacion || ''} onChange={e => setEditingDoc(d => ({ ...d, lugar_ubicacion: e.target.value }))} /></div>
            <div className="form-group"><label>Período de Retención</label><input className="form-control" value={editingDoc.periodo_retencion || ''} onChange={e => setEditingDoc(d => ({ ...d, periodo_retencion: e.target.value }))} /></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (editMode === 'ver') return (
    <div className="edit-card">
      <div className="form-header">
        <button className="btn-back" onClick={closeEdit}><ChevronLeft size={18} /> Volver</button>
        <h3>{editingVer?.id ? 'Editar versión' : 'Nueva versión'}</h3>
      </div>
      <div className="form-body">
        <div className="form-row">
          <div className="form-group" style={{ maxWidth: 160 }}>
            <label>Número de versión</label>
            <input className="form-control" value={editingVer.numero_version} readOnly style={{ background: 'var(--bg-hover)', cursor: 'not-allowed', fontWeight: 700 }} />
          </div>
          <div className="form-group" style={{ maxWidth: 200 }}>
            <label>Fecha de emisión</label>
            <input type="date" className="form-control" value={editingVer.fecha_emision || ''} onChange={e => setEditingVer(d => ({ ...d, fecha_emision: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Revisor</label><input className="form-control" value={editingVer.revisor || ''} onChange={e => setEditingVer(d => ({ ...d, revisor: e.target.value }))} placeholder="Nombre del revisor..." /></div>
          <div className="form-group"><label>Aprobador</label><input className="form-control" value={editingVer.aprobador || ''} onChange={e => setEditingVer(d => ({ ...d, aprobador: e.target.value }))} placeholder="Nombre del aprobador..." /></div>
        </div>
        <div className="form-group">
          <label>Archivo (PDF / Word / Excel)</label>
          <input type="file" className="form-control" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={e => setEditingVer(d => ({ ...d, _archivo: e.target.files[0] || null }))} />
          {editingVer._archivo && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>{editingVer._archivo.name}</span>}
          {!editingVer._archivo && editingVer.archivo_url && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Archivo actual guardado. Subí uno nuevo para reemplazarlo.</span>}
        </div>
        <div className="form-group">
          <label>Notas de cambios</label>
          <textarea className="form-control" rows={3} value={editingVer.notas_cambios || ''} onChange={e => setEditingVer(d => ({ ...d, notas_cambios: e.target.value }))} />
        </div>
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={editingVer.vigente} onChange={e => setEditingVer(d => ({ ...d, vigente: e.target.checked }))} />
          Marcar como versión vigente
        </label>
        <button className="btn-primary" onClick={handleSaveVer} disabled={!editingVer.numero_version}><Save size={16} /> Guardar</button>
      </div>
    </div>
  );

  // Documento real (el primero con versión vigente) para la vista previa del aviso
  const ejemploVer = versiones[0];
  const ejemploDoc = ejemploVer && documentos.find(d => d.id === ejemploVer.documento_id);
  const ejemploNotif = ejemploDoc
    ? { titulo: ejemploDoc.titulo, codigo: ejemploDoc.codigo, versionNumero: ejemploVer.numero_version, documentoId: ejemploDoc.id }
    : null;

  const filteredUploaders = uploaders.filter(u =>
    !uploadersSearch || u.full_name?.toLowerCase().includes(uploadersSearch.toLowerCase()) || u.email?.toLowerCase().includes(uploadersSearch.toLowerCase())
  );

  return (
    <div className="admin-list-panel adm-panel">
      <SgiNotifConfig ejemplo={ejemploNotif} />

      <section className="adm-section">
        <div className="admin-list-header">
          <div>
            <h3>Editores de documentos SGI <span className="admin-count">{uploaders.filter(u => u.can_upload_sgi).length}</span></h3>
            <p className="adm-panel-desc">
              Solo estas personas podrán subir y editar documentos. Los admins siempre tienen acceso.
            </p>
          </div>
        </div>
        <div className="adm-toolbar">
          <label className="org-search">
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar por nombre o email…"
              aria-label="Buscar editores por nombre o email"
              value={uploadersSearch}
              onChange={e => setUploadersSearch(e.target.value)}
            />
          </label>
        </div>
        {filteredUploaders.length === 0 ? (
          <div className="adm-empty">No se encontraron usuarios.</div>
        ) : (
          <ul className="adm-list adm-scroll">
            {filteredUploaders.map(u => (
              <li key={u.id} className="adm-row">
                <span className="adm-row-icon round">{initials(u.full_name)}</span>
                <div className="adm-row-info">
                  <div className="adm-row-title"><span className="adm-ellipsis">{u.full_name}</span></div>
                  <div className="adm-row-meta"><span className="adm-ellipsis">{u.email}</span></div>
                </div>
                <div className="adm-row-side">
                  <span className={`adm-badge ${u.can_upload_sgi ? '' : 'neutral'}`}>{u.can_upload_sgi ? 'Puede subir' : 'Sin permiso'}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!u.can_upload_sgi}
                    aria-label={`Permitir a ${u.full_name} subir documentos`}
                    className={`adm-switch${u.can_upload_sgi ? ' on' : ''}`}
                    onClick={() => handleToggleUploader(u)}
                  >
                    <span className="adm-switch-thumb" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="adm-section">
        <div className="admin-list-header">
          <div>
            <h3>Categorías y documentos</h3>
            <p className="adm-panel-desc">{categorias.length} categorías · {documentos.length} documentos</p>
          </div>
          <button type="button" className="btn-add-admin" onClick={() => { setEditingCat({ ...EMPTY_CAT, orden: categorias.length + 1 }); vCat.reset(); setEditMode('cat'); }}>
            <Plus size={16} strokeWidth={1.5} /> Nueva categoría
          </button>
        </div>
        {categorias.length > 0 && showDndHint && (
          <div className="sgi-dnd-hint" role="note">
            <span className="sgi-dnd-hint-icon"><Move size={18} strokeWidth={1.5} /></span>
            <div className="sgi-dnd-hint-body">
              <strong>Reorganizá arrastrando</strong>
              <span>Tomá cualquier carpeta o documento desde <GripVertical size={13} strokeWidth={1.5} className="sgi-inline-icon" /> y soltalo donde quieras:</span>
              <ul>
                <li><FolderInput size={14} strokeWidth={1.5} /> <b>Centro de una carpeta</b>: lo mete adentro</li>
                <li><ArrowUpDown size={14} strokeWidth={1.5} /> <b>Borde de arriba o abajo</b>: reordena la carpeta en ese nivel</li>
                <li><CornerDownRight size={14} strokeWidth={1.5} /> Si te quedás encima de una carpeta cerrada, se abre sola</li>
              </ul>
            </div>
            <button type="button" className="adm-action sm" aria-label="Ocultar ayuda" title="Entendido, no mostrar más" onClick={closeDndHint}>
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        )}
        {categorias.length === 0 ? (
          <EmptyState message="No hay categorías. Creá la primera con el botón de arriba." />
        ) : (
          <ul className={`adm-list sgi-adm-tree${drag ? ' is-dnd-active' : ''}`}>
            {categorias.filter(c => !c.parent_id).map(cat => renderCategory(cat, 0))}
          </ul>
        )}
        {dragStatus && (
          <div className={`sgi-dnd-status${dragStatus.ok ? ' ok' : ''}`} role="status" aria-live="polite">
            <Move size={15} strokeWidth={1.5} />
            <span className="sgi-dnd-status-item">{dragStatus.item}</span>
            <span className="sgi-dnd-status-sep">→</span>
            <span>{dragStatus.accion}</span>
          </div>
        )}
      </section>
    </div>
  );
};

export default SGITab;
