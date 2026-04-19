import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft, ChevronRight, ChevronDown, FileText, FolderPlus, FilePlus, Download } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  fetchSGI,
  fetchVersionVigente,
  saveSgiCategoria,
  deleteSgiCategoria,
  saveSgiDocumento,
  softDeleteSgiDocumento,
  saveSgiVersion,
  deleteSgiVersion,
} from '../../../services/sgiService';
import { EmptyState, useToast } from '../../../components/common';

const EMPTY_CAT = { nombre: '', icono: 'Folder', color: '#6366f1', descripcion: '', orden: 0, activo: true, parent_id: null };
const EMPTY_DOC = { titulo: '', codigo: '', descripcion: '', categoria_id: null, tipo_documento: 'Otro', acceso: 'No Confidencial', lugar_ubicacion: '', periodo_retencion: '', etiquetas: '', documento_controlado: false, activo: true, _ver_id: null, numero_version: '0', fecha_emision: new Date().toISOString().split('T')[0], notas_cambios: '' };

const SGITab = () => {
  const { showToast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [versiones, setVersiones] = useState([]);
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedDocs, setExpandedDocs] = useState({});
  const [editMode, setEditMode] = useState(null); // null | 'cat' | 'doc' | 'ver'
  const [editingCat, setEditingCat] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editingVer, setEditingVer] = useState(null);

  useEffect(() => {
    loadSGI();
  }, []);

  const loadSGI = async () => {
    const { categorias: cats, documentos: docs, versiones: vers } = await fetchSGI();
    setCategorias(cats);
    setDocumentos(docs);
    setVersiones(vers);
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
    if (!window.confirm('¿Eliminar esta categoría y todos sus documentos?')) return;
    await deleteSgiCategoria(id);
    await loadSGI();
  };

  // ── Documentos ────────────────────────────────────────────────────────────
  const handleCreateDoc = (categoriaId) => {
    setEditingDoc({ ...EMPTY_DOC, categoria_id: categoriaId });
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
    setEditMode('doc');
  };

  const handleSaveDoc = async () => {
    if (!editingDoc.titulo || !editingDoc.categoria_id) return;
    const { id, _ver_id, numero_version, fecha_emision, notas_cambios, ...docFields } = editingDoc;
    const docPayload = { ...docFields };
    if (id) docPayload.id = id;
    const { error } = await saveSgiDocumento(docPayload, { _ver_id, numero_version, fecha_emision, notas_cambios });
    if (error) return showToast(error.message, 'error');
    await loadSGI();
    closeEdit();
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm('¿Eliminar este documento y todas sus versiones?')) return;
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
      const { error: uploadError } = await supabase.storage.from('sgi-documentos').upload(fileName, editingVer._archivo, { upsert: true });
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
    };

    const { error } = await saveSgiVersion(payload);
    if (error) { showToast(error.message, 'error'); return; }
    await loadSGI();
    closeEdit();
  };

  const handleDeleteVer = async (id) => {
    if (!window.confirm('¿Eliminar esta versión?')) return;
    await deleteSgiVersion(id);
    await loadSGI();
  };

  // ── Tree helpers ──────────────────────────────────────────────────────────
  const getRecursiveDocCount = (catId) => {
    const directDocs = documentos.filter(d => d.categoria_id === catId).length;
    const subcats = categorias.filter(c => c.parent_id === catId);
    return directDocs + subcats.reduce((sum, s) => sum + getRecursiveDocCount(s.id), 0);
  };

  const renderCategory = (cat, depth = 0) => {
    const subcats = categorias.filter(c => c.parent_id === cat.id);
    const catDocs = documentos.filter(d => d.categoria_id === cat.id);
    const isOpen = expandedCats[cat.id];
    const totalDocs = getRecursiveDocCount(cat.id);

    return (
      <div key={cat.id} style={{ marginLeft: depth > 0 ? 24 : 0, borderLeft: depth > 0 ? '1px dashed #e2e8f0' : 'none', paddingLeft: depth > 0 ? 16 : 0, marginTop: depth > 0 ? 8 : 0 }}>
        <div className="sgi-tree-cat">
          <div className="sgi-tree-row cat-row">
            <button className="sgi-tree-toggle" onClick={() => setExpandedCats(s => ({ ...s, [cat.id]: !s[cat.id] }))}>
              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            <div className="sgi-tree-cat-dot" style={{ background: cat.color }} />
            <span className="sgi-tree-cat-name">{cat.nombre}</span>
            <span className="sgi-tree-count">{totalDocs} doc{totalDocs !== 1 ? 's' : ''} {subcats.length > 0 ? `· ${subcats.length} sub` : ''}</span>
            <div className="sgi-tree-actions">
              <button className="btn-icon-admin" title="Crear carpeta interna" onClick={() => { setEditingCat({ ...EMPTY_CAT, parent_id: cat.id, orden: categorias.length + 1 }); setEditMode('cat'); }}><FolderPlus size={13} /></button>
              <button className="btn-icon-admin" title="Crear documento" onClick={() => handleCreateDoc(cat.id)}><FilePlus size={13} /></button>
              <button className="btn-icon-admin" title="Editar categoría" onClick={() => { setEditingCat({ ...cat }); setEditMode('cat'); }}><Edit2 size={13} /></button>
              <button className="btn-icon-admin danger" title="Eliminar categoría" onClick={() => handleDeleteCat(cat.id)}><Trash2 size={13} /></button>
            </div>
          </div>

          {isOpen && (
            <div className="sgi-tree-docs" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: depth === 0 ? '#fdfdfd' : 'transparent' }}>
              {subcats.map(subcat => renderCategory(subcat, depth + 1))}
              {catDocs.length === 0 && subcats.length === 0 ? (
                <div className="sgi-tree-empty">Vacío</div>
              ) : catDocs.map(doc => {
                const docVers = versiones.filter(v => v.documento_id === doc.id);
                const vigente = docVers.find(v => v.vigente);
                const isDocOpen = expandedDocs[doc.id];
                return (
                  <div key={doc.id} className="sgi-tree-doc">
                    <div className="sgi-tree-row doc-row">
                      <button className="sgi-tree-toggle" onClick={() => setExpandedDocs(s => ({ ...s, [doc.id]: !s[doc.id] }))}>
                        {isDocOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                      <FileText size={14} className="sgi-tree-file-icon" />
                      <span className="sgi-tree-doc-title">{doc.titulo}</span>
                      {doc.codigo && <span className="sgi-tree-code">{doc.codigo}</span>}
                      {vigente ? <span className="sgi-tree-ver vigente">v{vigente.numero_version}</span> : <span className="sgi-tree-ver none">sin versión</span>}
                      <div className="sgi-tree-actions">
                        <button className="btn-icon-admin" title="Nueva versión" onClick={() => {
                          const maxVer = docVers.reduce((max, v) => Math.max(max, parseInt(v.numero_version) || 0), 0);
                          setEditingVer({ numero_version: String(maxVer + 1), archivo_url: '', notas_cambios: '', fecha_emision: new Date().toISOString().split('T')[0], vigente: true, documento_id: doc.id });
                          setEditMode('ver');
                        }}><Plus size={13} /></button>
                        <button className="btn-icon-admin" title="Editar documento" onClick={() => handleEditDoc(doc)}><Edit2 size={13} /></button>
                        <button className="btn-icon-admin danger" title="Eliminar documento" onClick={() => handleDeleteDoc(doc.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>

                    {isDocOpen && (
                      <div className="sgi-tree-versions">
                        {docVers.length === 0 ? (
                          <div className="sgi-tree-empty">Sin versiones</div>
                        ) : docVers.map(ver => (
                          <div key={ver.id} className={`sgi-tree-row ver-row${ver.vigente ? ' vigente' : ''}`}>
                            <div className="sgi-tree-ver-dot" />
                            <span className="sgi-tree-ver-num">v{ver.numero_version}</span>
                            {ver.vigente && <span className="sgi-vigente-pill">Vigente</span>}
                            {ver.fecha_emision && <span className="sgi-tree-ver-date">{new Date(ver.fecha_emision).toLocaleDateString('es-AR')}</span>}
                            {ver.notas_cambios && <span className="sgi-tree-ver-notes">{ver.notas_cambios}</span>}
                            <div className="sgi-tree-actions">
                              {ver.archivo_url && (
                                <button className="btn-icon-admin" title="Descargar" onClick={async () => {
                                  const { data } = await supabase.storage.from('sgi-documentos').createSignedUrl(ver.archivo_url, 60);
                                  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                }}><Download size={13} /></button>
                              )}
                              <button className="btn-icon-admin" title="Editar versión" onClick={() => { setEditingVer({ ...ver }); setEditMode('ver'); }}><Edit2 size={13} /></button>
                              <button className="btn-icon-admin danger" title="Eliminar versión" onClick={() => handleDeleteVer(ver.id)}><Trash2 size={13} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
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
            <label>Nombre *</label>
            <input className="form-control" value={editingCat.nombre} onChange={e => setEditingCat(d => ({ ...d, nombre: e.target.value }))} placeholder="Ej: Procedimientos" />
          </div>
          <div className="form-group">
            <label>Carpeta Padre</label>
            <select className="form-control" value={editingCat.parent_id || ''} onChange={e => setEditingCat(d => ({ ...d, parent_id: e.target.value || null }))}>
              <option value="">(Ninguna - Carpeta Principal)</option>
              {categorias.filter(c => c.id !== editingCat.id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
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
        </div>
        <button className="btn-primary" onClick={handleSaveCat} disabled={!editingCat.nombre}><Save size={16} /> Guardar</button>
      </div>
    </div>
  );

  if (editMode === 'doc') return (
    <div className="edit-card">
      <div className="form-header">
        <button className="btn-back" onClick={closeEdit}><ChevronLeft size={18} /> Volver</button>
        <h3>{editingDoc?.id ? 'Editar documento' : 'Agregar documento'}</h3>
        <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSaveDoc} disabled={!editingDoc.titulo || !editingDoc.categoria_id}><Save size={16} /> Guardar</button>
      </div>
      <div className="form-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
          <div>
            <div className="form-group"><label>Código</label><input className="form-control" value={editingDoc.codigo || ''} onChange={e => setEditingDoc(d => ({ ...d, codigo: e.target.value }))} placeholder="Código del documento" /></div>
            <div className="form-group"><label>Título *</label><input className="form-control" value={editingDoc.titulo} onChange={e => setEditingDoc(d => ({ ...d, titulo: e.target.value }))} placeholder="Título del documento" /></div>
            <div className="form-group">
              <label>Revisión</label>
              <select className="form-control" value={editingDoc.numero_version || '0'} onChange={e => setEditingDoc(d => ({ ...d, numero_version: e.target.value }))}>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={String(i)}>{i}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={editingDoc.fecha_emision || ''} onChange={e => setEditingDoc(d => ({ ...d, fecha_emision: e.target.value }))} /></div>
            <div className="form-group">
              <label>Tipo de documento</label>
              <select className="form-control" value={editingDoc.tipo_documento || 'Otro'} onChange={e => setEditingDoc(d => ({ ...d, tipo_documento: e.target.value }))}>
                <option>Procedimiento</option><option>Manual</option><option>Instructivo</option><option>Registro</option><option>Formato</option><option>Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Acceso</label>
              <select className="form-control" value={editingDoc.acceso || 'No Confidencial'} onChange={e => setEditingDoc(d => ({ ...d, acceso: e.target.value }))}>
                <option>No Confidencial</option><option>Confidencial</option><option>Restringido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Documento Controlado</label>
              <select className="form-control" value={editingDoc.documento_controlado ? 'si' : 'no'} onChange={e => setEditingDoc(d => ({ ...d, documento_controlado: e.target.value === 'si' }))}>
                <option value="no">No requiere aprobación</option><option value="si">Sí, requiere aprobación</option>
              </select>
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

  return (
    <div className="admin-list-panel">
      <div className="admin-list-header">
        <span className="admin-count">{categorias.length} categorías · {documentos.length} documentos</span>
        <button className="btn-add-admin" onClick={() => { setEditingCat({ ...EMPTY_CAT, orden: categorias.length + 1 }); setEditMode('cat'); }}>
          <Plus size={16} /> Nueva categoría
        </button>
      </div>
      <div className="sgi-tree">
        {categorias.filter(c => !c.parent_id).map(cat => renderCategory(cat, 0))}
        {categorias.length === 0 && <EmptyState message="No hay categorías. Creá la primera con el botón de arriba." />}
      </div>
    </div>
  );
};

export default SGITab;
