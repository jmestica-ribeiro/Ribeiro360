import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, BookOpen, ClipboardList, Folder, ChevronRight, ChevronLeft,
  Plus, X, Download, History, CheckCircle, ShieldCheck, Search,
  AlertCircle, Edit2, Trash2, Save, Lock, Unlock, Tag, Clock,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchSgiCategoriasActivas,
  fetchSgiDocsCounts,
  fetchSgiDocumentosByCategoria,
  fetchVersionVigente,
  saveSgiDocumento,
  uploadSgiArchivo,
  softDeleteSgiDocumento,
  getSgiSignedUrl,
  fetchSgiVersionesPendientes,
  searchSgiDocumentos,
} from '../../services/sgiService';
import './SGI.css';

const ICON_MAP = { FileText, BookOpen, ClipboardList, Folder, ShieldCheck };

const getCatSlug = (nombre) =>
  nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

const EMPTY_DOC_FORM = {
  titulo: '', codigo: '', descripcion: '', categoria_id: '',
  tipo_documento: 'Otro', acceso: 'No Confidencial',
  lugar_ubicacion: '', periodo_retencion: '', etiquetas: [],
  documento_controlado: false,
  numero_version: '0', fecha_emision: '', notas_cambios: '',
  _archivo: null,
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SGI = () => {
  const { categoria: categoriaSlug } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [docCounts, setDocCounts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const [pendientesRaw, setPendientesRaw] = useState([]);

  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const term = globalSearch.trim();
    if (term.length < 2) { setSearchResults([]); setShowSearchDrop(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await searchSgiDocumentos(term, { isAdmin });
      setSearchResults(data ?? []);
      setShowSearchDrop(true);
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [globalSearch]);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docForm, setDocForm] = useState(EMPTY_DOC_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => { fetchCategories(); }, []);

  useEffect(() => {
    if (categoriaSlug && categories.length > 0) fetchDocuments();
    else setDocuments([]);
  }, [categoriaSlug, categories]);

  useEffect(() => {
    if (categoriaSlug && categories.length > 0) fetchDocuments();
    else setDocuments([]);
  }, [categoriaSlug, categories]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    setIsLoading(true);
    const [{ data }, { data: docList }, { data: pendData }] = await Promise.all([
      fetchSgiCategoriasActivas(),
      fetchSgiDocsCounts(),
      fetchSgiVersionesPendientes(),
    ]);
    setPendientesRaw(pendData ?? []);

    setCategories(data);

    const counts = {};
    const getRecursiveCount = (catId) => {
      const directDocs = docList.filter(d => d.categoria_id === catId).length;
      const subcategories = data.filter(c => c.parent_id === catId);
      let subDocs = 0;
      subcategories.forEach(sub => { subDocs += getRecursiveCount(sub.id); });
      return directDocs + subDocs;
    };
    data.forEach(cat => { counts[cat.id] = getRecursiveCount(cat.id); });
    setDocCounts(counts);

    setIsLoading(false);
  };

  const fetchDocuments = async () => {
    const cat = categories.find(c => getCatSlug(c.nombre) === categoriaSlug);
    if (!cat) return;
    setIsLoading(true);
    const { data } = await fetchSgiDocumentosByCategoria(cat.id);
    const enriched = data.map(doc => ({
      ...doc,
      versionActual: doc.versiones?.find(v => v.vigente) || doc.versiones?.[0] || null,
      versionPendiente: doc.versiones?.find(v =>
        v.estado_aprobacion === 'en_revision' || v.estado_aprobacion === 'pendiente_aprobacion'
      ) || null,
    }));
    setDocuments(enriched);
    setIsLoading(false);
  };



  // ── Admin actions ─────────────────────────────────────────────────────────
  const openNewDoc = () => {
    setEditingDoc(null);
    setDocForm({ ...EMPTY_DOC_FORM, categoria_id: currentCategory?.id || '', fecha_emision: new Date().toISOString().split('T')[0] });
    setTagInput('');
    setShowDocModal(true);
  };

  const openEditDoc = async (doc) => {
    const { data: vigente } = await fetchVersionVigente(doc.id);
    const refVersion = vigente || doc.versiones?.find(v =>
      v.estado_aprobacion === 'en_revision' || v.estado_aprobacion === 'pendiente_aprobacion'
    ) || doc.versiones?.[0] || null;
    setEditingDoc(doc);
    setDocForm({
      titulo: doc.titulo || '', codigo: doc.codigo || '', descripcion: doc.descripcion || '',
      categoria_id: doc.categoria_id, tipo_documento: doc.tipo_documento || 'Otro',
      acceso: doc.acceso || 'No Confidencial', lugar_ubicacion: doc.lugar_ubicacion || '',
      periodo_retencion: doc.periodo_retencion || '', etiquetas: Array.isArray(doc.etiquetas) ? doc.etiquetas : [],
      documento_controlado: doc.documento_controlado || false,
      _ver_id: refVersion?.id || null,
      numero_version: refVersion?.numero_version || '0',
      fecha_emision: refVersion?.fecha_emision || '',
      notas_cambios: refVersion?.notas_cambios || '',
    });
    setShowDocModal(true);
  };

  const handleSaveDoc = async () => {
    if (!docForm.titulo || !docForm.categoria_id) return;
    setIsSaving(true);
    const docPayload = {
      titulo: docForm.titulo, codigo: docForm.codigo || null, descripcion: docForm.descripcion || null,
      categoria_id: docForm.categoria_id, tipo_documento: docForm.tipo_documento || 'Otro',
      acceso: docForm.acceso || 'No Confidencial', lugar_ubicacion: docForm.lugar_ubicacion || null,
      periodo_retencion: docForm.periodo_retencion || null, etiquetas: docForm.etiquetas.length ? docForm.etiquetas : null,
      documento_controlado: docForm.documento_controlado ?? false, activo: true,
    };

    let archivoPath = null;
    if (docForm._archivo) {
      const { path } = await uploadSgiArchivo(
        editingDoc?.id || 'new',
        docForm.numero_version,
        docForm._archivo,
      );
      archivoPath = path;
    }

    const fullDocPayload = {
      ...docPayload,
      ...(editingDoc?.id ? { id: editingDoc.id } : { created_by: profile?.id }),
    };
    const versionData = docForm.numero_version !== undefined ? {
      _ver_id: docForm._ver_id || null,
      numero_version: docForm.numero_version,
      fecha_emision: docForm.fecha_emision || null,
      notas_cambios: docForm.notas_cambios || null,
      ...(archivoPath && { archivo_url: archivoPath }),
    } : null;

    await saveSgiDocumento(fullDocPayload, versionData);

    setShowDocModal(false);
    setEditingDoc(null);
    await fetchDocuments();
    await fetchCategories();
    setIsSaving(false);
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('¿Eliminar este documento y todas sus versiones?')) return;
    await softDeleteSgiDocumento(docId);
    fetchDocuments(); fetchCategories();
  };

  const isTester = profile?.email === 'juan.mestica@ribeirosrl.com.ar';
  const isRevisorCmass = profile?.department === 'CMASS' || isTester;
  const pendientes = pendientesRaw.filter(ver => {
    if (isTester) return true;
    if (ver.estado_aprobacion === 'en_revision' && isRevisorCmass) return true;
    if (ver.estado_aprobacion === 'pendiente_aprobacion' && profile?.job_title === 'Gerente' && ver.documento?.creador?.department === profile?.department) return true;
    return false;
  });

  const currentCategory = categories.find(c => getCatSlug(c.nombre) === categoriaSlug);
  const subCategories = currentCategory 
    ? categories.filter(c => c.parent_id === currentCategory.id)
    : [];
  
  const hasVersionVigente = (doc) => doc.versiones?.some(v => v.vigente && v.estado_aprobacion === 'aprobado');

  const filteredDocs = documents.filter(d => {
    if (!isAdmin && !hasVersionVigente(d)) return false;
    return d.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.codigo || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const renderCategoryCard = (cat) => {
    const IconComp = ICON_MAP[cat.icono] || Folder;
    return (
      <motion.div key={cat.id} whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
        transition={{ duration: 0.18 }} className="sgi-category-card"
        onClick={() => navigate(`/sgi/${getCatSlug(cat.nombre)}`)}>
        <div className="sgi-cat-icon" style={{ backgroundColor: cat.color + '18', color: cat.color }}>
          <IconComp size={30} />
        </div>
        <div className="sgi-cat-info">
          <h3>{cat.nombre}</h3>
        </div>
        <div className="sgi-cat-footer">
          <span className="sgi-cat-count">{docCounts[cat.id] || 0} documento{docCounts[cat.id] !== 1 ? 's' : ''}</span>
          <ChevronRight size={18} className="sgi-cat-arrow" />
        </div>
      </motion.div>
    );
  };



  // ── View: Category Home ───────────────────────────────────────────────────
  if (!categoriaSlug) {
    return (
      <div className="sgi-container">
        <div className="sgi-page-header">
          <div className="sgi-header-icon"><ShieldCheck size={28} /></div>
          <div>
            <h2>Sistema de Gestión Integrado</h2>
            <p>Documentación oficial, procedimientos y registros vigentes del SGI</p>
          </div>
        </div>
        {pendientes.length > 0 && (
          <div className="sgi-pendientes-panel">
            <div className="sgi-pendientes-header">
              <Clock size={15} />
              <span>Pendientes de tu acción</span>
              <span className="sgi-pendientes-count">{pendientes.length}</span>
            </div>
            <div className="sgi-pendientes-list">
              {pendientes.map(ver => {
                const IconComp = ICON_MAP[ver.documento?.categoria?.icono] || Folder;
                return (
                  <div
                    key={ver.id}
                    className="sgi-pendiente-row"
                    onClick={() => navigate(`/sgi/documento/${ver.documento?.id}`)}
                  >
                    <div className="sgi-pendiente-cat-icon" style={{ color: ver.documento?.categoria?.color || '#6366f1' }}>
                      <IconComp size={16} />
                    </div>
                    <div className="sgi-pendiente-info">
                      <span className="sgi-pendiente-title">{ver.documento?.titulo || '—'}</span>
                      <span className="sgi-pendiente-meta">
                        Rev. {ver.numero_version} · {ver.documento?.categoria?.nombre || '—'}
                      </span>
                    </div>
                    <span className={`sgi-doc-badge aprobacion-${ver.estado_aprobacion}`}>
                      {ver.estado_aprobacion === 'en_revision' ? 'Revisión CMASS' : 'Aprobar Gerencia'}
                    </span>
                    <ChevronRight size={15} className="sgi-pendiente-arrow" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buscador global */}
        <div className="sgi-global-search-wrap" ref={searchRef}>
          <div className="sgi-global-search-box">
            <Search size={16} className="sgi-global-search-icon" />
            <input
              className="sgi-global-search-input"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              onFocus={() => searchResults.length && setShowSearchDrop(true)}
              placeholder="Buscar por nombre, código o etiqueta..."
            />
            {isSearching && <span className="sgi-global-search-spinner" />}
            {globalSearch && <button className="sgi-global-search-clear" onClick={() => { setGlobalSearch(''); setShowSearchDrop(false); }}><X size={14} /></button>}
          </div>
          <AnimatePresence>
            {showSearchDrop && (
              <motion.div className="sgi-search-dropdown"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}>
                {searchResults.length === 0 ? (
                  <div className="sgi-search-empty">Sin resultados para <strong>"{globalSearch}"</strong></div>
                ) : searchResults.map(doc => {
                  const IconComp = ICON_MAP[doc.categoria?.icono] || Folder;
                  return (
                    <div key={doc.id} className="sgi-search-result-row" onClick={() => { navigate(`/sgi/documento/${doc.id}`); setShowSearchDrop(false); setGlobalSearch(''); }}>
                      <span className="sgi-search-result-icon" style={{ color: doc.categoria?.color || 'var(--primary-color)' }}>
                        <IconComp size={15} />
                      </span>
                      <div className="sgi-search-result-info">
                        <span className="sgi-search-result-title">{doc.titulo}</span>
                        <span className="sgi-search-result-meta">
                          {doc.codigo && <>{doc.codigo} · </>}{doc.categoria?.nombre}
                        </span>
                      </div>
                      {doc.etiquetas?.length > 0 && (
                        <div className="sgi-search-result-tags">
                          {doc.etiquetas.slice(0, 3).map((t, i) => <span key={i} className="sgi-tag-chip">{t}</span>)}
                        </div>
                      )}
                      <ChevronRight size={14} className="sgi-search-result-arrow" />
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isLoading ? (
          <div className="sgi-loading">Cargando carpetas...</div>
        ) : (
          <div className="sgi-categories-grid">
            {categories.filter(c => !c.parent_id).map(renderCategoryCard)}
          </div>
        )}
      </div>
    );
  }

  const parentCategorySlug = currentCategory?.parent_id
    ? getCatSlug(categories.find(c => c.id === currentCategory.parent_id)?.nombre || '')
    : null;

  // ── View: Documents List + Detail Panel ───────────────────────────────────
  return (
    <div className="sgi-container">
      <div className="sgi-page-header">
        <button className="sgi-back-btn" onClick={() => navigate(parentCategorySlug ? `/sgi/${parentCategorySlug}` : '/sgi')}>
          <ChevronLeft size={18} /> Volver
        </button>
        <div className="sgi-header-icon" style={{ backgroundColor: (currentCategory?.color || '#6366f1') + '18', color: currentCategory?.color || '#6366f1' }}>
          {(() => { const I = ICON_MAP[currentCategory?.icono] || Folder; return <I size={24} />; })()}
        </div>
        <div>
          <h2>{currentCategory?.nombre || categoriaSlug}</h2>
          {currentCategory?.descripcion && <p>{currentCategory.descripcion}</p>}
        </div>
        {isAdmin && (
          <button className="btn-sgi-primary" onClick={openNewDoc}>
            <Plus size={16} /> Nuevo documento
          </button>
        )}
      </div>

      <div className="sgi-search-bar">
        <Search size={16} />
        <input type="text" placeholder="Buscar por título o código..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="sgi-content-area">
        <div className="sgi-docs-panel">
          {isLoading ? (
            <div className="sgi-loading">Cargando...</div>
          ) : (
            <>
              {subCategories.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 16 }}>Carpetas internas</h3>
                  <div className="sgi-categories-grid">
                    {subCategories.map(renderCategoryCard)}
                  </div>
                </div>
              )}

              {filteredDocs.length > 0 || subCategories.length === 0 ? (
                <div>
                  <h3 style={{ fontSize: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 16 }}>{filteredDocs.length > 0 ? 'Documentos' : 'Contenido'}</h3>
                  {filteredDocs.length === 0 ? (
                    <div className="sgi-empty">
                      <FileText size={40} />
                      <p>{searchTerm ? 'Sin resultados para tu búsqueda' : 'No hay documentos en esta carpeta'}</p>
                    </div>
                  ) : (
                    <div className="sgi-docs-list">
              {filteredDocs.map((doc) => (
                <motion.div key={doc.id} whileHover={{ x: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  className="sgi-doc-row"
                  onClick={() => navigate(`/sgi/documento/${doc.id}`)}>
                  <div className="sgi-doc-file-icon"><FileText size={20} /></div>
                  <div className="sgi-doc-meta">
                    <div className="sgi-doc-title-row">
                      <span className="sgi-doc-title">{doc.titulo}</span>
                      {doc.codigo && <span className="sgi-doc-code">{doc.codigo}</span>}
                    </div>
                    <div className="sgi-doc-badges">
                      {doc.tipo_documento && <span className="sgi-doc-badge tipo">{doc.tipo_documento}</span>}
                      {doc.documento_controlado && <span className="sgi-doc-badge controlado">Controlado</span>}
                      {doc.versionPendiente && (
                        <span className={`sgi-doc-badge aprobacion-${doc.versionPendiente.estado_aprobacion}`}>
                          {doc.versionPendiente.estado_aprobacion === 'en_revision' ? 'En revisión' : 'Pend. aprobación'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="sgi-doc-right">
                    {doc.versionActual ? (
                      <>
                        <span className="sgi-version-chip vigente">Rev. {doc.versionActual.numero_version}</span>
                        {doc.versionActual.archivo_url && (
                          <button
                            className="sgi-row-dl-btn"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const { data } = await getSgiSignedUrl(doc.versionActual.archivo_url, 60);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }}
                            title="Descargar versión vigente"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="sgi-version-chip none">Sin versión</span>
                    )}
                    {isAdmin && (
                      <div className="sgi-doc-actions" onClick={e => e.stopPropagation()}>
                        <button className="sgi-icon-btn" title="Editar" onClick={() => openEditDoc(doc)}><Edit2 size={14} /></button>
                        <button className="sgi-icon-btn danger" title="Eliminar" onClick={() => handleDeleteDoc(doc.id)}><Trash2 size={14} /></button>
                      </div>
                    )}
                    <ChevronRight size={16} className="sgi-doc-chevron" />
                  </div>
                </motion.div>
              ))}
            </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* ── Modal: Nuevo / Editar documento ── */}
      <AnimatePresence>
        {showDocModal && (
          <div className="sgi-modal-backdrop" onClick={() => setShowDocModal(false)}>
            <motion.div className="sgi-modal sgi-modal-wide"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="sgi-modal-header">
                <h4>{editingDoc ? 'Editar documento' : 'Agregar documento'}</h4>
                <button className="sgi-modal-close" onClick={() => setShowDocModal(false)}><X size={18} /></button>
              </div>
              <div className="sgi-modal-body">
                {/* Sección: Identificación */}
                <div className="sgi-form-section">
                  <div className="sgi-form-section-title">
                    <FileText size={14} />
                    Identificación
                  </div>
                  <div className="sgi-form-two-col">
                    <div className="sgi-form-group">
                      <label>Título <span className="sgi-required">*</span></label>
                      <input value={docForm.titulo} onChange={e => setDocForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título del documento" />
                    </div>
                    <div className="sgi-form-group">
                      <label>Código</label>
                      <input value={docForm.codigo} onChange={e => setDocForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ej: POE-001" />
                    </div>
                    <div className="sgi-form-group">
                      <label>Tipo de documento</label>
                      <select value={docForm.tipo_documento} onChange={e => setDocForm(f => ({ ...f, tipo_documento: e.target.value }))}>
                        <option>Procedimiento</option><option>Manual</option><option>Instructivo</option>
                        <option>Registro</option><option>Formato</option><option>Otro</option>
                      </select>
                    </div>
                    <div className="sgi-form-group">
                      <label>Etiquetas</label>
                      <div className="sgi-tag-input-wrap">
                        {docForm.etiquetas.map((tag, i) => (
                          <span key={i} className="sgi-tag-chip">
                            {tag}
                            <button type="button" onClick={() => setDocForm(f => ({ ...f, etiquetas: f.etiquetas.filter((_, j) => j !== i) }))}>×</button>
                          </span>
                        ))}
                        <input
                          className="sgi-tag-input"
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => {
                            if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                              e.preventDefault();
                              const val = tagInput.trim().toLowerCase();
                              if (!docForm.etiquetas.includes(val))
                                setDocForm(f => ({ ...f, etiquetas: [...f.etiquetas, val] }));
                              setTagInput('');
                            } else if (e.key === 'Backspace' && !tagInput && docForm.etiquetas.length) {
                              setDocForm(f => ({ ...f, etiquetas: f.etiquetas.slice(0, -1) }));
                            }
                          }}
                          placeholder={docForm.etiquetas.length ? '' : 'Escribí y presioná Enter o coma'}
                        />
                      </div>
                    </div>
                    <div className="sgi-form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Descripción</label>
                      <textarea rows={3} value={docForm.descripcion} onChange={e => setDocForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Breve descripción del propósito del documento..." />
                    </div>
                  </div>
                </div>

                {/* Sección: Versión y Control */}
                <div className="sgi-form-section">
                  <div className="sgi-form-section-title">
                    <History size={14} />
                    Versión y Control
                  </div>
                  <div className="sgi-form-three-col">
                    <div className="sgi-form-group">
                      <label>Revisión</label>
                      <input
                        type="number"
                        min="0"
                        value={docForm.numero_version}
                        onChange={e => setDocForm(f => ({ ...f, numero_version: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="sgi-form-group">
                      <label>Fecha de emisión</label>
                      <input type="date" value={docForm.fecha_emision} onChange={e => setDocForm(f => ({ ...f, fecha_emision: e.target.value }))} />
                    </div>
                    <div className="sgi-form-group">
                      <label>Período de Retención</label>
                      <input value={docForm.periodo_retencion} onChange={e => setDocForm(f => ({ ...f, periodo_retencion: e.target.value }))} placeholder="Ej: 5 años" />
                    </div>
                  </div>
                  <div className="sgi-form-group" style={{ marginTop: 12 }}>
                    <label>Histórico / Notas de cambio</label>
                    <textarea rows={3} value={docForm.notas_cambios} onChange={e => setDocForm(f => ({ ...f, notas_cambios: e.target.value }))} placeholder="Describí los cambios introducidos en esta revisión..." />
                  </div>
                </div>

                {/* Sección: Acceso y Aprobación */}
                <div className="sgi-form-section">
                  <div className="sgi-form-section-title">
                    <ShieldCheck size={14} />
                    Acceso y Aprobación
                  </div>
                  <div className="sgi-form-two-col">
                    <div className="sgi-form-group">
                      <label>Acceso</label>
                      <select value={docForm.acceso} onChange={e => setDocForm(f => ({ ...f, acceso: e.target.value }))}>
                        <option>No Confidencial</option><option>Confidencial</option><option>Restringido</option>
                      </select>
                    </div>
                    <div className="sgi-form-group">
                      <label>Documento Controlado</label>
                      <select value={docForm.documento_controlado ? 'si' : 'no'} onChange={e => setDocForm(f => ({ ...f, documento_controlado: e.target.value === 'si' }))}>
                        <option value="no">No requiere aprobación</option>
                        <option value="si">Sí, requiere aprobación</option>
                      </select>
                    </div>
                  </div>
                  {docForm.documento_controlado && (
                    <div className="sgi-approval-notice">
                      <CheckCircle size={15} />
                      <div>
                        <strong>Este documento pasará a revisión.</strong> Al guardar, quedará en estado <em>en revisión</em> hasta que un responsable lo apruebe antes de publicarse como vigente.
                      </div>
                    </div>
                  )}
                </div>

                {/* Sección: Archivo y Ubicación */}
                <div className="sgi-form-section" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                  <div className="sgi-form-section-title">
                    <Download size={14} />
                    Archivo y Ubicación
                  </div>
                  <div className="sgi-form-two-col">
                    <div className="sgi-form-group">
                      <label>Archivo (PDF / Word / Excel)</label>
                      <label className="sgi-file-upload-label">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          onChange={e => setDocForm(f => ({ ...f, _archivo: e.target.files[0] || null }))}
                        />
                        <span className="sgi-file-upload-btn">
                          <Download size={13} /> Elegir archivo
                        </span>
                        <span className="sgi-file-upload-name">
                          {docForm._archivo
                            ? docForm._archivo.name
                            : editingDoc
                              ? 'Dejá vacío para mantener el actual'
                              : 'Ningún archivo seleccionado'}
                        </span>
                      </label>
                    </div>
                    <div className="sgi-form-group">
                      <label>Lugar de Ubicación Física</label>
                      <input value={docForm.lugar_ubicacion} onChange={e => setDocForm(f => ({ ...f, lugar_ubicacion: e.target.value }))} placeholder="Ej: Archivero 3, Cajón B" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="sgi-modal-footer">
                <button className="btn-sgi-secondary" onClick={() => setShowDocModal(false)}>Cancelar</button>
                <button className="btn-sgi-primary" onClick={handleSaveDoc} disabled={isSaving || !docForm.titulo}>
                  <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SGI;
