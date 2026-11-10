import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, BookOpen, ClipboardList, Folder, ChevronRight, ChevronLeft,
  Plus, X, Download, History, CheckCircle, ShieldCheck, Search,
  AlertCircle, Edit2, Trash2, Save, Lock, Unlock, Tag, Clock, FolderPlus, Minus, Paperclip, Upload,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useToast } from '../../contexts/ToastContext';
import {
  fetchSgiCategoriasActivas,
  fetchSgiDocsCounts,
  fetchSgiDocumentosByCategoria,
  fetchVersionVigente,
  saveSgiDocumento,
  saveSgiCategoria,
  uploadSgiArchivo,
  softDeleteSgiDocumento,
  getSgiSignedUrl,
  fetchSgiVersionesPendientes,
  searchSgiDocumentos,
  fetchGerentes,
} from '../../services/sgiService';
import './SGI.css';
import './SGIDocModal.css';
import { Select, SubmitButton, FieldError } from '../../components/common';
import { useRequiredFields } from '../../hooks/useRequiredFields';
import { hoyISO } from '../../lib/fechas';

const ICON_MAP = { FileText, BookOpen, ClipboardList, Folder, ShieldCheck };

const getCatSlug = (nombre) =>
  nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

const EMPTY_DOC_FORM = {
  titulo: '', codigo: '', descripcion: '', categoria_id: '',
  tipo_documento: 'Otro', acceso: 'No Confidencial',
  lugar_ubicacion: '', periodo_retencion: '', etiquetas: [],
  documento_controlado: false, aprobador_id: '',
  numero_version: '0', fecha_emision: '', notas_cambios: '',
  _archivo: null,
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SGI = () => {
  const { categoria: categoriaSlug } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const canUploadSgi = isAdmin || profile?.can_upload_sgi === true;

  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [docCounts, setDocCounts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const [pendientesRaw, setPendientesRaw] = useState([]);
  const [gerentes, setGerentes] = useState([]);

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

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderForm, setFolderForm] = useState({ nombre: '', descripcion: '' });
  const [isSavingFolder, setIsSavingFolder] = useState(false);

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
    const [{ data }, { data: docList }, { data: pendData }, { data: gerentesData }] = await Promise.all([
      fetchSgiCategoriasActivas(),
      fetchSgiDocsCounts(),
      fetchSgiVersionesPendientes(),
      fetchGerentes(),
    ]);
    setPendientesRaw(pendData ?? []);
    setGerentes(gerentesData ?? []);

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
    setDocForm({ ...EMPTY_DOC_FORM, categoria_id: currentCategory?.id || '', fecha_emision: hoyISO() });
    setTagInput('');
    docV.reset();
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
      aprobador_id: doc.aprobador_id || '',
      _ver_id: refVersion?.id || null,
      numero_version: refVersion?.numero_version || '0',
      fecha_emision: refVersion?.fecha_emision || '',
      notas_cambios: refVersion?.notas_cambios || '',
    });
    docV.reset();
    setShowDocModal(true);
  };

  const handleSaveDoc = async () => {
    if (!docForm.titulo || !docForm.categoria_id) return;
    if (docForm.documento_controlado && !docForm.aprobador_id) return;
    setIsSaving(true);
    const docPayload = {
      titulo: docForm.titulo, codigo: docForm.codigo || null, descripcion: docForm.descripcion || null,
      categoria_id: docForm.categoria_id, tipo_documento: docForm.tipo_documento || 'Otro',
      acceso: docForm.acceso || 'No Confidencial', lugar_ubicacion: docForm.lugar_ubicacion || null,
      periodo_retencion: docForm.periodo_retencion || null, etiquetas: docForm.etiquetas.length ? docForm.etiquetas : null,
      documento_controlado: docForm.documento_controlado ?? false,
      aprobador_id: docForm.documento_controlado && docForm.aprobador_id ? docForm.aprobador_id : null,
      activo: true,
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
    if (!(await confirm({ message: '¿Eliminar este documento y todas sus versiones?', destructive: true }))) return;
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
  
  const folderNombre = folderForm.nombre.trim();
  const folderDuplicado = !!folderNombre && categories.some(c => getCatSlug(c.nombre) === getCatSlug(folderNombre));
  const folderV = useRequiredFields([
    { id: 'sgi-folder-nombre', label: 'Nombre', valid: !!folderNombre && !folderDuplicado },
  ]);

  const docV = useRequiredFields([
    { id: 'docm-titulo', label: 'Título', valid: !!docForm.titulo.trim() },
    { id: 'docm-aprob', label: 'Gerente aprobador', valid: !!docForm.aprobador_id, when: docForm.documento_controlado },
  ]);

  // Siguiente código según los existentes en la carpeta (prefijo más usado + número siguiente)
  const codigoSugerido = (() => {
    if (editingDoc || docForm.codigo.trim()) return null;
    const stats = {};
    documents.forEach(d => {
      const m = /^(.*?)(\d+)$/.exec((d.codigo || '').trim());
      if (!m) return;
      const st = (stats[m[1]] ||= { count: 0, max: 0, pad: m[2].length });
      st.count += 1;
      st.max = Math.max(st.max, parseInt(m[2], 10));
      st.pad = Math.max(st.pad, m[2].length);
    });
    const best = Object.entries(stats).sort((a, b) => b[1].count - a[1].count)[0];
    if (!best) return null;
    const [prefijo, { max, pad }] = best;
    const sugerido = `${prefijo}${String(max + 1).padStart(pad, '0')}`;
    return documents.some(d => (d.codigo || '').trim() === sugerido) ? null : sugerido;
  })();

  // Gerentes del mismo departamento que quien carga
  const gerenteSugerido = gerentes.filter(g => g.id !== profile?.id && g.department && g.department === profile?.department);
  const toggleControlado = () => setDocForm(f => {
    const on = !f.documento_controlado;
    const aprobador = on && !f.aprobador_id && gerenteSugerido.length === 1 ? gerenteSugerido[0].id : f.aprobador_id;
    return { ...f, documento_controlado: on, aprobador_id: aprobador };
  });

  const openNewFolder = () => {
    setFolderForm({ nombre: '', descripcion: '' });
    folderV.reset();
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    const nombre = folderNombre;
    // La ruta /sgi/:categoria usa el slug del nombre: debe ser único en todo el árbol
    if (!folderV.isValid || !currentCategory) { folderV.revealAll(); return; }
    setIsSavingFolder(true);
    const { error } = await saveSgiCategoria({
      nombre,
      descripcion: folderForm.descripcion.trim() || null,
      parent_id: currentCategory.id,
      icono: 'Folder',
      color: currentCategory.color,
      orden: subCategories.length + 1,
    });
    setIsSavingFolder(false);
    if (error) {
      toast.error('No se pudo crear la carpeta', { description: error.message });
      return;
    }
    setShowFolderModal(false);
    toast.success(`Carpeta "${nombre}" creada`);
    fetchCategories();
  };

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
        ) : (() => {
          const hasPiramide = categories.some(c => c.nivel_piramide != null);

          if (!hasPiramide) {
            return (
              <div className="sgi-categories-grid">
                {categories.filter(c => !c.parent_id).map(renderCategoryCard)}
              </div>
            );
          }

          // Agrupar por nivel, categorías sin nivel van al final
          const nivelMap = {};
          categories.filter(c => !c.parent_id).forEach(c => {
            const n = c.nivel_piramide ?? 999;
            if (!nivelMap[n]) nivelMap[n] = [];
            nivelMap[n].push(c);
          });
          const niveles = Object.keys(nivelMap).map(Number).sort((a, b) => a - b);

          return (
            <div className="sgi-tree-pyramid">
              {niveles.map((nivel, idx) => (
                <div key={nivel} className="sgi-pyramid-level">
                  {idx > 0 && <div className="sgi-pyramid-hconnector-row"><div className="sgi-pyramid-hline" /></div>}
                  <div className="sgi-pyramid-row" style={{ '--nivel': idx }}>
                    {nivelMap[nivel].map(cat => {
                      const IconComp = ICON_MAP[cat.icono] || Folder;
                      return (
                        <motion.div
                          key={cat.id}
                          className="sgi-pyramid-card"
                          style={{ '--cat-color': cat.color }}
                          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
                          transition={{ duration: 0.15 }}
                          onClick={() => navigate(`/sgi/${getCatSlug(cat.nombre)}`)}
                        >
                          <div className="sgi-pyramid-card-icon" style={{ background: cat.color + '18', color: cat.color }}>
                            <IconComp size={20} />
                          </div>
                          <div className="sgi-pyramid-card-body">
                            <span className="sgi-pyramid-card-name">{cat.nombre}</span>
                            <span className="sgi-pyramid-card-count">{docCounts[cat.id] || 0} doc{docCounts[cat.id] !== 1 ? 's' : ''}</span>
                          </div>
                          <ChevronRight size={13} className="sgi-pyramid-card-arrow" />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
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
        {(canUploadSgi || isAdmin) && (
          <div className="sgi-header-actions">
            {isAdmin && currentCategory && (
              <button className="btn-sgi-secondary" onClick={openNewFolder}>
                <FolderPlus size={16} /> Nueva carpeta
              </button>
            )}
            {canUploadSgi && (
              <button className="btn-sgi-primary" onClick={openNewDoc}>
                <Plus size={16} /> Nuevo documento
              </button>
            )}
          </div>
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
                    {canUploadSgi && (
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
          <motion.div
            className="docm-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={e => { if (e.target === e.currentTarget) setShowDocModal(false); }}
          >
            <motion.div
              className="docm"
              role="dialog" aria-modal="true" aria-labelledby="docm-title"
              initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}
              onKeyDown={e => { if (e.key === 'Escape' && !e.defaultPrevented) setShowDocModal(false); }}
            >
              <header className="docm-header">
                <div>
                  <nav className="docm-crumb" aria-label="Ubicación">
                    <span>{currentCategory?.nombre || 'Documentos'}</span>
                    <ChevronRight size={12} strokeWidth={1.5} aria-hidden="true" />
                    <span>{editingDoc ? 'Editar' : 'Nuevo'}</span>
                  </nav>
                  <h2 id="docm-title" className="docm-title">{editingDoc ? 'Editar documento' : 'Agregar documento'}</h2>
                  <p className="docm-subtitle">
                    {editingDoc
                      ? 'Actualizá la información del documento.'
                      : 'Completá la información para registrar un nuevo documento controlado.'}
                  </p>
                </div>
                <button type="button" className="docm-close" aria-label="Cerrar" onClick={() => setShowDocModal(false)}>
                  <X size={18} strokeWidth={1.5} />
                </button>
              </header>

              <div className="docm-body">
                {/* Identificación */}
                <section className="docm-section" aria-labelledby="docm-sec-id">
                  <h3 id="docm-sec-id" className="docm-section-label"><FileText size={14} strokeWidth={1.5} /> Identificación</h3>
                  <div className="docm-grid">
                    <div className="docm-field docm-span-6">
                      <label htmlFor="docm-titulo">Título <span className="docm-req" aria-hidden="true">*</span></label>
                      <input id="docm-titulo" autoFocus required aria-required="true" {...docV.fieldProps('docm-titulo')} value={docForm.titulo} onChange={e => setDocForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título del documento" />
                      <FieldError show={docV.isInvalid('docm-titulo')}>Ingresá un título</FieldError>
                    </div>
                    <div className="docm-field docm-span-6">
                      <label htmlFor="docm-codigo">Código</label>
                      <input id="docm-codigo" value={docForm.codigo} onChange={e => setDocForm(f => ({ ...f, codigo: e.target.value }))} placeholder={codigoSugerido ? `Ej: ${codigoSugerido}` : 'Ej: POE-001'} />
                      {codigoSugerido && (
                        <button type="button" className="docm-suggest" onClick={() => setDocForm(f => ({ ...f, codigo: codigoSugerido }))}>
                          Usar <span>{codigoSugerido}</span>
                        </button>
                      )}
                    </div>
                    <div className="docm-field docm-span-6">
                      <label id="docm-tipo-label">Tipo de documento</label>
                      <Select
                        className="docm-select"
                        panelClassName="docm-select-panel"
                        value={docForm.tipo_documento}
                        onChange={v => setDocForm(f => ({ ...f, tipo_documento: v }))}
                        options={['Procedimiento', 'Manual', 'Instructivo', 'Registro', 'Formato', 'Programa', 'Estándar', 'Otro']}
                        aria-label="Tipo de documento"
                      />
                    </div>
                    <div className="docm-field docm-span-6">
                      <label htmlFor="docm-tags">Etiquetas</label>
                      <div className="docm-tags">
                        {docForm.etiquetas.map((tag, i) => (
                          <span key={i} className="docm-chip">
                            {tag}
                            <button type="button" aria-label={`Quitar etiqueta ${tag}`} onClick={() => setDocForm(f => ({ ...f, etiquetas: f.etiquetas.filter((_, j) => j !== i) }))}>
                              <X size={11} strokeWidth={2} />
                            </button>
                          </span>
                        ))}
                        <input
                          id="docm-tags"
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
                    <div className="docm-field docm-span-12">
                      <label htmlFor="docm-desc">Descripción</label>
                      <textarea id="docm-desc" value={docForm.descripcion} onChange={e => setDocForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Breve descripción del propósito del documento..." />
                      <span className="docm-counter" aria-hidden="true">{(docForm.descripcion || '').length} caracteres</span>
                    </div>
                  </div>
                </section>

                {/* Versión y control */}
                <section className="docm-section" aria-labelledby="docm-sec-ver">
                  <h3 id="docm-sec-ver" className="docm-section-label"><History size={14} strokeWidth={1.5} /> Versión y control</h3>
                  <div className="docm-grid">
                    <div className="docm-field docm-span-4">
                      <label htmlFor="docm-rev">Revisión</label>
                      <div className="docm-stepper">
                        <button type="button" aria-label="Restar revisión" onClick={() => setDocForm(f => ({ ...f, numero_version: String(Math.max(0, (parseInt(f.numero_version, 10) || 0) - 1)) }))}>
                          <Minus size={14} strokeWidth={1.5} />
                        </button>
                        <input id="docm-rev" type="number" min="0" inputMode="numeric" value={docForm.numero_version} onChange={e => setDocForm(f => ({ ...f, numero_version: e.target.value }))} placeholder="0" />
                        <button type="button" aria-label="Sumar revisión" onClick={() => setDocForm(f => ({ ...f, numero_version: String((parseInt(f.numero_version, 10) || 0) + 1) }))}>
                          <Plus size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    <div className="docm-field docm-span-4">
                      <label htmlFor="docm-fecha">Fecha de emisión</label>
                      <input id="docm-fecha" type="date" value={docForm.fecha_emision} onChange={e => setDocForm(f => ({ ...f, fecha_emision: e.target.value }))} />
                    </div>
                    <div className="docm-field docm-span-4">
                      <label htmlFor="docm-ret">Período de retención</label>
                      <input id="docm-ret" value={docForm.periodo_retencion} onChange={e => setDocForm(f => ({ ...f, periodo_retencion: e.target.value }))} placeholder="Ej: 5 años" />
                    </div>
                    <div className="docm-field docm-span-12">
                      <label htmlFor="docm-notas">Histórico / Notas de cambio</label>
                      <textarea id="docm-notas" value={docForm.notas_cambios} onChange={e => setDocForm(f => ({ ...f, notas_cambios: e.target.value }))} placeholder="Describí los cambios introducidos en esta revisión..." />
                      <span className="docm-counter" aria-hidden="true">{(docForm.notas_cambios || '').length} caracteres</span>
                    </div>
                  </div>
                </section>

                {/* Acceso y aprobación */}
                <section className="docm-section" aria-labelledby="docm-sec-acc">
                  <h3 id="docm-sec-acc" className="docm-section-label"><ShieldCheck size={14} strokeWidth={1.5} /> Acceso y aprobación</h3>
                  <div className="docm-grid">
                    <div className="docm-field docm-span-12">
                      <span className="docm-label" id="docm-acceso-label">Acceso</span>
                      <div className="docm-segmented" role="radiogroup" aria-labelledby="docm-acceso-label">
                        {['No Confidencial', 'Confidencial', 'Restringido'].map(opt => (
                          <label key={opt} className={`docm-segment${docForm.acceso === opt ? ' active' : ''}`}>
                            <input
                              type="radio"
                              name="docm-acceso"
                              value={opt}
                              checked={docForm.acceso === opt}
                              onChange={() => setDocForm(f => ({ ...f, acceso: opt }))}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="docm-field docm-span-12">
                      <div className="docm-switch-row">
                        <div>
                          <span className="docm-switch-title" id="docm-ctrl-label">Documento controlado</span>
                          <span className="docm-switch-desc" id="docm-ctrl-desc">Sujeto a control de versiones y aprobación.</span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={docForm.documento_controlado}
                          aria-labelledby="docm-ctrl-label"
                          aria-describedby="docm-ctrl-desc"
                          className={`docm-switch${docForm.documento_controlado ? ' on' : ''}`}
                          onClick={toggleControlado}
                        >
                          <span className="docm-switch-thumb" />
                        </button>
                      </div>
                    </div>
                    {docForm.documento_controlado && (
                      <>
                        <div className="docm-field docm-span-12">
                          <label id="docm-aprob-label">Gerente aprobador <span className="docm-req" aria-hidden="true">*</span></label>
                          <Select
                            id="docm-aprob"
                            className="docm-select"
                            panelClassName="docm-select-panel"
                            value={docForm.aprobador_id}
                            onChange={v => { setDocForm(f => ({ ...f, aprobador_id: v })); docV.touch('docm-aprob'); }}
                            error={docV.isInvalid('docm-aprob')}
                            placeholder="Seleccionar gerente"
                            options={gerentes.map(g => ({
                              value: g.id,
                              label: `${g.full_name}${g.department ? ` (${g.department})` : ''}`,
                              description: gerenteSugerido.some(x => x.id === g.id) ? 'Gerente de tu área' : undefined,
                            }))}
                            aria-label="Gerente aprobador"
                          />
                          <FieldError show={docV.isInvalid('docm-aprob')}>Requerido para documentos controlados</FieldError>
                        </div>
                        <div className="docm-span-12 docm-notice">
                          <CheckCircle size={16} strokeWidth={1.5} />
                          <p>
                            <strong>Este documento pasará a revisión.</strong> Al guardar, quedará <em>en revisión</em> hasta que CMASS lo revise y lo derive al gerente seleccionado para su aprobación.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* Archivo y ubicación */}
                <section className="docm-section" aria-labelledby="docm-sec-file">
                  <h3 id="docm-sec-file" className="docm-section-label"><Paperclip size={14} strokeWidth={1.5} /> Archivo y ubicación</h3>
                  <div className="docm-grid">
                    <div className="docm-field docm-span-6">
                      <label htmlFor="docm-file">Archivo (PDF / Word / Excel)</label>
                      <label className="docm-file">
                        <input
                          id="docm-file"
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          onChange={e => setDocForm(f => ({ ...f, _archivo: e.target.files[0] || null }))}
                        />
                        <span className="docm-file-btn"><Upload size={14} strokeWidth={1.5} /> Elegir archivo</span>
                        <span className="docm-file-name">
                          {docForm._archivo
                            ? docForm._archivo.name
                            : editingDoc
                              ? 'Dejá vacío para mantener el actual'
                              : 'Ningún archivo seleccionado'}
                        </span>
                      </label>
                    </div>
                    <div className="docm-field docm-span-6">
                      <label htmlFor="docm-lugar">Lugar de ubicación física</label>
                      <input id="docm-lugar" value={docForm.lugar_ubicacion} onChange={e => setDocForm(f => ({ ...f, lugar_ubicacion: e.target.value }))} placeholder="Ej: Archivero 3, Cajón B" />
                    </div>
                  </div>
                </section>
              </div>

              <footer className="docm-footer">
                <span className="docm-footer-note">Los campos con <span className="docm-req">*</span> son obligatorios</span>
                <div className="docm-footer-actions">
                  <button type="button" className="docm-btn docm-btn-secondary" onClick={() => setShowDocModal(false)}>Cancelar</button>
                  <SubmitButton className="docm-btn docm-btn-primary" missing={docV.missing} onMissing={docV.revealAll} onClick={handleSaveDoc} saving={isSaving}>
                    <Save size={16} strokeWidth={1.5} /> Guardar documento
                  </SubmitButton>
                </div>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Nueva carpeta ── */}
      <AnimatePresence>
        {showFolderModal && (
          <motion.div
            className="docm-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={e => { if (e.target === e.currentTarget) setShowFolderModal(false); }}
          >
            <motion.div
              className="docm docm-sm"
              role="dialog" aria-modal="true" aria-labelledby="sgi-folder-title"
              initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}
              onKeyDown={e => { if (e.key === 'Escape' && !e.defaultPrevented) setShowFolderModal(false); }}
            >
              <header className="docm-header">
                <div>
                  <nav className="docm-crumb" aria-label="Ubicación">
                    <span>{currentCategory?.nombre || 'SGI'}</span>
                    <ChevronRight size={12} strokeWidth={1.5} aria-hidden="true" />
                    <span>Nueva carpeta</span>
                  </nav>
                  <h2 id="sgi-folder-title" className="docm-title">Nueva carpeta</h2>
                  <p className="docm-subtitle">Se creará dentro de <strong>{currentCategory?.nombre}</strong>.</p>
                </div>
                <button type="button" className="docm-close" aria-label="Cerrar" onClick={() => setShowFolderModal(false)}>
                  <X size={18} strokeWidth={1.5} />
                </button>
              </header>
              <form className="docm-form" onSubmit={e => { e.preventDefault(); handleSaveFolder(); }}>
                <div className="docm-body">
                  <section className="docm-section" aria-labelledby="sgi-folder-sec">
                    <h3 id="sgi-folder-sec" className="docm-section-label"><Folder size={14} strokeWidth={1.5} /> Datos de la carpeta</h3>
                    <div className="docm-grid">
                      <div className="docm-field docm-span-12">
                        <label htmlFor="sgi-folder-nombre">Nombre <span className="docm-req" aria-hidden="true">*</span></label>
                        <input
                          id="sgi-folder-nombre"
                          autoFocus
                          required
                          aria-required="true"
                          {...folderV.fieldProps('sgi-folder-nombre')}
                          aria-invalid={folderDuplicado || folderV.isInvalid('sgi-folder-nombre') || undefined}
                          value={folderForm.nombre}
                          onChange={e => setFolderForm(f => ({ ...f, nombre: e.target.value }))}
                          placeholder="Ej: Procedimientos de Obra"
                          maxLength={80}
                        />
                        <FieldError show={folderDuplicado}>Ya existe una carpeta con ese nombre</FieldError>
                        <FieldError show={!folderDuplicado && folderV.isInvalid('sgi-folder-nombre')}>Ingresá un nombre</FieldError>
                      </div>
                      <div className="docm-field docm-span-12">
                        <label htmlFor="sgi-folder-desc">Descripción</label>
                        <input
                          id="sgi-folder-desc"
                          value={folderForm.descripcion}
                          onChange={e => setFolderForm(f => ({ ...f, descripcion: e.target.value }))}
                          placeholder="Opcional"
                          maxLength={160}
                        />
                      </div>
                    </div>
                  </section>
                </div>
                <footer className="docm-footer">
                  <span className="docm-footer-note">Los campos con <span className="docm-req">*</span> son obligatorios</span>
                  <div className="docm-footer-actions">
                    <button type="button" className="docm-btn docm-btn-secondary" onClick={() => setShowFolderModal(false)}>Cancelar</button>
                    <SubmitButton className="docm-btn docm-btn-primary" missing={folderV.missing} onMissing={folderV.revealAll} onClick={handleSaveFolder} saving={isSavingFolder} savingLabel="Creando...">
                      <FolderPlus size={16} strokeWidth={1.5} /> Crear carpeta
                    </SubmitButton>
                  </div>
                </footer>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SGI;
