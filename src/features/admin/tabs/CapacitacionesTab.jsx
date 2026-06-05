import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft, Search, X, GripVertical, Upload, Image as ImageIcon, Eye, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchCursos, fetchCursosCategorias, fetchCursoDetalle, saveCurso, deleteCurso, uploadBannerImage, uploadArchivoBloque } from '../../../services/cursosService';
import { fetchPAF } from '../../../services/pafService';
import { fetchAllUsers, fetchProfileValues } from '../../../services/usuariosService';
import { parseBlocks, updateBlockInList, updateBlockMetaInList } from '../../../lib/blockUtils';
import BlocksEditor from '../shared/BlocksEditor';
import QuizBuilder from '../shared/QuizBuilder';
import CoursePreviewModal from '../shared/CoursePreviewModal';
import { VisibilidadEditor, LoadingSpinner, useToast } from '../../../components/common';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const EMPTY_COURSE = {
  titulo: '',
  descripcion: '',
  duracion_estimada: '1h',
  categoria_id: null,
  imagen_banner: '',
  es_paf: false,
  paf_item_id: null,
};

const CapacitacionesTab = () => {
  const { showToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pafPlanes, setPafPlanes] = useState([]);
  const [pafItems, setPafItems] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [profileValues, setProfileValues] = useState({ job_title: [], department: [], office_location: [] });
  const [isLoading, setIsLoading] = useState(true);

  // List filters
  const [courseSearch, setCourseSearch] = useState('');
  const [courseFilterCat, setCourseFilterCat] = useState('');
  const [courseFilterPaf, setCourseFilterPaf] = useState('');

  // Course editor
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [editingModules, setEditingModules] = useState([]);
  const [editingVisibilidad, setEditingVisibilidad] = useState([]);
  const [editingDestinatarios, setEditingDestinatarios] = useState([]);
  const [editingPreguntas, setEditingPreguntas] = useState([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [destinatariosSearch, setDestinatariosSearch] = useState('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const bannerInputRef = useRef(null);
  const [modDragging, setModDragging] = useState(null);
  const [modDragOver, setModDragOver] = useState(null);
  const [collapsedModules, setCollapsedModules] = useState(new Set());

  const loadData = async () => {
    setIsLoading(true);
    const [cursosRes, catRes, pafRes, usersRes, profileRes] = await Promise.all([
      fetchCursos(),
      fetchCursosCategorias(),
      fetchPAF(),
      fetchAllUsers(),
      fetchProfileValues(),
    ]);
    setCourses(cursosRes.data);
    setCategories(catRes.data);
    setPafPlanes(pafRes.planes);
    setPafItems(pafRes.items);
    setAllUsers(usersRes.data);
    setProfileValues(profileRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const reloadCourses = async () => {
    const { data } = await fetchCursos();
    setCourses(data);
  };

  const handleCreate = () => {
    setEditingData({ ...EMPTY_COURSE, categoria_id: categories[0]?.id || null });
    setEditingModules([]);
    setEditingVisibilidad([]);
    setEditingDestinatarios([]);
    setEditingPreguntas([]);
    setIsEditing(true);
  };

  const handleEdit = async (course) => {
    let pafAnio = null;
    if (course.paf_item_id) {
      const item = pafItems.find(i => i.id === course.paf_item_id);
      if (item) {
        const plan = pafPlanes.find(p => p.id === item.plan_id);
        if (plan) pafAnio = plan.anio;
      }
    }
    setEditingData({ ...course, _paf_anio: pafAnio });
    setIsEditing(true);
    setIsLoadingDetail(true);
    setEditingModules([]);
    setEditingVisibilidad([]);
    setEditingDestinatarios([]);
    setEditingPreguntas([]);
    setDestinatariosSearch('');

    const { modulos, visibilidad, destinatarios } = await fetchCursoDetalle(course.id);
    setEditingModules(modulos);
    setEditingVisibilidad(visibilidad);
    setEditingDestinatarios(destinatarios);
    try {
      setEditingPreguntas(course.cuestionario ? JSON.parse(course.cuestionario) : []);
    } catch { setEditingPreguntas([]); }
    setIsLoadingDetail(false);
  };

  const handleBack = () => {
    setIsEditing(false);
    setEditingData(null);
  };

  const handleSave = async () => {
    if (!editingData.titulo) return;
    setIsSaving(true);
    const coursePayload = { ...editingData };
    delete coursePayload.categoria;
    delete coursePayload._paf_anio;
    coursePayload.cuestionario = JSON.stringify(editingPreguntas);

    const { error } = await saveCurso(coursePayload, editingModules, editingVisibilidad, editingDestinatarios);
    setIsSaving(false);
    if (error) return showToast(error.message, 'error');
    await reloadCourses();
    handleBack();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este curso?')) return;
    await deleteCurso(id);
    await reloadCourses();
  };

  // Banner upload
  const handleBannerFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    const { url, error } = await uploadBannerImage(file);
    setIsUploadingBanner(false);
    if (error) return showToast('Error al subir la imagen: ' + error.message, 'error');
    setEditingData(prev => ({ ...prev, imagen_banner: url }));
  };

  // Module drag & drop
  const handleModDragStart = (idx) => { setModDragging(idx); };
  const handleModDragOver = (e, idx) => { e.preventDefault(); setModDragOver(idx); };
  const handleModDrop = (e, idx) => {
    e.preventDefault();
    if (modDragging === null || modDragging === idx) { setModDragOver(null); return; }
    const reordered = [...editingModules];
    const [moved] = reordered.splice(modDragging, 1);
    reordered.splice(idx, 0, moved);
    setEditingModules(reordered.map((m, i) => ({ ...m, numero_orden: i + 1 })));
    setModDragging(null);
    setModDragOver(null);
  };
  const handleModDragEnd = () => { setModDragging(null); setModDragOver(null); };

  // Module block handlers
  const handleAddBlockToModule = (mIdx, tipo) => {
    const newModules = [...editingModules];
    const currentBlocks = parseBlocks(newModules[mIdx].contenido);
    const newBlock = {
      id: 'b-' + Date.now(),
      tipo,
      contenido: (tipo === 'cards' || tipo === 'timeline' || tipo === 'acordeon') ? '[]' : '',
      metadata: tipo === 'banner' ? { bg_color: '#000000', text_color: '#F2DC00' } : tipo === 'callout' ? { nivel: 'info' } : {}
    };
    newModules[mIdx].contenido = JSON.stringify([...currentBlocks, newBlock]);
    setEditingModules(newModules);
  };

  const updateModuleBlock = (mIdx, bId, field, value) => {
    const newModules = [...editingModules];
    newModules[mIdx].contenido = JSON.stringify(
      updateBlockInList(parseBlocks(newModules[mIdx].contenido), bId, field, value)
    );
    setEditingModules(newModules);
  };

  const updateModuleBlockMeta = (mIdx, bId, key, value) => {
    const newModules = [...editingModules];
    newModules[mIdx].contenido = JSON.stringify(
      updateBlockMetaInList(parseBlocks(newModules[mIdx].contenido), bId, key, value)
    );
    setEditingModules(newModules);
  };

  const removeBlockFromModule = (mIdx, bId) => {
    const newModules = [...editingModules];
    newModules[mIdx].contenido = JSON.stringify(
      parseBlocks(newModules[mIdx].contenido).filter(b => b.id !== bId)
    );
    setEditingModules(newModules);
  };

  const reorderBlocksInModule = (mIdx, newBlocks) => {
    const newModules = [...editingModules];
    newModules[mIdx].contenido = JSON.stringify(newBlocks);
    setEditingModules(newModules);
  };

  const duplicateBlockInModule = (mIdx, bId) => {
    const newModules = [...editingModules];
    const blocks = parseBlocks(newModules[mIdx].contenido);
    const src = blocks.find(b => b.id === bId);
    if (!src) return;
    const copy = { ...src, id: 'b-' + Date.now(), metadata: { ...src.metadata } };
    const idx = blocks.indexOf(src);
    blocks.splice(idx + 1, 0, copy);
    newModules[mIdx].contenido = JSON.stringify(blocks);
    setEditingModules(newModules);
  };

  const duplicateModule = (mIdx) => {
    const src = editingModules[mIdx];
    const copy = { ...src, id: 'temp-' + Date.now(), titulo: src.titulo + ' (copia)', numero_orden: editingModules.length + 1 };
    setEditingModules(prev => [...prev, copy]);
  };

  const toggleCollapseModule = (modId) => {
    setCollapsedModules(prev => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><LoadingSpinner size={28} /></div>;
  }

  // --- LIST VIEW ---
  if (!isEditing) {
    const coursesFiltrados = courses.filter(c => {
      const matchSearch = !courseSearch || c.titulo.toLowerCase().includes(courseSearch.toLowerCase());
      const matchCat = !courseFilterCat || c.categoria_id === courseFilterCat;
      const matchPaf = courseFilterPaf === '' ? true : courseFilterPaf === 'si' ? !!c.es_paf : !c.es_paf;
      return matchSearch && matchCat && matchPaf;
    });

    return (
      <div className="admin-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar curso..."
                value={courseSearch}
                onChange={e => setCourseSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select className="form-control" style={{ width: '200px', fontSize: '13px', padding: '7px 12px' }} value={courseFilterCat} onChange={e => setCourseFilterCat(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select className="form-control" style={{ width: '150px', fontSize: '13px', padding: '7px 12px' }} value={courseFilterPaf} onChange={e => setCourseFilterPaf(e.target.value)}>
                <option value="">PAF: Todas</option>
                <option value="si">Solo PAF</option>
                <option value="no">No PAF</option>
              </select>
              {(courseSearch || courseFilterCat || courseFilterPaf) && (
                <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px', width: 'fit-content' }} onClick={() => { setCourseSearch(''); setCourseFilterCat(''); setCourseFilterPaf(''); }}>
                  <X size={14} /> Limpiar
                </button>
              )}
            </div>
          </div>
          <button className="btn-primary" style={{ flexShrink: 0, alignSelf: 'flex-start' }} onClick={handleCreate}><Plus size={18} /> Nuevo Curso</button>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Título</th><th>Categoría</th><th>PAF</th><th>Duración</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {coursesFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#bbb', padding: '32px' }}>Sin resultados</td></tr>
              ) : coursesFiltrados.map(course => (
                <tr key={course.id}>
                  <td className="font-bold">{course.titulo}</td>
                  <td><span className="badge-category" style={{ backgroundColor: course.categoria?.color }}>{course.categoria?.nombre}</span></td>
                  <td>{course.es_paf
                    ? <span style={{ fontSize: '11px', fontWeight: '700', color: '#4361ee', background: '#e8ecff', borderRadius: '20px', padding: '2px 10px' }}>PAF</span>
                    : <span style={{ fontSize: '11px', color: '#bbb' }}>—</span>}
                  </td>
                  <td>{course.duracion_estimada}</td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => handleEdit(course)}><Edit2 size={16} /></button>
                    <button className="action-btn delete" onClick={() => handleDelete(course.id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- EDITOR VIEW ---
  const saveButton = (
    <button
      className="btn-primary"
      onClick={handleSave}
      disabled={isSaving}
      style={{ opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      {isSaving
        ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" /></svg> Guardando...</>
        : <><Save size={18} /> Publicar Capacitación</>
      }
    </button>
  );

  return (
    <div className="admin-form-section">
      <div className="form-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-back" onClick={handleBack}><ChevronLeft size={20} /></button>
          <h3>{editingData.id ? 'Editar Capacitación' : 'Nueva Capacitación'}</h3>
        </div>
        <div className="form-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowPreview(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              border: '1.5px solid var(--border-color)',
              background: 'var(--bg-card)', color: 'var(--text-main)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <Eye size={15} /> Vista previa
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 10, border: 'none',
              background: isSaving ? '#ccc' : 'var(--primary-color)',
              color: '#000', fontSize: 13, fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: isSaving ? 'none' : '0 2px 8px rgba(0,0,0,0.12)',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
          >
            {isSaving
              ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" /></svg> Guardando...</>
              : <><Save size={15} /> Publicar Capacitación</>
            }
          </button>
        </div>
      </div>

      {isLoadingDetail ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><LoadingSpinner size={28} /></div>
      ) : (
        <div className="edit-card">
          {/* 1. Información General */}
          <h4 className="mb-6" style={{ fontSize: '18px', fontWeight: '800' }}>1. Información General</h4>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label>Título del Curso</label>
            <input
              className="form-control"
              style={{ fontSize: '18px', fontWeight: '700' }}
              value={editingData.titulo}
              onChange={e => setEditingData({ ...editingData, titulo: e.target.value })}
            />
          </div>

          <div className="form-row" style={{ gap: '32px', marginBottom: '32px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Categoría</label>
              <select className="form-control" value={editingData.categoria_id || ''} onChange={e => setEditingData({ ...editingData, categoria_id: e.target.value })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Duración estimada (minutos)</label>
              <input
                type="number"
                className="form-control"
                value={editingData.duracion_estimada?.replace(/[^0-9]/g, '') || ''}
                onChange={e => setEditingData({ ...editingData, duracion_estimada: e.target.value + ' min' })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label>Imagen de Portada</label>
            <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerFileChange} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {editingData.imagen_banner ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={editingData.imagen_banner} alt="portada" style={{ width: 120, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                  <button
                    onClick={() => setEditingData(prev => ({ ...prev, imagen_banner: '' }))}
                    style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                  ><X size={11} /></button>
                </div>
              ) : (
                <div style={{ width: 120, height: 72, borderRadius: 8, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', flexShrink: 0 }}>
                  <ImageIcon size={28} />
                </div>
              )}
              <button
                className="btn-secondary"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploadingBanner}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {isUploadingBanner
                  ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" /></svg> Subiendo...</>
                  : <><Upload size={15} /> {editingData.imagen_banner ? 'Cambiar imagen' : 'Subir imagen'}</>
                }
              </button>
            </div>
          </div>

          <div className="section-divider" style={{ margin: '32px 0 16px 0', borderBottom: '1px solid #f0f0f0' }} />

          {/* 2. PAF */}
          <h4 className="mb-4" style={{ fontSize: '16px', fontWeight: '800' }}>2. Plan Anual de Formación (PAF)</h4>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={!!editingData.es_paf}
                onChange={e => setEditingData({ ...editingData, es_paf: e.target.checked, paf_item_id: e.target.checked ? editingData.paf_item_id : null })}
              />
              Esta capacitación pertenece al PAF
            </label>
          </div>

          {editingData.es_paf && (() => {
            const aniosDisponibles = pafPlanes.map(p => p.anio);
            const anioSeleccionado = editingData._paf_anio || aniosDisponibles[0] || new Date().getFullYear();
            const planActivo = pafPlanes.find(p => p.anio === anioSeleccionado);
            const itemsDelPlan = planActivo ? pafItems.filter(i => i.plan_id === planActivo.id) : [];
            return (
              <div style={{ background: '#f8f9ff', border: '1px solid #e0e4ff', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div className="form-row" style={{ gap: '16px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Año del PAF</label>
                    <select className="form-control" value={anioSeleccionado}
                      onChange={e => setEditingData({ ...editingData, _paf_anio: parseInt(e.target.value), paf_item_id: null })}>
                      {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Capacitación planificada</label>
                    <select className="form-control" value={editingData.paf_item_id || ''}
                      onChange={e => {
                        const itemId = e.target.value || null;
                        const itemSeleccionado = pafItems.find(i => i.id === itemId);
                        setEditingData({
                          ...editingData,
                          paf_item_id: itemId,
                          titulo: itemSeleccionado ? itemSeleccionado.titulo : editingData.titulo
                        });
                      }}>
                      <option value="">-- Seleccionar --</option>
                      {MESES.map((mes, idx) => {
                        const itemsMes = itemsDelPlan.filter(i => i.mes === idx + 1);
                        if (!itemsMes.length) return null;
                        return (
                          <optgroup key={idx} label={mes}>
                            {itemsMes.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                </div>
                {aniosDisponibles.length === 0 && <p className="text-muted text-xs">No hay planes PAF creados. Creá uno desde la pestaña PAF.</p>}
              </div>
            );
          })()}

          <div className="section-divider" style={{ margin: '32px 0 16px 0', borderBottom: '1px solid #f0f0f0' }} />

          {/* 3. Visibilidad */}
          <h4 className="mb-2" style={{ fontSize: '16px', fontWeight: '800' }}>3. Visibilidad</h4>
          <p className="text-muted text-xs mb-4">Sin reglas ni destinatarios, el curso es visible para todos. Con reglas, solo lo ven quienes coincidan. Los destinatarios individuales siempre lo ven, independientemente de las reglas.</p>

          <VisibilidadEditor
            rules={editingVisibilidad}
            onChange={setEditingVisibilidad}
            profileValues={profileValues}
          />

          <div className="section-divider" style={{ margin: '32px 0 24px 0', borderBottom: '1px solid #f0f0f0' }} />

          {/* 3b. Destinatarios individuales */}
          <h4 className="mb-2" style={{ fontSize: '16px', fontWeight: '800' }}>3b. Destinatarios individuales</h4>
          <p className="text-muted text-xs mb-4">Usuarios específicos que verán este curso, independientemente de las reglas de visibilidad.</p>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              className="form-control"
              style={{ padding: '8px 12px' }}
              placeholder="Buscar usuario por nombre o email..."
              value={destinatariosSearch}
              onChange={e => setDestinatariosSearch(e.target.value)}
            />
            {destinatariosSearch.trim().length > 0 && (() => {
              const q = destinatariosSearch.toLowerCase();
              const results = allUsers.filter(u =>
                !editingDestinatarios.some(d => d.user_id === u.id) &&
                (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
              ).slice(0, 6);
              if (results.length === 0) return null;
              return (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, marginTop: 4 }}>
                  {results.map(u => (
                    <div
                      key={u.id}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, borderBottom: '1px solid #f3f4f6' }}
                      onMouseDown={e => {
                        e.preventDefault();
                        setEditingDestinatarios(prev => [...prev, { user_id: u.id, full_name: u.full_name, email: u.email }]);
                        setDestinatariosSearch('');
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {editingDestinatarios.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {editingDestinatarios.map(d => (
                <div key={d.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 20, padding: '4px 10px 4px 12px', fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{d.full_name || d.email}</span>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 0 }}
                    onClick={() => setEditingDestinatarios(prev => prev.filter(x => x.user_id !== d.user_id))}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>Ningún destinatario individual agregado.</p>
          )}

          <div className="section-divider" style={{ margin: '48px 0', borderBottom: '2px solid #f0f0f0' }} />

          {/* 4. Módulos */}
          <div className="flex-between mb-6">
            <h4 style={{ fontSize: '18px', fontWeight: '800' }}>4. Módulos del Curso</h4>
            <button className="btn-secondary" onClick={() => setEditingModules(prev => [...prev, { id: 'temp-' + Date.now(), titulo: 'Nuevo Módulo', contenido: '[]', numero_orden: prev.length + 1 }])}>
              <Plus size={16} /> Nuevo Módulo
            </button>
          </div>
          <p className="text-muted text-sm mb-6">Cada módulo puede contener múltiples bloques de texto, imágenes o videos.</p>

          <div className="modules-list-editor">
            {editingModules.map((mod, mIdx) => (
              <div
                key={mod.id}
                className="module-item-card"
                draggable
                onDragStart={() => handleModDragStart(mIdx)}
                onDragOver={(e) => handleModDragOver(e, mIdx)}
                onDrop={(e) => handleModDrop(e, mIdx)}
                onDragEnd={handleModDragEnd}
                style={{
                  marginBottom: '24px',
                  opacity: modDragging === mIdx ? 0.4 : 1,
                  border: modDragOver === mIdx ? '2px dashed var(--primary-color)' : undefined,
                  transition: 'opacity 0.15s',
                }}
              >
                <div className="module-item-header" style={{ padding: '14px 20px', gap: 8 }}>
                  <GripVertical size={16} style={{ cursor: 'grab', color: '#ccc', flexShrink: 0 }} />
                  <span className="mod-number">{mIdx + 1}</span>
                  <input
                    className="form-control-ghost"
                    style={{ fontSize: '15px', fontWeight: '800', flex: 1 }}
                    value={mod.titulo}
                    onChange={e => {
                      const next = [...editingModules];
                      next[mIdx] = { ...next[mIdx], titulo: e.target.value };
                      setEditingModules(next);
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button title="Duplicar módulo" className="delete-mod" style={{ color: '#94a3b8' }} onClick={() => duplicateModule(mIdx)}><Copy size={15} /></button>
                    <button title="Colapsar/expandir" className="delete-mod" style={{ color: '#94a3b8' }} onClick={() => toggleCollapseModule(mod.id)}>
                      {collapsedModules.has(mod.id) ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                    </button>
                    <button className="delete-mod" onClick={() => setEditingModules(prev => prev.filter(m => m.id !== mod.id))}><Trash2 size={15} /></button>
                  </div>
                </div>
                {!collapsedModules.has(mod.id) && (
                  <>
                    <div style={{ padding: '0 20px 12px' }}>
                      <input
                        className="form-control"
                        style={{ fontSize: 13 }}
                        placeholder="Descripción breve del módulo (visible en el índice)…"
                        value={mod.descripcion || ''}
                        onChange={e => {
                          const next = [...editingModules];
                          next[mIdx] = { ...next[mIdx], descripcion: e.target.value };
                          setEditingModules(next);
                        }}
                      />
                    </div>
                    <div className="module-item-body" style={{ padding: '0 24px 24px' }}>
                      <BlocksEditor
                        blocks={parseBlocks(mod.contenido)}
                        onUpdate={(bId, f, v) => updateModuleBlock(mIdx, bId, f, v)}
                        onUpdateMeta={(bId, k, v) => updateModuleBlockMeta(mIdx, bId, k, v)}
                        onRemove={(bId) => removeBlockFromModule(mIdx, bId)}
                        onAdd={(tipo) => handleAddBlockToModule(mIdx, tipo)}
                        onReorder={(newBlocks) => reorderBlocksInModule(mIdx, newBlocks)}
                        onDuplicate={(bId) => duplicateBlockInModule(mIdx, bId)}
                        onUploadArchivo={uploadArchivoBloque}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 5. Cuestionario */}
          <QuizBuilder preguntas={editingPreguntas} setPreguntas={setEditingPreguntas} />
        </div>
      )}

      {/* Botón guardar al pie */}
      {!isLoadingDetail && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 0 8px' }}>
          {saveButton}
        </div>
      )}

      {showPreview && (
        <CoursePreviewModal
          course={editingData}
          modules={editingModules}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default CapacitacionesTab;
