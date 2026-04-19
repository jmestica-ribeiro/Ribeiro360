import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Filter, BookOpen, Briefcase, Users, LayoutDashboard, LayoutGrid, Settings, GripVertical, Save, X, Type, Image as ImageIcon, Video, Square, FileText, CreditCard, ListOrdered, GraduationCap, Award, Rocket, Heart, Coffee, HelpCircle, Bell, Star, Info, Clock, MapPin, ChevronLeft, ChevronUp, ChevronDown, Calendar, MessageCircle, ShieldCheck, Folder, CheckCircle, ChevronRight, Download, FolderPlus, FilePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './AdminPanel.css';

const ALL_TABS = ['capacitaciones', 'paf', 'onboarding', 'eventos', 'faq', 'organigrama', 'sgi', 'novedades'];

const AdminPanel = () => {
  const { profile: currentUserProfile } = useAuth();
  const isSuperAdmin = currentUserProfile?.role === 'superadmin';
  const allowedTabs = isSuperAdmin ? ALL_TABS : (currentUserProfile?.admin_tabs ?? ALL_TABS);

  const [activeTab, setActiveTab] = useState(() => allowedTabs[0] ?? 'onboarding');
  const [isLoading, setIsLoading] = useState(true);

  // Users management (superadmin only)
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // States for Onboarding
  const [steps, setSteps] = useState([]);
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [editingStepData, setEditingStepData] = useState(null);
  const [editingBlocks, setEditingBlocks] = useState([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  // States for FAQ
  const [faqPreguntas, setFaqPreguntas] = useState([]);
  const [faqSectores, setFaqSectores] = useState([]);
  const [isEditingFaq, setIsEditingFaq] = useState(false);
  const [editingFaqData, setEditingFaqData] = useState(null);

  // States for Organigrama
  const [orgNodos, setOrgNodos] = useState([]);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editingOrgData, setEditingOrgData] = useState(null);

  // States for SGI
  const [sgiCategorias, setSgiCategorias] = useState([]);
  const [sgiDocumentos, setSgiDocumentos] = useState([]);
  const [sgiVersiones, setSgiVersiones] = useState([]);
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedDocs, setExpandedDocs] = useState({});
  const [sgiEditMode, setSgiEditMode] = useState(null); // null | 'cat' | 'doc' | 'ver'
  const [editingSgiCat, setEditingSgiCat] = useState(null);
  const [editingSgiDoc, setEditingSgiDoc] = useState(null);
  const [editingSgiVer, setEditingSgiVer] = useState(null);

  // States for Eventos
  const [eventos, setEventos] = useState([]);
  const [eventosCategorias, setEventosCategorias] = useState([]);
  const [areas, setAreas] = useState([]);
  const [isEditingEvento, setIsEditingEvento] = useState(false);
  const [editingEventoData, setEditingEventoData] = useState(null);

  // States for Courses (Capacitaciones)
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseFilterCat, setCourseFilterCat] = useState('');
  const [courseFilterPaf, setCourseFilterPaf] = useState('');
  const [editingCourseData, setEditingCourseData] = useState(null);
  const [editingModules, setEditingModules] = useState([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [editingVisibilidadCurso, setEditingVisibilidadCurso] = useState([]);
  const [editingVisibilidadEvento, setEditingVisibilidadEvento] = useState([]);
  const [editingDestinatariosCurso, setEditingDestinatariosCurso] = useState([]); // [{ user_id, full_name, email }]
  const [destinatariosSearch, setDestinatariosSearch] = useState('');
  const [editingPreguntas, setEditingPreguntas] = useState([]);
  const [profileValues, setProfileValues] = useState({ job_title: [], department: [], office_location: [] });

  // States for Novedades
  const [novedades, setNovedades] = useState([]);
  const [novedadUploading, setNovedadUploading] = useState(false);
  const [novedadForm, setNovedadForm] = useState({ titulo: '', link_url: '', activo: true, fecha_hasta: '' });
  const [novedadFile, setNovedadFile] = useState(null);
  const novedadFileRef = React.useRef(null);

  // States for PAF (Plan Anual de Formación)
  const [pafPlanes, setPafPlanes] = useState([]);
  const [pafItems, setPafItems] = useState([]);
  const [selectedPafAnio, setSelectedPafAnio] = useState(new Date().getFullYear());
  const [editingPafItem, setEditingPafItem] = useState(null); // { id?, plan_id, mes, titulo, descripcion, orden }
  const [pafNewAnio, setPafNewAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSteps();
    fetchCourses();
    fetchCategories();
    fetchEventos();
    fetchEventosCategorias();
    fetchAreas();
    fetchFaq();
    fetchFaqSectores();
    fetchOrgNodos();
    fetchSGI();
    fetchProfileValues();
    fetchPAF();
  }, []);

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, admin_tabs')
      .not('full_name', 'is', null)
      .order('full_name');
    if (data) setAllUsers(data);
    setLoadingUsers(false);
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    await supabase.rpc('admin_update_user_role', {
      target_user_id: userId,
      new_role: newRole,
      new_admin_tabs: allUsers.find(u => u.id === userId)?.admin_tabs ?? null,
    });
    fetchAllUsers();
  };

  const handleUpdateUserTabs = async (userId, tabs) => {
    const currentRole = allUsers.find(u => u.id === userId)?.role ?? 'user';
    await supabase.rpc('admin_update_user_role', {
      target_user_id: userId,
      new_role: currentRole,
      new_admin_tabs: tabs.length > 0 ? tabs : null,
    });
    fetchAllUsers();
  };

  const fetchProfileValues = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('job_title, department, office_location')
      .not('full_name', 'is', null);
    if (data?.length) {
      setProfileValues({
        job_title: [...new Set(data.map(p => p.job_title).filter(Boolean))].sort(),
        department: [...new Set(data.map(p => p.department).filter(Boolean))].sort(),
        office_location: [...new Set(data.map(p => p.office_location).filter(Boolean))].sort(),
      });
    }
  };

  // --- PAF ---
  const fetchPAF = async () => {
    const [planesRes, itemsRes] = await Promise.all([
      supabase.from('paf_planes').select('*').order('anio', { ascending: false }),
      supabase.from('paf_items').select('*').order('mes').order('orden')
    ]);
    if (planesRes.data) setPafPlanes(planesRes.data);
    if (itemsRes.data) setPafItems(itemsRes.data);
  };

  const getPafPlanForAnio = (anio) => pafPlanes.find(p => p.anio === anio) || null;

  const handleCreatePafPlan = async (anio) => {
    if (pafPlanes.find(p => p.anio === anio)) return alert('Ya existe un plan para ese año.');
    const { error } = await supabase.from('paf_planes').insert({ anio });
    if (error) return alert(error.message);
    await fetchPAF();
    setSelectedPafAnio(anio);
  };

  const handleSavePafItem = async () => {
    if (!editingPafItem?.titulo) return;
    const plan = getPafPlanForAnio(selectedPafAnio);
    if (!plan) return alert('No existe un plan para este año.');
    const payload = {
      plan_id: plan.id,
      mes: editingPafItem.mes,
      titulo: editingPafItem.titulo,
      descripcion: editingPafItem.descripcion || '',
      orden: editingPafItem.orden || 0,
      categoria_id: editingPafItem.categoria_id || null,
    };
    if (editingPafItem.id) {
      await supabase.from('paf_items').update(payload).eq('id', editingPafItem.id);
    } else {
      await supabase.from('paf_items').insert(payload);
    }
    await fetchPAF();
    setEditingPafItem(null);
  };

  const handleDeletePafItem = async (id) => {
    if (!window.confirm('¿Eliminar esta capacitación del plan?')) return;
    await supabase.from('paf_items').delete().eq('id', id);
    await fetchPAF();
  };

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // --- FETCHING ---
  const fetchSteps = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('onboarding_steps').select('*').order('numero_orden', { ascending: true });
      if (!error) setSteps(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.from('cursos').select('*, categoria:cursos_categorias(nombre, color)').order('created_at', { ascending: false });
      if (!error) setCourses(data || []);
    } catch(err) { console.error(err); }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('cursos_categorias').select('*');
    if (data) setCategories(data);
  };

  // --- FAQ FETCHING & LOGIC ---
  const fetchFaq = async () => {
    const { data } = await supabase.from('faq_preguntas').select('*, sector:faq_sectores(nombre, color)').order('sector_id').order('numero_orden');
    if (data) setFaqPreguntas(data);
  };

  const fetchFaqSectores = async () => {
    const { data } = await supabase.from('faq_sectores').select('*').order('nombre');
    if (data) setFaqSectores(data);
  };

  // --- ORGANIGRAMA ---
  const fetchOrgNodos = async () => {
    const { data } = await supabase.from('organigrama_nodos').select('*').order('numero_orden');
    if (data) setOrgNodos(data);
  };

  const handleCreateOrg = () => {
    setEditingOrgData({ nombre: '', cargo: '', area: '', area_color: '#cccccc', parent_id: null, foto_url: '', numero_orden: 0, activo: true });
    setIsEditingOrg(true);
  };

  const handleEditOrg = (nodo) => {
    setEditingOrgData({ ...nodo });
    setIsEditingOrg(true);
  };

  const handleSaveOrg = async () => {
    const payload = {
      nombre: editingOrgData.nombre,
      cargo: editingOrgData.cargo,
      area: editingOrgData.area || null,
      area_color: editingOrgData.area_color || '#cccccc',
      parent_id: editingOrgData.parent_id || null,
      foto_url: editingOrgData.foto_url || null,
      numero_orden: parseInt(editingOrgData.numero_orden) || 0,
      activo: editingOrgData.activo,
    };
    if (editingOrgData.id) {
      await supabase.from('organigrama_nodos').update(payload).eq('id', editingOrgData.id);
    } else {
      await supabase.from('organigrama_nodos').insert(payload);
    }
    await fetchOrgNodos();
    setIsEditingOrg(false);
    setEditingOrgData(null);
  };

  const handleDeleteOrg = async (id) => {
    await supabase.from('organigrama_nodos').delete().eq('id', id);
    await fetchOrgNodos();
  };

  const renderOrganigramaTab = () => {
    if (isEditingOrg) {
      const parents = orgNodos.filter(n => n.id !== editingOrgData?.id);
      return (
        <div className="edit-card">
          <div className="form-header">
            <button className="btn-back" onClick={() => { setIsEditingOrg(false); setEditingOrgData(null); }}>
              <ChevronLeft size={18} /> Volver
            </button>
            <h3>{editingOrgData?.id ? 'Editar nodo' : 'Nuevo nodo'}</h3>
          </div>
          <div className="form-body">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre / Área *</label>
                <input className="form-control" value={editingOrgData.nombre} onChange={e => setEditingOrgData(d => ({ ...d, nombre: e.target.value }))} placeholder="Ej: María García" />
              </div>
              <div className="form-group">
                <label>Cargo *</label>
                <input className="form-control" value={editingOrgData.cargo} onChange={e => setEditingOrgData(d => ({ ...d, cargo: e.target.value }))} placeholder="Ej: Gerente RRHH" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Área / Sector</label>
                <input className="form-control" value={editingOrgData.area} onChange={e => setEditingOrgData(d => ({ ...d, area: e.target.value }))} placeholder="Ej: Recursos Humanos" />
              </div>
              <div className="form-group" style={{ maxWidth: 120 }}>
                <label>Color de área</label>
                <input type="color" className="form-control" style={{ height: 42, padding: 4, cursor: 'pointer' }} value={editingOrgData.area_color} onChange={e => setEditingOrgData(d => ({ ...d, area_color: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Reporta a (nodo padre)</label>
                <select className="form-control" value={editingOrgData.parent_id || ''} onChange={e => setEditingOrgData(d => ({ ...d, parent_id: e.target.value || null }))}>
                  <option value="">— Sin padre (raíz) —</option>
                  {parents.map(n => (
                    <option key={n.id} value={n.id}>{n.nombre} — {n.cargo}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Orden</label>
                <input type="number" className="form-control" value={editingOrgData.numero_orden} onChange={e => setEditingOrgData(d => ({ ...d, numero_orden: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>URL de foto</label>
              <input className="form-control" value={editingOrgData.foto_url || ''} onChange={e => setEditingOrgData(d => ({ ...d, foto_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={editingOrgData.activo} onChange={e => setEditingOrgData(d => ({ ...d, activo: e.target.checked }))} style={{ marginRight: 8 }} />
                Activo (visible en el organigrama)
              </label>
            </div>
            <button className="btn-primary" onClick={handleSaveOrg} disabled={!editingOrgData.nombre || !editingOrgData.cargo}>
              <Save size={16} /> Guardar nodo
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="admin-list-panel">
        <div className="admin-list-header">
          <span className="admin-count">{orgNodos.length} nodos</span>
          <button className="btn-add-admin" onClick={handleCreateOrg}><Plus size={16} /> Nuevo nodo</button>
        </div>
        {orgNodos.length === 0 ? (
          <div className="admin-empty">No hay nodos todavía.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orgNodos.map(nodo => {
              const padre = orgNodos.find(n => n.id === nodo.parent_id);
              return (
                <div key={nodo.id} className="evento-item" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: nodo.area_color || '#ccc', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="evento-titulo">{nodo.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {nodo.cargo}{padre ? ` · Reporta a: ${padre.nombre}` : ' · Raíz'}{!nodo.activo ? ' · Inactivo' : ''}
                    </div>
                  </div>
                  <div className="admin-item-actions">
                    <button className="btn-icon-admin" onClick={() => handleEditOrg(nodo)}><Edit2 size={14} /></button>
                    <button className="btn-icon-admin danger" onClick={() => handleDeleteOrg(nodo.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── SGI ──────────────────────────────────────────────────────────────────
  const fetchSGI = async () => {
    const [catsRes, docsRes, versRes] = await Promise.all([
      supabase.from('sgi_categorias').select('*').order('orden'),
      supabase.from('sgi_documentos').select('*').eq('activo', true).order('codigo'),
      supabase.from('sgi_versiones').select('*').order('numero_version', { ascending: true }),
    ]);
    if (catsRes.error) console.error("catsRes Error:", catsRes.error);
    if (docsRes.error) console.error("docsRes Error:", docsRes.error);
    if (versRes.error) console.error("versRes Error:", versRes.error);
    
    if (catsRes.data) setSgiCategorias(catsRes.data);
    if (docsRes.data) setSgiDocumentos(docsRes.data);
    if (versRes.data) setSgiVersiones(versRes.data);
  };

  const closeSgiEdit = () => { setSgiEditMode(null); setEditingSgiCat(null); setEditingSgiDoc(null); setEditingSgiVer(null); };

  const handleSaveSgiCat = async () => {
    if (!editingSgiCat.nombre) return;
    const payload = { 
      nombre: editingSgiCat.nombre, 
      icono: editingSgiCat.icono || 'Folder', 
      color: editingSgiCat.color || '#6366f1', 
      descripcion: editingSgiCat.descripcion || null, 
      orden: parseInt(editingSgiCat.orden) || 0, 
      activo: editingSgiCat.activo ?? true,
      parent_id: editingSgiCat.parent_id || null 
    };
    if (editingSgiCat.id) await supabase.from('sgi_categorias').update(payload).eq('id', editingSgiCat.id);
    else await supabase.from('sgi_categorias').insert(payload);
    await fetchSGI();
    closeSgiEdit();
  };

  const handleDeleteSgiCat = async (id) => {
    if (!confirm('¿Eliminar esta categoría y todos sus documentos?')) return;
    await supabase.from('sgi_categorias').delete().eq('id', id);
    await fetchSGI();
  };

  const handleCreateSgiDoc = (categoriaId) => {
    setEditingSgiDoc({
      titulo: '', codigo: '', descripcion: '', categoria_id: categoriaId,
      tipo_documento: 'Otro', acceso: 'No Confidencial', lugar_ubicacion: '',
      periodo_retencion: '', etiquetas: '', documento_controlado: false,
      _ver_id: null, numero_version: '0', fecha_emision: new Date().toISOString().split('T')[0], notas_cambios: '',
    });
    setSgiEditMode('doc');
  };

  const handleEditSgiDoc = async (doc) => {
    const { data: vigente } = await supabase.from('sgi_versiones').select('*').eq('documento_id', doc.id).eq('vigente', true).maybeSingle();
    setEditingSgiDoc({
      ...doc,
      etiquetas: doc.etiquetas || '',
      documento_controlado: doc.documento_controlado || false,
      _ver_id: vigente?.id || null,
      numero_version: vigente?.numero_version || '0',
      fecha_emision: vigente?.fecha_emision || '',
      notas_cambios: vigente?.notas_cambios || '',
    });
    setSgiEditMode('doc');
  };

  const handleSaveSgiDoc = async () => {
    if (!editingSgiDoc.titulo || !editingSgiDoc.categoria_id) return;
    const docPayload = {
      titulo: editingSgiDoc.titulo,
      codigo: editingSgiDoc.codigo || null,
      descripcion: editingSgiDoc.descripcion || null,
      categoria_id: editingSgiDoc.categoria_id,
      tipo_documento: editingSgiDoc.tipo_documento || 'Otro',
      acceso: editingSgiDoc.acceso || 'No Confidencial',
      lugar_ubicacion: editingSgiDoc.lugar_ubicacion || null,
      periodo_retencion: editingSgiDoc.periodo_retencion || null,
      etiquetas: editingSgiDoc.etiquetas || null,
      documento_controlado: editingSgiDoc.documento_controlado ?? false,
      activo: true,
    };

    let docId = editingSgiDoc.id;
    if (docId) {
      await supabase.from('sgi_documentos').update(docPayload).eq('id', docId);
    } else {
      const { data } = await supabase.from('sgi_documentos').insert(docPayload).select();
      docId = data?.[0]?.id;
    }

    if (docId && editingSgiDoc.numero_version) {
      const verPayload = {
        documento_id: docId,
        numero_version: editingSgiDoc.numero_version,
        fecha_emision: editingSgiDoc.fecha_emision || null,
        notas_cambios: editingSgiDoc.notas_cambios || null,
        vigente: true,
      };
      if (editingSgiDoc._ver_id) {
        await supabase.from('sgi_versiones').update(verPayload).eq('id', editingSgiDoc._ver_id);
      } else {
        await supabase.from('sgi_versiones').update({ vigente: false }).eq('documento_id', docId);
        await supabase.from('sgi_versiones').insert(verPayload);
      }
    }

    await fetchSGI();
    closeSgiEdit();
  };

  const handleDeleteSgiDoc = async (id) => {
    if (!confirm('¿Eliminar este documento y todas sus versiones?')) return;
    await supabase.from('sgi_documentos').update({ activo: false }).eq('id', id);
    await fetchSGI();
  };

  const handleSaveSgiVer = async () => {
    if (!editingSgiVer.numero_version || !editingSgiVer.documento_id) return;
    if (editingSgiVer.vigente) await supabase.from('sgi_versiones').update({ vigente: false }).eq('documento_id', editingSgiVer.documento_id);

    let archivoPath = editingSgiVer.archivo_url || null;
    if (editingSgiVer._archivo) {
      const ext = editingSgiVer._archivo.name.split('.').pop();
      const fileName = `${editingSgiVer.documento_id}/rev${editingSgiVer.numero_version}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('sgi-documentos')
        .upload(fileName, editingSgiVer._archivo, { upsert: true });
      if (!uploadError) archivoPath = fileName;
      else { alert('Error al subir el archivo: ' + uploadError.message); return; }
    }

    const payload = {
      numero_version: editingSgiVer.numero_version,
      archivo_url: archivoPath,
      notas_cambios: editingSgiVer.notas_cambios || null,
      fecha_emision: editingSgiVer.fecha_emision || null,
      vigente: editingSgiVer.vigente ?? false,
      documento_id: editingSgiVer.documento_id,
    };
    // Solo incluir si las columnas existen (agregadas vía ALTER TABLE)
    if (editingSgiVer.revisor !== undefined) payload.revisor = editingSgiVer.revisor || null;
    if (editingSgiVer.aprobador !== undefined) payload.aprobador = editingSgiVer.aprobador || null;

    if (editingSgiVer.id) {
      if (editingSgiVer.vigente) await supabase.from('sgi_versiones').update({ vigente: false }).neq('id', editingSgiVer.id).eq('documento_id', editingSgiVer.documento_id);
      const { error } = await supabase.from('sgi_versiones').update(payload).eq('id', editingSgiVer.id);
      if (error) { console.error('Error al guardar versión:', error.message); alert(error.message); return; }
    } else {
      const { error } = await supabase.from('sgi_versiones').insert(payload);
      if (error) { console.error('Error al guardar versión:', error.message); alert(error.message); return; }
    }
    await fetchSGI();
    closeSgiEdit();
  };

  const handleDeleteSgiVer = async (id) => {
    if (!confirm('¿Eliminar esta versión?')) return;
    await supabase.from('sgi_versiones').delete().eq('id', id);
    await fetchSGI();
  };

  const renderSGITab = () => {
    // ── Edit forms ──────────────────────────────────────────────────────────
    if (sgiEditMode === 'cat') return (
      <div className="edit-card">
        <div className="form-header">
          <button className="btn-back" onClick={closeSgiEdit}><ChevronLeft size={18} /> Volver</button>
          <h3>{editingSgiCat?.id ? 'Editar categoría' : 'Nueva categoría'}</h3>
        </div>
        <div className="form-body">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre *</label>
              <input className="form-control" value={editingSgiCat.nombre} onChange={e => setEditingSgiCat(d => ({ ...d, nombre: e.target.value }))} placeholder="Ej: Procedimientos" />
            </div>
            <div className="form-group">
              <label>Carpeta Padre</label>
              <select className="form-control" value={editingSgiCat.parent_id || ''} onChange={e => setEditingSgiCat(d => ({ ...d, parent_id: e.target.value || null }))}>
                <option value="">(Ninguna - Carpeta Principal)</option>
                {sgiCategorias.filter(c => c.id !== editingSgiCat.id).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Descripción</label>
              <input className="form-control" value={editingSgiCat.descripcion || ''} onChange={e => setEditingSgiCat(d => ({ ...d, descripcion: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 220 }}>
              <label>Ícono (nombre Lucide)</label>
              <input className="form-control" value={editingSgiCat.icono} onChange={e => setEditingSgiCat(d => ({ ...d, icono: e.target.value }))} placeholder="FileText..." />
            </div>
            <div className="form-group" style={{ maxWidth: 100 }}>
              <label>Color</label>
              <input type="color" className="form-control" style={{ height: 42, padding: 4, cursor: 'pointer' }} value={editingSgiCat.color} onChange={e => setEditingSgiCat(d => ({ ...d, color: e.target.value }))} />
            </div>
            <div className="form-group" style={{ maxWidth: 100 }}>
              <label>Orden</label>
              <input type="number" className="form-control" value={editingSgiCat.orden} onChange={e => setEditingSgiCat(d => ({ ...d, orden: e.target.value }))} />
            </div>
          </div>
          <button className="btn-primary" onClick={handleSaveSgiCat} disabled={!editingSgiCat.nombre}><Save size={16} /> Guardar</button>
        </div>
      </div>
    );

    if (sgiEditMode === 'doc') return (
      <div className="edit-card">
        <div className="form-header">
          <button className="btn-back" onClick={closeSgiEdit}><ChevronLeft size={18} /> Volver</button>
          <h3>{editingSgiDoc?.id ? 'Editar documento' : 'Agregar documento'}</h3>
          <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSaveSgiDoc} disabled={!editingSgiDoc.titulo || !editingSgiDoc.categoria_id}><Save size={16} /> Guardar</button>
        </div>
        <div className="form-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
            {/* Columna izquierda */}
            <div>
              <div className="form-group">
                <label>Código</label>
                <input className="form-control" value={editingSgiDoc.codigo || ''} onChange={e => setEditingSgiDoc(d => ({ ...d, codigo: e.target.value }))} placeholder="Ingrese código del documento" />
              </div>
              <div className="form-group">
                <label>Título *</label>
                <input className="form-control" value={editingSgiDoc.titulo} onChange={e => setEditingSgiDoc(d => ({ ...d, titulo: e.target.value }))} placeholder="Ingrese título del documento" />
              </div>
              <div className="form-group">
                <label>Revisión</label>
                <select className="form-control" value={editingSgiDoc.numero_version || '0'} onChange={e => setEditingSgiDoc(d => ({ ...d, numero_version: e.target.value }))}>
                  {Array.from({ length: 11 }, (_, i) => <option key={i} value={String(i)}>{i}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input type="date" className="form-control" value={editingSgiDoc.fecha_emision || ''} onChange={e => setEditingSgiDoc(d => ({ ...d, fecha_emision: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Tipo de documento</label>
                <select className="form-control" value={editingSgiDoc.tipo_documento || 'Otro'} onChange={e => setEditingSgiDoc(d => ({ ...d, tipo_documento: e.target.value }))}>
                  <option>Procedimiento</option>
                  <option>Manual</option>
                  <option>Instructivo</option>
                  <option>Registro</option>
                  <option>Formato</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Acceso</label>
                <select className="form-control" value={editingSgiDoc.acceso || 'No Confidencial'} onChange={e => setEditingSgiDoc(d => ({ ...d, acceso: e.target.value }))}>
                  <option>No Confidencial</option>
                  <option>Confidencial</option>
                  <option>Restringido</option>
                </select>
              </div>
              <div className="form-group">
                <label>Documento Controlado</label>
                <select className="form-control" value={editingSgiDoc.documento_controlado ? 'si' : 'no'} onChange={e => setEditingSgiDoc(d => ({ ...d, documento_controlado: e.target.value === 'si' }))}>
                  <option value="no">No requiere aprobación</option>
                  <option value="si">Sí, requiere aprobación</option>
                </select>
              </div>
            </div>

            {/* Columna derecha */}
            <div>
              <div className="form-group">
                <label>Etiquetas</label>
                <input className="form-control" value={editingSgiDoc.etiquetas || ''} onChange={e => setEditingSgiDoc(d => ({ ...d, etiquetas: e.target.value }))} placeholder="Ingrese etiquetas del documento" />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-control" rows={4} value={editingSgiDoc.descripcion || ''} onChange={e => setEditingSgiDoc(d => ({ ...d, descripcion: e.target.value }))} placeholder="Ingrese la descripción del documento..." />
              </div>
              <div className="form-group">
                <label>Histórico</label>
                <textarea className="form-control" rows={4} value={editingSgiDoc.notas_cambios || ''} onChange={e => setEditingSgiDoc(d => ({ ...d, notas_cambios: e.target.value }))} placeholder="Ingrese la descripción de aprobación o cambio..." />
              </div>
              <div className="form-group">
                <label>Lugar Ubicación</label>
                <input className="form-control" value={editingSgiDoc.lugar_ubicacion || ''} onChange={e => setEditingSgiDoc(d => ({ ...d, lugar_ubicacion: e.target.value }))} placeholder="Ingrese la ubicación" />
              </div>
              <div className="form-group">
                <label>Período de Retención</label>
                <input className="form-control" value={editingSgiDoc.periodo_retencion || ''} onChange={e => setEditingSgiDoc(d => ({ ...d, periodo_retencion: e.target.value }))} placeholder="Ingrese el período de retención" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    if (sgiEditMode === 'ver') return (
      <div className="edit-card">
        <div className="form-header">
          <button className="btn-back" onClick={closeSgiEdit}><ChevronLeft size={18} /> Volver</button>
          <h3>{editingSgiVer?.id ? 'Editar versión' : 'Nueva versión'}</h3>
        </div>
        <div className="form-body">
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Número de versión</label>
              <input className="form-control" value={editingSgiVer.numero_version} readOnly style={{ background: 'var(--bg-hover)', cursor: 'not-allowed', fontWeight: 700 }} />
            </div>
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label>Fecha de emisión</label>
              <input type="date" className="form-control" value={editingSgiVer.fecha_emision || ''} onChange={e => setEditingSgiVer(d => ({ ...d, fecha_emision: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Revisor</label>
              <input className="form-control" value={editingSgiVer.revisor || ''} onChange={e => setEditingSgiVer(d => ({ ...d, revisor: e.target.value }))} placeholder="Nombre del revisor..." />
            </div>
            <div className="form-group">
              <label>Aprobador</label>
              <input className="form-control" value={editingSgiVer.aprobador || ''} onChange={e => setEditingSgiVer(d => ({ ...d, aprobador: e.target.value }))} placeholder="Nombre del aprobador..." />
            </div>
          </div>
          <div className="form-group">
            <label>Archivo (PDF / Word / Excel)</label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={e => setEditingSgiVer(d => ({ ...d, _archivo: e.target.files[0] || null }))}
            />
            {editingSgiVer._archivo && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {editingSgiVer._archivo.name}
              </span>
            )}
            {!editingSgiVer._archivo && editingSgiVer.archivo_url && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Archivo actual guardado. Subí uno nuevo para reemplazarlo.
              </span>
            )}
          </div>
          <div className="form-group">
            <label>Notas de cambios</label>
            <textarea className="form-control" rows={3} value={editingSgiVer.notas_cambios || ''} onChange={e => setEditingSgiVer(d => ({ ...d, notas_cambios: e.target.value }))} />
          </div>
          <label className="admin-checkbox-label">
            <input type="checkbox" checked={editingSgiVer.vigente} onChange={e => setEditingSgiVer(d => ({ ...d, vigente: e.target.checked }))} />
            Marcar como versión vigente
          </label>
          <button className="btn-primary" onClick={handleSaveSgiVer} disabled={!editingSgiVer.numero_version}><Save size={16} /> Guardar</button>
        </div>
      </div>
    );

    // ── Tree view ────────────────────────────────────────────────────────────
    const getRecursiveDocCount = (catId) => {
      const directDocs = sgiDocumentos.filter(d => d.categoria_id === catId).length;
      const subcategories = sgiCategorias.filter(c => c.parent_id === catId);
      let subDocs = 0;
      subcategories.forEach(sub => {
        subDocs += getRecursiveDocCount(sub.id);
      });
      return directDocs + subDocs;
    };

    const renderCategory = (cat, depth = 0) => {
      const subcats = sgiCategorias.filter(c => c.parent_id === cat.id);
      const catDocs = sgiDocumentos.filter(d => d.categoria_id === cat.id);
      const isOpen = expandedCats[cat.id];
      const totalDocs = getRecursiveDocCount(cat.id);

      return (
        <div key={cat.id} style={{ marginLeft: depth > 0 ? 24 : 0, borderLeft: depth > 0 ? '1px dashed #e2e8f0' : 'none', paddingLeft: depth > 0 ? 16 : 0, marginTop: depth > 0 ? 8 : 0 }}>
          <div className="sgi-tree-cat">
            {/* Category row */}
            <div className="sgi-tree-row cat-row">
              <button className="sgi-tree-toggle" onClick={() => setExpandedCats(s => ({ ...s, [cat.id]: !s[cat.id] }))}>
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              <div className="sgi-tree-cat-dot" style={{ background: cat.color }} />
              <span className="sgi-tree-cat-name">{cat.nombre}</span>
              <span className="sgi-tree-count">{totalDocs} doc{totalDocs !== 1 ? 's' : ''} {subcats.length > 0 ? `· ${subcats.length} sub` : ''}</span>
              <div className="sgi-tree-actions">
                <button className="btn-icon-admin" title="Crear carpeta interna" onClick={() => { setEditingSgiCat({ nombre: '', icono: 'Folder', color: '#6366f1', descripcion: '', orden: sgiCategorias.length + 1, activo: true, parent_id: cat.id }); setSgiEditMode('cat'); }}>
                  <FolderPlus size={13} />
                </button>
                <button className="btn-icon-admin" title="Crear documento" onClick={() => handleCreateSgiDoc(cat.id)}>
                  <FilePlus size={13} />
                </button>
                <button className="btn-icon-admin" title="Editar categoría" onClick={() => { setEditingSgiCat({ ...cat }); setSgiEditMode('cat'); }}>
                  <Edit2 size={13} />
                </button>
                <button className="btn-icon-admin danger" title="Eliminar categoría" onClick={() => handleDeleteSgiCat(cat.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Subcategories & Documents */}
          {isOpen && (
            <div className="sgi-tree-docs" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: depth === 0 ? '#fdfdfd' : 'transparent' }}>
              {subcats.map(subcat => renderCategory(subcat, depth + 1))}
              {catDocs.length === 0 && subcats.length === 0 ? (
                <div className="sgi-tree-empty">Vacío</div>
              ) : catDocs.map(doc => {
                      const docVers = sgiVersiones.filter(v => v.documento_id === doc.id);
                      const vigente = docVers.find(v => v.vigente);
                      const isDocOpen = expandedDocs[doc.id];
                      return (
                        <div key={doc.id} className="sgi-tree-doc">
                          {/* Document row */}
                          <div className="sgi-tree-row doc-row">
                            <button className="sgi-tree-toggle" onClick={() => setExpandedDocs(s => ({ ...s, [doc.id]: !s[doc.id] }))}>
                              {isDocOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                            <FileText size={14} className="sgi-tree-file-icon" />
                            <span className="sgi-tree-doc-title">{doc.titulo}</span>
                            {doc.codigo && <span className="sgi-tree-code">{doc.codigo}</span>}
                            {vigente
                              ? <span className="sgi-tree-ver vigente">v{vigente.numero_version}</span>
                              : <span className="sgi-tree-ver none">sin versión</span>
                            }
                            <div className="sgi-tree-actions">
                              <button className="btn-icon-admin" title="Nueva versión" onClick={() => {
                                const docVersLocal = sgiVersiones.filter(v => v.documento_id === doc.id);
                                const maxVer = docVersLocal.reduce((max, v) => Math.max(max, parseInt(v.numero_version) || 0), 0);
                                setEditingSgiVer({ numero_version: String(maxVer + 1), archivo_url: '', notas_cambios: '', fecha_emision: new Date().toISOString().split('T')[0], vigente: true, documento_id: doc.id });
                                setSgiEditMode('ver');
                              }}>
                                <Plus size={13} />
                              </button>
                              <button className="btn-icon-admin" title="Editar documento" onClick={() => handleEditSgiDoc(doc)}>
                                <Edit2 size={13} />
                              </button>
                              <button className="btn-icon-admin danger" title="Eliminar documento" onClick={() => handleDeleteSgiDoc(doc.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Versions */}
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
                                      }}>
                                        <Download size={13} />
                                      </button>
                                    )}
                                    <button className="btn-icon-admin" title="Editar versión" onClick={() => { setEditingSgiVer({ ...ver }); setSgiEditMode('ver'); }}>
                                      <Edit2 size={13} />
                                    </button>
                                    <button className="btn-icon-admin danger" title="Eliminar versión" onClick={() => handleDeleteSgiVer(ver.id)}>
                                      <Trash2 size={13} />
                                    </button>
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

    return (
      <div className="admin-list-panel">
        <div className="admin-list-header">
          <span className="admin-count">{sgiCategorias.length} categorías · {sgiDocumentos.length} documentos</span>
          <button className="btn-add-admin" onClick={() => { setEditingSgiCat({ nombre: '', icono: 'Folder', color: '#6366f1', descripcion: '', orden: sgiCategorias.length + 1, activo: true, parent_id: null }); setSgiEditMode('cat'); }}>
            <Plus size={16} /> Nueva categoría
          </button>
        </div>

        <div className="sgi-tree">
          {sgiCategorias.filter(c => !c.parent_id).map(cat => renderCategory(cat, 0))}

          {sgiCategorias.length === 0 && (
            <div className="admin-empty">No hay categorías. Creá la primera con el botón de arriba.</div>
          )}
        </div>
      </div>
    );
  };

  const handleCreateFaq = () => {
    setEditingFaqData({ pregunta: '', respuesta: '', sector_id: faqSectores[0]?.id || null, activo: true, numero_orden: 0, links: [] });
    setIsEditingFaq(true);
  };

  const handleEditFaq = (item) => {
    setEditingFaqData({ ...item, links: item.links || [] });
    setIsEditingFaq(true);
  };

  const handleSaveFaq = async () => {
    if (!editingFaqData.pregunta || !editingFaqData.respuesta) return;
    const payload = {
      pregunta: editingFaqData.pregunta,
      respuesta: editingFaqData.respuesta,
      sector_id: editingFaqData.sector_id || null,
      activo: editingFaqData.activo ?? true,
      numero_orden: editingFaqData.numero_orden || 0,
      links: (editingFaqData.links || []).filter(l => l.url?.trim()),
    };
    if (editingFaqData.id) payload.id = editingFaqData.id;
    const { error } = await supabase.from('faq_preguntas').upsert([payload]);
    if (error) return alert(error.message);
    fetchFaq();
    setIsEditingFaq(false);
    setEditingFaqData(null);
  };

  const handleDeleteFaq = async (id) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    await supabase.from('faq_preguntas').delete().eq('id', id);
    fetchFaq();
  };

  const renderFaqTab = () => {
    const grouped = faqPreguntas.reduce((acc, p) => {
      const key = p.sector?.nombre || 'Sin sector';
      const color = p.sector?.color || '#ccc';
      if (!acc[key]) acc[key] = { color, items: [] };
      acc[key].items.push(p);
      return acc;
    }, {});

    return isEditingFaq ? (
      <div>
        <button className="btn-back" onClick={() => { setIsEditingFaq(false); setEditingFaqData(null); }} style={{ marginBottom: '20px' }}>
          <ChevronLeft size={18} /> Volver
        </button>
        <div className="edit-card">
          <div className="form-header">
            <h3>{editingFaqData?.id ? 'Editar Pregunta' : 'Nueva Pregunta'}</h3>
            <div className="form-header-actions">
              <button className="btn-primary" onClick={handleSaveFaq}><Save size={16} /> Guardar</button>
            </div>
          </div>
          <div className="form-body">
            <div className="form-group">
              <label>Pregunta *</label>
              <input className="form-control" value={editingFaqData.pregunta} onChange={e => setEditingFaqData({ ...editingFaqData, pregunta: e.target.value })} placeholder="¿Cuál es la pregunta?" />
            </div>
            <div className="form-group">
              <label>Respuesta *</label>
              <textarea className="form-control" rows={5} value={editingFaqData.respuesta} onChange={e => setEditingFaqData({ ...editingFaqData, respuesta: e.target.value })} placeholder="Escribí la respuesta completa..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Sector</label>
                <select className="form-control" value={editingFaqData.sector_id || ''} onChange={e => setEditingFaqData({ ...editingFaqData, sector_id: e.target.value })}>
                  <option value="">Sin sector</option>
                  {faqSectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Orden</label>
                <input type="number" className="form-control" value={editingFaqData.numero_orden} onChange={e => setEditingFaqData({ ...editingFaqData, numero_orden: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select className="form-control" value={editingFaqData.activo ? 'true' : 'false'} onChange={e => setEditingFaqData({ ...editingFaqData, activo: e.target.value === 'true' })}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Links de interés */}
            <div className="faq-links-editor">
              <div className="faq-links-editor-header">
                <label>Links de interés</label>
                <button
                  type="button"
                  className="btn-add-link"
                  onClick={() => setEditingFaqData({ ...editingFaqData, links: [...(editingFaqData.links || []), { titulo: '', url: '' }] })}
                >
                  <Plus size={14} /> Agregar link
                </button>
              </div>
              {(editingFaqData.links || []).length === 0 ? (
                <p className="faq-links-empty">No hay links agregados. Podés agregar recursos útiles relacionados a esta respuesta.</p>
              ) : (
                <div className="faq-links-rows">
                  {editingFaqData.links.map((link, i) => (
                    <div key={i} className="faq-link-row">
                      <input
                        className="form-control"
                        placeholder="Título del link (ej: Manual de usuario)"
                        value={link.titulo}
                        onChange={e => {
                          const updated = [...editingFaqData.links];
                          updated[i] = { ...updated[i], titulo: e.target.value };
                          setEditingFaqData({ ...editingFaqData, links: updated });
                        }}
                      />
                      <input
                        className="form-control"
                        placeholder="URL (https://...)"
                        value={link.url}
                        onChange={e => {
                          const updated = [...editingFaqData.links];
                          updated[i] = { ...updated[i], url: e.target.value };
                          setEditingFaqData({ ...editingFaqData, links: updated });
                        }}
                      />
                      <button
                        type="button"
                        className="btn-icon-admin danger"
                        onClick={() => setEditingFaqData({ ...editingFaqData, links: editingFaqData.links.filter((_, idx) => idx !== i) })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="admin-list-panel">
        <div className="admin-list-header">
          <h3>Preguntas Frecuentes <span className="admin-count">{faqPreguntas.length}</span></h3>
          <button className="btn-add-admin" onClick={handleCreateFaq}><Plus size={16} /> Nueva Pregunta</button>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="admin-empty"><MessageCircle size={40} /><p>No hay preguntas cargadas aún.</p></div>
        ) : (
          Object.entries(grouped).map(([sector, { color, items }]) => (
            <div key={sector} className="eventos-month-group">
              <h4 className="eventos-month-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
                {sector}
                <span className="admin-count" style={{ marginLeft: 4 }}>{items.length}</span>
              </h4>
              <div className="eventos-list">
                {items.map(p => (
                  <div key={p.id} className="evento-item">
                    <div className="evento-info">
                      <span className="evento-titulo">{p.pregunta}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>{p.respuesta.slice(0, 80)}{p.respuesta.length > 80 ? '…' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!p.activo && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>Inactivo</span>}
                      <div className="admin-item-actions">
                        <button className="btn-icon-admin" onClick={() => handleEditFaq(p)}><Edit2 size={15} /></button>
                        <button className="btn-icon-admin danger" onClick={() => handleDeleteFaq(p.id)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // --- EVENTOS FETCHING ---
  const fetchEventos = async () => {
    const { data } = await supabase
      .from('eventos')
      .select('*, categoria:eventos_categorias(nombre, color), area:areas(nombre, color)')
      .order('fecha', { ascending: true });
    if (data) setEventos(data);
  };

  const fetchEventosCategorias = async () => {
    const { data } = await supabase.from('eventos_categorias').select('*');
    if (data) setEventosCategorias(data);
  };

  const fetchAreas = async () => {
    const { data } = await supabase.from('areas').select('*');
    if (data) setAreas(data);
  };

  // --- EVENTOS LOGIC ---
  const handleCreateEvento = () => {
    setEditingEventoData({ titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], categoria_id: eventosCategorias[0]?.id || null, area_id: areas[0]?.id || null });
    setEditingVisibilidadEvento([]);
    setIsEditingEvento(true);
  };

  const handleEditEvento = async (evento) => {
    setEditingEventoData({ ...evento, categoria_id: evento.categoria_id, area_id: evento.area_id });
    const { data, error } = await supabase.from('eventos_visibilidad').select('*').eq('evento_id', evento.id);
    console.log('[Visibilidad] evento_id:', evento.id, 'data:', data, 'error:', error);
    setEditingVisibilidadEvento(data || []);
    setIsEditingEvento(true);
  };

  const handleSaveEvento = async () => {
    if (!editingEventoData.titulo || !editingEventoData.fecha) return;
    const payload = {
      titulo: editingEventoData.titulo,
      descripcion: editingEventoData.descripcion || null,
      fecha: editingEventoData.fecha,
      categoria_id: editingEventoData.categoria_id || null,
      area_id: editingEventoData.area_id || null,
    };
    if (editingEventoData.id) payload.id = editingEventoData.id;
    const { data: savedEvento, error } = await supabase.from('eventos').upsert([payload]).select();
    if (error) return alert(error.message);
    const savedId = savedEvento[0].id;

    await supabase.from('eventos_visibilidad').delete().eq('evento_id', savedId);
    if (editingVisibilidadEvento.length > 0) {
      const visPayload = editingVisibilidadEvento.filter(r => r.valor.trim()).map(r => ({
        evento_id: savedId,
        campo: r.campo,
        valor: r.valor.trim()
      }));
      if (visPayload.length > 0) await supabase.from('eventos_visibilidad').insert(visPayload);
    }

    fetchEventos();
    setIsEditingEvento(false);
    setEditingEventoData(null);
  };

  const handleDeleteEvento = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return;
    await supabase.from('eventos').delete().eq('id', id);
    fetchEventos();
  };

  const renderEventosTab = () => {
    const grouped = eventos.reduce((acc, ev) => {
      const month = new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      if (!acc[month]) acc[month] = [];
      acc[month].push(ev);
      return acc;
    }, {});

    return isEditingEvento ? (
      <div>
        <button className="btn-back" onClick={() => { setIsEditingEvento(false); setEditingEventoData(null); }} style={{ marginBottom: '20px' }}>
          <ChevronLeft size={18} /> Volver
        </button>

        <div className="edit-card">
          <div className="form-header">
            <h3>{editingEventoData?.id ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            <div className="form-header-actions">
              <button className="btn-primary" onClick={handleSaveEvento}><Save size={16} /> Guardar Evento</button>
            </div>
          </div>

          <div className="form-body">
            <div className="form-group">
              <label>Título *</label>
              <input className="form-control" value={editingEventoData.titulo} onChange={e => setEditingEventoData({ ...editingEventoData, titulo: e.target.value })} placeholder="Nombre del evento" />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea className="form-control" rows={3} value={editingEventoData.descripcion || ''} onChange={e => setEditingEventoData({ ...editingEventoData, descripcion: e.target.value })} placeholder="Descripción opcional..." />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" className="form-control" value={editingEventoData.fecha} onChange={e => setEditingEventoData({ ...editingEventoData, fecha: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select className="form-control" value={editingEventoData.categoria_id || ''} onChange={e => setEditingEventoData({ ...editingEventoData, categoria_id: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {eventosCategorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Área</label>
                <select className="form-control" value={editingEventoData.area_id || ''} onChange={e => setEditingEventoData({ ...editingEventoData, area_id: e.target.value })}>
                  <option value="">Sin área</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="section-divider" style={{ margin: '24px 0 16px 0', borderBottom: '1px solid #f0f0f0' }}></div>
            <h4 className="mb-2" style={{ fontSize: '15px', fontWeight: '800' }}>Visibilidad</h4>
            <p className="text-muted text-xs mb-4">Sin reglas, el evento es visible para todos. Con reglas, solo lo ven quienes coincidan con al menos una.</p>
            <div className="destinatarios-list mb-2">
              {editingVisibilidadEvento.map((r, idx) => (
                <div key={r.id} className="dest-row" style={{ marginBottom: '12px', gridTemplateColumns: '180px 1fr 40px' }}>
                  <select className="form-control" style={{ padding: '8px' }} value={r.campo} onChange={e => {
                    const n = [...editingVisibilidadEvento]; n[idx] = { ...n[idx], campo: e.target.value, valor: '' }; setEditingVisibilidadEvento(n);
                  }}>
                    <option value="department">Área / Departamento</option>
                    <option value="job_title">Puesto</option>
                    <option value="office_location">Ubicación</option>
                  </select>
                  <select
                    className="form-control" style={{ padding: '8px' }}
                    value={r.valor}
                    onChange={e => { const n = [...editingVisibilidadEvento]; n[idx] = { ...n[idx], valor: e.target.value }; setEditingVisibilidadEvento(n); }}
                  >
                    <option value="">— Seleccionar —</option>
                    {[...new Set([...(profileValues[r.campo] || []), ...(r.valor ? [r.valor] : [])])].sort().map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <button className="action-btn delete" onClick={() => setEditingVisibilidadEvento(editingVisibilidadEvento.filter((_, i) => i !== idx))}><Trash2 size={16} /></button>
                </div>
              ))}
              <button className="btn-add-dest" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleAddVisibilidadEvento}>+ Agregar Regla</button>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="admin-list-panel">
        <div className="admin-list-header">
          <h3>Eventos <span className="admin-count">{eventos.length}</span></h3>
          <button className="btn-add-admin" onClick={handleCreateEvento}><Plus size={16} /> Nuevo Evento</button>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="admin-empty"><Calendar size={40} /><p>No hay eventos creados aún.</p></div>
        ) : (
          Object.entries(grouped).map(([month, evs]) => (
            <div key={month} className="eventos-month-group">
              <h4 className="eventos-month-title">{month.charAt(0).toUpperCase() + month.slice(1)}</h4>
              <div className="eventos-list">
                {evs.map(ev => (
                  <div key={ev.id} className="evento-item">
                    <div className="evento-date-badge">
                      <span className="evento-day">{new Date(ev.fecha + 'T00:00:00').getDate()}</span>
                      <span className="evento-month-short">{new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short' })}</span>
                    </div>
                    <div className="evento-info">
                      <span className="evento-titulo">{ev.titulo}</span>
                      <div className="evento-tags">
                        {ev.categoria && <span className="evento-tag" style={{ backgroundColor: ev.categoria.color + '20', color: ev.categoria.color }}>{ev.categoria.nombre}</span>}
                        {ev.area && <span className="evento-tag" style={{ backgroundColor: ev.area.color + '20', color: ev.area.color }}>{ev.area.nombre}</span>}
                      </div>
                    </div>
                    <div className="admin-item-actions">
                      <button className="btn-icon-admin" onClick={() => handleEditEvento(ev)}><Edit2 size={15} /></button>
                      <button className="btn-icon-admin danger" onClick={() => handleDeleteEvento(ev.id)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // --- ONBOARDING LOGIC ---
  const handleCreateStep = () => {
    setEditingStepData({ titulo: '', subtitulo: '', icono: 'building', activo: true });
    setEditingBlocks([]);
    setIsEditingStep(true);
  };

  const handleEditStep = async (step) => {
    setEditingStepData(step);
    setIsEditingStep(true);
    setEditingBlocks([]);
    setIsLoadingBlocks(true);
    const { data } = await supabase.from('onboarding_bloques').select('*').eq('step_id', step.id).order('numero_orden', { ascending: true });
    if (data) setEditingBlocks(data);
    setIsLoadingBlocks(false);
  };

  const handleSaveStep = async () => {
    if (!editingStepData.titulo) return;
    const { data: stepData, error: stepError } = await supabase.from('onboarding_steps').upsert([editingStepData]).select();
    if (stepError) return alert(stepError.message);
    const savedStepId = stepData[0].id;
    const blocksPayload = editingBlocks.map((b, idx) => ({
      id: (b.id && !b.id.toString().startsWith('temp-')) ? b.id : self.crypto.randomUUID(),
      step_id: savedStepId,
      numero_orden: idx + 1,
      tipo: b.tipo,
      contenido: b.contenido,
      metadata: b.metadata || {}
    }));
    await supabase.from('onboarding_bloques').delete().eq('step_id', savedStepId);
    if (blocksPayload.length > 0) {
      await supabase.from('onboarding_bloques').insert(blocksPayload);
    }
    fetchSteps();
    setIsEditingStep(false);
  };

  const handleReorderSteps = async (newOrder) => {
    setSteps(newOrder);
    const updates = newOrder.map((step, idx) => ({
      ...step,
      numero_orden: idx + 1
    }));
    // Using simple upsert for reordering
    await supabase.from('onboarding_steps').upsert(updates);
  };

  // --- HELPERS FOR BLOCKS (Reused in Onboarding & Course Modules) ---
  const parseBlocks = (content) => {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return content ? [{ id: 'legacy-'+Date.now(), tipo: 'texto', contenido: content, metadata: {} }] : [];
    }
  };

  const updateBlockInList = (blocks, id, field, value) => {
    return blocks.map(b => b.id === id ? { ...b, [field]: value } : b);
  };

  const updateBlockMetaInList = (blocks, id, key, value) => {
    return blocks.map(b => {
      if (b.id !== id) return b;
      return { ...b, metadata: { ...b.metadata, [key]: value } };
    });
  };

  // --- COURSES LOGIC ---
  const handleCreateCourse = () => {
    setEditingCourseData({ titulo: '', descripcion: '', duracion_estimada: '1h', categoria_id: categories[0]?.id || null, imagen_banner: '', es_paf: false, paf_item_id: null });
    setEditingModules([]);
    setEditingVisibilidadCurso([]);
    setEditingPreguntas([]);
    setIsEditingCourse(true);
  };

  const handleEditCourse = async (course) => {
    // Recuperar el año del PAF a partir del paf_item_id
    let pafAnio = null;
    if (course.paf_item_id) {
      const item = pafItems.find(i => i.id === course.paf_item_id);
      if (item) {
        const plan = pafPlanes.find(p => p.id === item.plan_id);
        if (plan) pafAnio = plan.anio;
      }
    }
    setEditingCourseData({ ...course, _paf_anio: pafAnio });
    setIsEditingCourse(true);
    setIsLoadingModules(true);

    const [modRes, visRes, destRes] = await Promise.all([
      supabase.from('cursos_modulos').select('*').eq('curso_id', course.id).order('numero_orden', { ascending: true }),
      supabase.from('cursos_visibilidad').select('*').eq('curso_id', course.id),
      supabase.from('cursos_destinatarios').select('user_id, profile:profiles(full_name, email)').eq('curso_id', course.id),
    ]);

    if (modRes.data) setEditingModules(modRes.data);
    if (visRes.data) setEditingVisibilidadCurso(visRes.data);
    if (destRes.data) setEditingDestinatariosCurso(destRes.data.map(d => ({ user_id: d.user_id, full_name: d.profile?.full_name || '', email: d.profile?.email || '' })));
    setDestinatariosSearch('');
    try {
      setEditingPreguntas(course.cuestionario ? JSON.parse(course.cuestionario) : []);
    } catch(e) { setEditingPreguntas([]); }
    setIsLoadingModules(false);
  };

  const handleSaveCourse = async () => {
    if (!editingCourseData.titulo) return;
    setIsSavingCourse(true);
    
    // Clean up course data to only include local columns
    const courseToSave = { ...editingCourseData };
    delete courseToSave.categoria;
    delete courseToSave._paf_anio;
    courseToSave.cuestionario = JSON.stringify(editingPreguntas);

    const { data: courseData, error: courseError } = await supabase.from('cursos').upsert([courseToSave]).select();
    if (courseError) return alert(courseError.message);
    const savedId = courseData[0].id;

    const existingModules = editingModules.filter(m => m.id && !m.id.toString().startsWith('temp-'));
    const newModules = editingModules.filter(m => !m.id || m.id.toString().startsWith('temp-'));

    if (existingModules.length > 0) {
      await Promise.all(existingModules.map((m, idx) =>
        supabase.from('cursos_modulos').update({
          numero_orden: editingModules.indexOf(m) + 1,
          titulo: m.titulo,
          contenido: typeof m.contenido === 'string' ? m.contenido : JSON.stringify(m.contenido)
        }).eq('id', m.id)
      ));
    }

    if (newModules.length > 0) {
      await supabase.from('cursos_modulos').insert(newModules.map((m, idx) => ({
        curso_id: savedId,
        numero_orden: editingModules.indexOf(m) + 1,
        titulo: m.titulo,
        contenido: typeof m.contenido === 'string' ? m.contenido : JSON.stringify(m.contenido)
      })));
    }

    await supabase.from('cursos_visibilidad').delete().eq('curso_id', savedId);
    if (editingVisibilidadCurso.length > 0) {
      const visPayload = editingVisibilidadCurso.map(r => ({
        curso_id: savedId,
        campo: r.campo,
        valor: r.valor
      }));
      await supabase.from('cursos_visibilidad').insert(visPayload);
    }

    await supabase.from('cursos_destinatarios').delete().eq('curso_id', savedId);
    if (editingDestinatariosCurso.length > 0) {
      await supabase.from('cursos_destinatarios').insert(
        editingDestinatariosCurso.map(d => ({ curso_id: savedId, user_id: d.user_id }))
      );
    }

    await fetchCourses();
    setIsSavingCourse(false);
    setIsEditingCourse(false);
  };

  const handleAddModule = () => {
    setEditingModules([...editingModules, { id: 'temp-'+Date.now(), titulo: 'Nuevo Módulo', contenido: '[]', numero_orden: editingModules.length + 1 }]);
  };

  const handleAddVisibilidadCurso = () => {
    setEditingVisibilidadCurso([...editingVisibilidadCurso, { id: 'temp-'+Date.now(), campo: 'department', valor: '' }]);
  };

  const handleAddVisibilidadEvento = () => {
    setEditingVisibilidadEvento([...editingVisibilidadEvento, { id: 'temp-'+Date.now(), campo: 'department', valor: '' }]);
  };

  const handleAddBlockToModule = (mIdx, tipo) => {
    const newModules = [...editingModules];
    const currentBlocks = parseBlocks(newModules[mIdx].contenido);
    
    const newBlock = {
      id: 'b-'+Date.now(),
      tipo,
      contenido: (tipo === 'cards' || tipo === 'timeline') ? '[]' : '',
      metadata: tipo === 'banner' ? { bg_color: '#000000', text_color: '#F2DC00' } : {}
    };

    newModules[mIdx].contenido = JSON.stringify([...currentBlocks, newBlock]);
    setEditingModules(newModules);
  };

  const updateModuleBlock = (mIdx, bId, field, value) => {
    const newModules = [...editingModules];
    const blocks = parseBlocks(newModules[mIdx].contenido);
    const newBlocks = blocks.map(b => b.id === bId ? { ...b, [field]: value } : b);
    newModules[mIdx].contenido = JSON.stringify(newBlocks);
    setEditingModules(newModules);
  };

  const updateModuleBlockMeta = (mIdx, bId, key, value) => {
    const newModules = [...editingModules];
    const blocks = parseBlocks(newModules[mIdx].contenido);
    const newBlocks = blocks.map(b => b.id === bId ? { ...b, metadata: { ...b.metadata, [key]: value } } : b);
    newModules[mIdx].contenido = JSON.stringify(newBlocks);
    setEditingModules(newModules);
  };

  const removeBlockFromModule = (mIdx, bId) => {
    const newModules = [...editingModules];
    const blocks = parseBlocks(newModules[mIdx].contenido);
    const newBlocks = blocks.filter(b => b.id !== bId);
    newModules[mIdx].contenido = JSON.stringify(newBlocks);
    setEditingModules(newModules);
  };

  // --- QUIZ BUILDER LOGIC ---
  const handleAddPregunta = () => {
    const ts = Date.now();
    setEditingPreguntas([...editingPreguntas, {
      id: 'p-' + ts,
      texto: '',
      opciones: [
        { id: 'o-' + ts + '-1', texto: '', correcta: true },
        { id: 'o-' + ts + '-2', texto: '', correcta: false },
      ]
    }]);
  };

  const handleUpdatePregunta = (pIdx, texto) => {
    const newP = [...editingPreguntas];
    newP[pIdx] = { ...newP[pIdx], texto };
    setEditingPreguntas(newP);
  };

  const handleAddOpcion = (pIdx) => {
    const newP = [...editingPreguntas];
    newP[pIdx].opciones = [...newP[pIdx].opciones, { id: 'o-' + Date.now(), texto: '', correcta: false }];
    setEditingPreguntas(newP);
  };

  const handleUpdateOpcion = (pIdx, oIdx, texto) => {
    const newP = [...editingPreguntas];
    newP[pIdx].opciones[oIdx] = { ...newP[pIdx].opciones[oIdx], texto };
    setEditingPreguntas(newP);
  };

  const handleSetCorrecta = (pIdx, oIdx) => {
    const newP = [...editingPreguntas];
    newP[pIdx].opciones = newP[pIdx].opciones.map((o, i) => ({ ...o, correcta: i === oIdx }));
    setEditingPreguntas(newP);
  };

  const handleRemovePregunta = (pIdx) => {
    setEditingPreguntas(editingPreguntas.filter((_, i) => i !== pIdx));
  };

  const handleRemoveOpcion = (pIdx, oIdx) => {
    const newP = [...editingPreguntas];
    newP[pIdx].opciones = newP[pIdx].opciones.filter((_, i) => i !== oIdx);
    setEditingPreguntas(newP);
  };

  const renderQuizBuilder = () => (
    <>
      <div className="section-divider" style={{ margin: '48px 0', borderBottom: '2px solid #f0f0f0' }}></div>
      <div className="flex-between mb-6">
        <div>
          <h4 style={{ fontSize: '18px', fontWeight: '800' }}>4. Cuestionario Final</h4>
          <p className="text-muted text-sm" style={{ marginTop: '6px' }}>
            Preguntas que el usuario debe responder al completar todos los módulos.
          </p>
        </div>
        <button className="btn-secondary" onClick={handleAddPregunta}><Plus size={16} /> Nueva Pregunta</button>
      </div>

      {editingPreguntas.length === 0 ? (
        <div className="empty-quiz-hint">
          <HelpCircle size={28} />
          <p>Sin cuestionario. Las preguntas son opcionales — si no agregás ninguna, el curso finaliza al completar los módulos.</p>
        </div>
      ) : (
        <div className="preguntas-list">
          {editingPreguntas.map((pregunta, pIdx) => (
            <div key={pregunta.id} className="pregunta-card">
              <div className="pregunta-card-header">
                <span className="mod-number">{pIdx + 1}</span>
                <input
                  className="form-control-ghost"
                  style={{ flex: 1, fontSize: '15px', fontWeight: '700' }}
                  value={pregunta.texto}
                  placeholder="Escribe la pregunta aquí..."
                  onChange={e => handleUpdatePregunta(pIdx, e.target.value)}
                />
                <button className="delete-mod" onClick={() => handleRemovePregunta(pIdx)}><Trash2 size={16} /></button>
              </div>

              <div className="opciones-editor">
                <p className="opciones-hint">Seleccioná el radio de la respuesta correcta</p>
                {pregunta.opciones.map((opcion, oIdx) => (
                  <div key={opcion.id} className={`opcion-row ${opcion.correcta ? 'correcta' : ''}`}>
                    <input
                      type="radio"
                      name={`correct-${pregunta.id}`}
                      checked={opcion.correcta}
                      onChange={() => handleSetCorrecta(pIdx, oIdx)}
                      className="opcion-radio"
                    />
                    <input
                      className="form-control"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '14px' }}
                      value={opcion.texto}
                      placeholder={`Opción ${oIdx + 1}...`}
                      onChange={e => handleUpdateOpcion(pIdx, oIdx, e.target.value)}
                    />
                    {pregunta.opciones.length > 2 && (
                      <button className="btn-remove-block" onClick={() => handleRemoveOpcion(pIdx, oIdx)}><X size={12} /></button>
                    )}
                  </div>
                ))}
                {pregunta.opciones.length < 4 && (
                  <button className="btn-add-sub" onClick={() => handleAddOpcion(pIdx)}>+ Agregar opción</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // --- RENDER BLOCKS EDITOR (Shared Concept) ---
  const renderBlocksEditor = (blocks, onUpdate, onUpdateMeta, onRemove, onAdd) => (
    <div className="blocks-editor-container">
      <div className="add-block-tools compact">
        <button onClick={() => onAdd('texto')}><Type size={14} /> Texto</button>
        <button onClick={() => onAdd('imagen')}><ImageIcon size={14} /> Imagen</button>
        <button onClick={() => onAdd('banner')}><Square size={14} /> Banner</button>
        <button onClick={() => onAdd('video')}><Video size={14} /> Video</button>
        <button onClick={() => onAdd('cards')}><CreditCard size={14} /> Cards</button>
      </div>

      <div className="blocks-list-mini">
        {blocks.map((block, bIdx) => (
          <div key={block.id} className="block-item-mini">
            <div className="block-item-header">
               <span className="block-type-label">{block.tipo}</span>
               <button className="btn-remove-block" onClick={() => onRemove(block.id)}><X size={12} /></button>
            </div>
            
            {block.tipo === 'texto' && (
              <textarea 
                className="form-control" 
                rows="3" 
                placeholder="Texto..." 
                value={block.contenido}
                onChange={e => onUpdate(block.id, 'contenido', e.target.value)}
              />
            )}

            {(block.tipo === 'imagen' || block.tipo === 'video') && (
              <input 
                className="form-control" 
                placeholder="URL..." 
                value={block.contenido}
                onChange={e => onUpdate(block.id, 'contenido', e.target.value)}
              />
            )}

            {block.tipo === 'banner' && (
              <div className="banner-edit-mini">
                 <input className="form-control" value={block.contenido} onChange={e => onUpdate(block.id, 'contenido', e.target.value)} placeholder="Título Banner" />
                 <div className="color-pickers">
                    <input type="color" value={block.metadata?.bg_color} onChange={e => onUpdateMeta(block.id, 'bg_color', e.target.value)} />
                    <input type="color" value={block.metadata?.text_color} onChange={e => onUpdateMeta(block.id, 'text_color', e.target.value)} />
                 </div>
              </div>
            )}

            {block.tipo === 'cards' && (
              <div className="cards-edit-mini">
                 <button className="btn-add-sub" onClick={() => {
                   const items = JSON.parse(block.contenido || '[]');
                   onUpdate(block.id, 'contenido', JSON.stringify([...items, { label: '', text: '' }]));
                 }}>+ Item</button>
                 {JSON.parse(block.contenido || '[]').map((item, iIdx) => (
                   <div key={iIdx} className="card-sub-item">
                     <input placeholder="Título" value={item.label} onChange={e => {
                        const items = JSON.parse(block.contenido);
                        items[iIdx].label = e.target.value;
                        onUpdate(block.id, 'contenido', JSON.stringify(items));
                     }} />
                     <button onClick={() => {
                        const items = JSON.parse(block.contenido).filter((_, idx)=>idx !== iIdx);
                        onUpdate(block.id, 'contenido', JSON.stringify(items));
                     }}><X size={10} /></button>
                   </div>
                 ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderOnboardingTab = () => (
    !isEditingStep ? (
      <div className="admin-section">
        <div className="section-toolbar">
          <h3>Pasos de Inducción</h3>
          <button className="btn-primary" onClick={handleCreateStep}><Plus size={18} /> Agregar Paso</button>
        </div>
        
        {isLoading ? <p>Cargando...</p> : (
          <Reorder.Group 
            axis="y" 
            values={steps} 
            onReorder={handleReorderSteps}
            className="steps-list"
          >
            {steps.map(step => (
              <Reorder.Item 
                key={step.id} 
                value={step}
                className="step-list-item"
              >
                <div className="step-drag-handle">
                  <GripVertical size={20} className="text-muted" />
                </div>
                <div className="step-list-info">
                  <h4>{step.titulo}</h4>
                  <p>{step.subtitulo}</p>
                </div>
                <div className="actions-cell">
                  <button className="action-btn edit" onClick={() => handleEditStep(step)}><Edit2 size={16} /></button>
                  <button className="action-btn delete" onClick={() => {}}><Trash2 size={16} /></button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    ) : (
      <div className="admin-form-section">
        <div className="form-header">
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn-back" onClick={() => setIsEditingStep(false)}><ChevronLeft size={20} /></button>
              <h3>{editingStepData.id ? 'Editar Paso de Onboarding' : 'Nuevo Paso'}</h3>
           </div>
           <div className="form-header-actions">
              <button className="btn-primary" onClick={handleSaveStep}><Save size={18} /> Guardar Cambios</button>
           </div>
        </div>
        
        <div className="edit-card">
           <div className="form-group" style={{ marginBottom: '40px' }}>
              <label>Título del Paso</label>
              <input 
                className="form-control" 
                style={{ fontSize: '18px', fontWeight: '700' }}
                value={editingStepData.titulo} 
                onChange={e => setEditingStepData({...editingStepData, titulo: e.target.value})} 
                placeholder="Ej: ¡Bienvenido a Ribeiro!"
              />
           </div>
           
           <div className="form-group mb-6">
              <label>Subtítulo / Descripción corta</label>
              <input 
                className="form-control" 
                value={editingStepData.subtitulo} 
                onChange={e => setEditingStepData({...editingStepData, subtitulo: e.target.value})} 
                placeholder="Una breve descripción que aparece en el listado..."
              />
           </div>

           <div className="section-divider" style={{ margin: '48px 0', borderBottom: '2px solid #f0f0f0' }}></div>
           
           <h4 className="mb-4" style={{ fontSize: '20px', fontWeight: '800' }}>Bloques de Contenido</h4>
           <p className="text-muted text-sm mb-4">Añade elementos para construir la experiencia del usuario.</p>
           
           {renderBlocksEditor(
             editingBlocks,
             (id, f, v) => setEditingBlocks(updateBlockInList(editingBlocks, id, f, v)),
             (id, k, v) => setEditingBlocks(updateBlockMetaInList(editingBlocks, id, k, v)),
             (id) => setEditingBlocks(editingBlocks.filter(b => b.id !== id)),
             (tipo) => setEditingBlocks([...editingBlocks, { id: 'temp-'+Date.now(), tipo, contenido: '', metadata: {} }])
           )}
        </div>
      </div>
    )
  );

  const renderPAFTab = () => {
    const planActivo = getPafPlanForAnio(selectedPafAnio);
    const itemsDelPlan = planActivo ? pafItems.filter(i => i.plan_id === planActivo.id) : [];
    const aniosExistentes = pafPlanes.map(p => p.anio);
    const cursosLinkeados = courses.filter(c => c.es_paf && planActivo && pafItems.filter(i => i.plan_id === planActivo.id).map(i => i.id).includes(c.paf_item_id));
    const pct = itemsDelPlan.length > 0 ? Math.round((cursosLinkeados.length / itemsDelPlan.length) * 100) : 0;

    const formItem = (autoFocus = false) => (
      <div style={{ background: '#f5f7ff', border: '1.5px solid #c7d0ff', borderRadius: '10px', padding: '12px', marginTop: '8px' }}>
        <input
          className="form-control" style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
          placeholder="Nombre de la capacitación" value={editingPafItem.titulo}
          onChange={e => setEditingPafItem({ ...editingPafItem, titulo: e.target.value })}
          autoFocus={autoFocus}
        />
        <select
          className="form-control" style={{ marginBottom: '8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
          value={editingPafItem.categoria_id || ''}
          onChange={e => setEditingPafItem({ ...editingPafItem, categoria_id: e.target.value || null })}
        >
          <option value="">Sin categoría</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input
          className="form-control" style={{ marginBottom: '10px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
          placeholder="Descripción (opcional)" value={editingPafItem.descripcion}
          onChange={e => setEditingPafItem({ ...editingPafItem, descripcion: e.target.value })}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn-primary" style={{ fontSize: '12px', padding: '5px 14px' }} onClick={handleSavePafItem}><Save size={12} /> Guardar</button>
          <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 14px' }} onClick={() => setEditingPafItem(null)}><X size={12} /> Cancelar</button>
        </div>
      </div>
    );

    return (
      <div className="admin-section">

        {/* Header con selector de año */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontWeight: '800', fontSize: '22px', margin: 0 }}>Plan Anual de Formación</h3>
            <p style={{ color: '#888', fontSize: '13px', margin: '2px 0 0' }}>Planificá y seguí las capacitaciones del año</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="number" className="form-control" style={{ width: '90px', fontSize: '13px' }} value={pafNewAnio} onChange={e => setPafNewAnio(parseInt(e.target.value))} />
            <button className="btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => handleCreatePafPlan(pafNewAnio)}><Plus size={15} /> Nuevo plan</button>
          </div>
        </div>

        {/* Tabs de año */}
        {aniosExistentes.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '28px', borderBottom: '2px solid #f0f0f0', paddingBottom: '0' }}>
            {aniosExistentes.sort((a, b) => a - b).map(anio => (
              <button key={anio} onClick={() => setSelectedPafAnio(anio)} style={{
                padding: '8px 22px', border: 'none', background: 'none', fontWeight: '700', fontSize: '15px',
                color: selectedPafAnio === anio ? '#4361ee' : '#aaa', cursor: 'pointer',
                borderBottom: selectedPafAnio === anio ? '2px solid #4361ee' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s',
              }}>{anio}</button>
            ))}
          </div>
        )}

        {!planActivo ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#bbb' }}>
            <Calendar size={52} style={{ margin: '0 auto 16px', opacity: 0.2, display: 'block' }} />
            <p style={{ fontWeight: '600', fontSize: '15px' }}>No hay plan PAF para {selectedPafAnio}</p>
            <p style={{ fontSize: '13px' }}>Creá uno con el botón "Nuevo plan"</p>
          </div>
        ) : (
          <>
            {/* Banner de progreso */}
            <div style={{ background: 'linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)', borderRadius: '16px', padding: '24px 28px', marginBottom: '28px', color: '#fff', display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px', fontWeight: '500' }}>Progreso del plan {selectedPafAnio}</div>
                <div style={{ fontSize: '36px', fontWeight: '900', lineHeight: 1 }}>{pct}%</div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>{cursosLinkeados.length} de {itemsDelPlan.length} ejecutadas</div>
              </div>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ background: '#fff', height: '100%', width: `${pct}%`, borderRadius: '8px', transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800' }}>{itemsDelPlan.length}</div>
                    <div style={{ fontSize: '11px', opacity: 0.75 }}>Planificadas</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#a7f3d0' }}>{cursosLinkeados.length}</div>
                    <div style={{ fontSize: '11px', opacity: 0.75 }}>Disponibles</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#fde68a' }}>{itemsDelPlan.length - cursosLinkeados.length}</div>
                    <div style={{ fontSize: '11px', opacity: 0.75 }}>Pendientes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de meses */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {MESES.map((nombreMes, idx) => {
                const mes = idx + 1;
                const itemsMes = itemsDelPlan.filter(i => i.mes === mes);
                const completadosMes = itemsMes.filter(i => courses.find(c => c.paf_item_id === i.id)).length;
                const isEditingInThisMes = editingPafItem && editingPafItem.mes === mes && !editingPafItem.id;
                const hayItems = itemsMes.length > 0;

                return (
                  <div key={mes} style={{ borderRadius: '14px', overflow: 'hidden', border: '1.5px solid', borderColor: hayItems ? '#e0e4ff' : '#f0f0f0', background: '#fff', boxShadow: hayItems ? '0 2px 12px rgba(67,97,238,0.07)' : 'none' }}>
                    {/* Cabecera del mes */}
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid', borderColor: hayItems ? '#e0e4ff' : '#f5f5f5', background: hayItems ? '#f5f7ff' : '#fafafa' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '800', fontSize: '13px', color: hayItems ? '#4361ee' : '#aaa' }}>{nombreMes}</span>
                        {hayItems && (
                          <span style={{ fontSize: '11px', background: completadosMes === itemsMes.length ? '#d1fae5' : '#e0e4ff', color: completadosMes === itemsMes.length ? '#16a34a' : '#4361ee', borderRadius: '20px', padding: '1px 8px', fontWeight: '700' }}>
                            {completadosMes}/{itemsMes.length}
                          </span>
                        )}
                      </div>
                      <button onClick={() => setEditingPafItem({ mes, titulo: '', descripcion: '', orden: itemsMes.length, plan_id: planActivo.id })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4361ee', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '600', padding: '2px 6px', borderRadius: '6px' }}>
                        <Plus size={13} /> Agregar
                      </button>
                    </div>

                    {/* Items del mes */}
                    <div style={{ padding: '10px' }}>
                      {itemsMes.map(item => {
                        const cursoVinculado = courses.find(c => c.paf_item_id === item.id);
                        const isEditingThis = editingPafItem?.id === item.id;
                        return isEditingThis ? (
                          <div key={item.id}>{formItem(false)}</div>
                        ) : (
                          <div key={item.id} style={{ borderRadius: '10px', marginBottom: '8px', overflow: 'hidden', border: '1px solid', borderColor: cursoVinculado ? '#bbf7d0' : '#ececec' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', background: cursoVinculado ? '#f0fdf4' : '#fff' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: '700', fontSize: '13px', lineHeight: '1.3', display: 'block' }}>{item.titulo}</span>
                                {item.categoria_id && (() => { const cat = categories.find(c => c.id === item.categoria_id); return cat ? <span style={{ display: 'inline-block', marginTop: '3px', fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '20px', background: cat.color + '22', color: cat.color }}>{cat.nombre}</span> : null; })()}
                              </div>
                              <div style={{ display: 'flex', gap: '2px', marginLeft: '6px', flexShrink: 0 }}>
                                <button className="action-btn edit" style={{ padding: '3px 5px' }} onClick={() => setEditingPafItem({ ...item })}><Edit2 size={12} /></button>
                                <button className="action-btn delete" style={{ padding: '3px 5px' }} onClick={() => handleDeletePafItem(item.id)}><Trash2 size={12} /></button>
                              </div>
                            </div>
                            {item.descripcion && <div style={{ padding: '0 10px 7px', fontSize: '11px', color: '#888' }}>{item.descripcion}</div>}
                            <div style={{ padding: '5px 10px 7px', display: 'flex', alignItems: 'center', gap: '5px', borderTop: '1px solid', borderColor: cursoVinculado ? '#bbf7d0' : '#f0f0f0', background: cursoVinculado ? '#dcfce7' : '#fafafa' }}>
                              {cursoVinculado ? (
                                <>
                                  <CheckCircle size={12} color="#16a34a" style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>Disponible para el personal</span>
                                </>
                              ) : (
                                <>
                                  <HelpCircle size={12} color="#f59e0b" style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600' }}>Pendiente de ejecución</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {isEditingInThisMes && formItem(true)}

                      {!hayItems && !isEditingInThisMes && (
                        <div style={{ textAlign: 'center', padding: '14px 0', color: '#ccc', fontSize: '12px' }}>Sin capacitaciones</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCapacitacionesTab = () => {
    const coursesFiltrados = courses.filter(c => {
      const matchSearch = !courseSearch || c.titulo.toLowerCase().includes(courseSearch.toLowerCase());
      const matchCat = !courseFilterCat || c.categoria_id === courseFilterCat;
      const matchPaf = courseFilterPaf === '' ? true : courseFilterPaf === 'si' ? !!c.es_paf : !c.es_paf;
      return matchSearch && matchCat && matchPaf;
    });
    return !isEditingCourse ? (
      <div className="admin-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div className="search-box">
              <Search size={18} />
              <input type="text" placeholder="Buscar curso..." value={courseSearch} onChange={e => setCourseSearch(e.target.value)} />
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
          <button className="btn-primary" style={{ flexShrink: 0, alignSelf: 'flex-start' }} onClick={handleCreateCourse}><Plus size={18} /> Nuevo Curso</button>
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
                  <td>{course.es_paf ? <span style={{ fontSize: '11px', fontWeight: '700', color: '#4361ee', background: '#e8ecff', borderRadius: '20px', padding: '2px 10px' }}>PAF</span> : <span style={{ fontSize: '11px', color: '#bbb' }}>—</span>}</td>
                  <td>{course.duracion_estimada}</td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => handleEditCourse(course)}><Edit2 size={16} /></button>
                    <button className="action-btn delete" onClick={() => {}}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      <div className="admin-form-section">
        <div className="form-header">
           <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <button className="btn-back" onClick={() => setIsEditingCourse(false)}><ChevronLeft size={20} /></button>
              <h3>{editingCourseData.id ? 'Editar Capacitación' : 'Nueva Capacitación'}</h3>
           </div>
           <div className="form-header-actions">
             <button className="btn-primary" onClick={handleSaveCourse} disabled={isSavingCourse} style={{ opacity: isSavingCourse ? 0.7 : 1, cursor: isSavingCourse ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
               {isSavingCourse
                 ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" /></svg> Guardando...</>
                 : <><Save size={18} /> Publicar Capacitación</>
               }
             </button>
           </div>
        </div>

        <div className="course-editor-grid" style={{ display: 'block' }}>
           <div className="course-main-form">
              <div className="edit-card">
                 <h4 className="mb-6" style={{ fontSize: '18px', fontWeight: '800' }}>1. Información General</h4>
                 
                 <div className="form-group" style={{ marginBottom: '32px' }}>
                   <label>Título del Curso</label>
                   <input 
                     className="form-control" 
                     style={{ fontSize: '18px', fontWeight: '700' }}
                     value={editingCourseData.titulo} 
                     onChange={e => setEditingCourseData({...editingCourseData, titulo: e.target.value})} 
                   />
                 </div>

                 <div className="form-row" style={{ gap: '32px', marginBottom: '32px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Categoría</label>
                      <select className="form-control" value={editingCourseData.categoria_id} onChange={e => setEditingCourseData({...editingCourseData, categoria_id: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Duración estimada (minutos)</label>
                      <input 
                        type="number"
                        className="form-control" 
                        value={editingCourseData.duracion_estimada.replace(/[^0-9]/g, '') || ''} 
                        onChange={e => setEditingCourseData({...editingCourseData, duracion_estimada: e.target.value + ' min'})} 
                      />
                    </div>
                 </div>

                 <div className="form-group" style={{ marginBottom: '32px' }}>
                   <label>Imagen de Portada (URL)</label>
                   <input className="form-control" value={editingCourseData.imagen_banner} onChange={e => setEditingCourseData({...editingCourseData, imagen_banner: e.target.value})} />
                 </div>

                 <div className="section-divider" style={{ margin: '32px 0 16px 0', borderBottom: '1px solid #f0f0f0' }}></div>

                 <h4 className="mb-4" style={{ fontSize: '16px', fontWeight: '800' }}>2. Plan Anual de Formación (PAF)</h4>

                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}>
                     <input
                       type="checkbox"
                       checked={!!editingCourseData.es_paf}
                       onChange={e => setEditingCourseData({ ...editingCourseData, es_paf: e.target.checked, paf_item_id: e.target.checked ? editingCourseData.paf_item_id : null })}
                     />
                     Esta capacitación pertenece al PAF
                   </label>
                 </div>

                 {editingCourseData.es_paf && (() => {
                   const aniosDisponibles = pafPlanes.map(p => p.anio);
                   const anioSeleccionado = editingCourseData._paf_anio || aniosDisponibles[0] || new Date().getFullYear();
                   const planActivo = pafPlanes.find(p => p.anio === anioSeleccionado);
                   const itemsDelPlan = planActivo ? pafItems.filter(i => i.plan_id === planActivo.id) : [];
                   return (
                     <div style={{ background: '#f8f9ff', border: '1px solid #e0e4ff', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                       <div className="form-row" style={{ gap: '16px', marginBottom: '12px' }}>
                         <div className="form-group" style={{ flex: 1 }}>
                           <label>Año del PAF</label>
                           <select className="form-control" value={anioSeleccionado}
                             onChange={e => setEditingCourseData({ ...editingCourseData, _paf_anio: parseInt(e.target.value), paf_item_id: null })}>
                             {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                           </select>
                         </div>
                         <div className="form-group" style={{ flex: 2 }}>
                           <label>Capacitación planificada</label>
                           <select className="form-control" value={editingCourseData.paf_item_id || ''}
                             onChange={e => {
                               const itemId = e.target.value || null;
                               const itemSeleccionado = pafItems.find(i => i.id === itemId);
                               setEditingCourseData({
                                 ...editingCourseData,
                                 paf_item_id: itemId,
                                 titulo: itemSeleccionado ? itemSeleccionado.titulo : editingCourseData.titulo
                               });
                             }}>
                             <option value="">-- Seleccionar --</option>
                             {MESES.map((mes, idx) => {
                               const itemsMes = itemsDelPlan.filter(i => i.mes === idx + 1);
                               if (!itemsMes.length) return null;
                               return <optgroup key={idx} label={mes}>
                                 {itemsMes.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
                               </optgroup>;
                             })}
                           </select>
                         </div>
                       </div>
                       {aniosDisponibles.length === 0 && <p className="text-muted text-xs">No hay planes PAF creados. Creá uno desde la pestaña PAF.</p>}
                     </div>
                   );
                 })()}

                 <div className="section-divider" style={{ margin: '32px 0 16px 0', borderBottom: '1px solid #f0f0f0' }}></div>

                 <h4 className="mb-2" style={{ fontSize: '16px', fontWeight: '800' }}>3. Visibilidad</h4>
                 <p className="text-muted text-xs mb-4">Sin reglas ni destinatarios, el curso es visible para todos. Con reglas, solo lo ven quienes coincidan. Los destinatarios individuales siempre lo ven, independientemente de las reglas.</p>

                 <div className="destinatarios-list mb-6">
                    {editingVisibilidadCurso.map((r, idx) => (
                      <div key={r.id} className="dest-row" style={{ marginBottom: '12px', gridTemplateColumns: '180px 1fr 40px' }}>
                        <select className="form-control" style={{ padding: '8px' }} value={r.campo} onChange={e => {
                          const n = [...editingVisibilidadCurso]; n[idx] = { ...n[idx], campo: e.target.value, valor: '' }; setEditingVisibilidadCurso(n);
                        }}>
                          <option value="department">Área / Departamento</option>
                          <option value="job_title">Puesto</option>
                          <option value="office_location">Ubicación</option>
                        </select>
                        <select
                          className="form-control" style={{ padding: '8px' }}
                          value={r.valor}
                          onChange={e => { const n = [...editingVisibilidadCurso]; n[idx] = { ...n[idx], valor: e.target.value }; setEditingVisibilidadCurso(n); }}
                        >
                          <option value="">-- Seleccionar --</option>
                          {(profileValues[r.campo] || []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <button className="action-btn delete" onClick={() => setEditingVisibilidadCurso(editingVisibilidadCurso.filter((_, i) => i !== idx))}><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <button className="btn-add-dest" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleAddVisibilidadCurso}>+ Agregar Regla</button>
                 </div>

                 <div className="section-divider" style={{ margin: '32px 0 24px 0', borderBottom: '1px solid #f0f0f0' }}></div>

                 <h4 className="mb-2" style={{ fontSize: '16px', fontWeight: '800' }}>3b. Destinatarios individuales</h4>
                 <p className="text-muted text-xs mb-4">Usuarios específicos que verán este curso, independientemente de las reglas de visibilidad.</p>

                 {/* Buscador de usuarios */}
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
                       !editingDestinatariosCurso.some(d => d.user_id === u.id) &&
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
                               setEditingDestinatariosCurso(prev => [...prev, { user_id: u.id, full_name: u.full_name, email: u.email }]);
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

                 {/* Lista de destinatarios seleccionados */}
                 {editingDestinatariosCurso.length > 0 ? (
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                     {editingDestinatariosCurso.map(d => (
                       <div key={d.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 20, padding: '4px 10px 4px 12px', fontSize: 13 }}>
                         <span style={{ fontWeight: 500 }}>{d.full_name || d.email}</span>
                         <button
                           style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 0 }}
                           onClick={() => setEditingDestinatariosCurso(prev => prev.filter(x => x.user_id !== d.user_id))}
                         >
                           <X size={13} />
                         </button>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>Ningún destinatario individual agregado.</p>
                 )}

                 <div className="section-divider" style={{ margin: '48px 0', borderBottom: '2px solid #f0f0f0' }}></div>

                 <div className="flex-between mb-6">
                    <h4 style={{ fontSize: '18px', fontWeight: '800' }}>4. Módulos del Curso</h4>
                    <button className="btn-secondary" onClick={handleAddModule}><Plus size={16} /> Nuevo Módulo</button>
                 </div>
                 
                 <p className="text-muted text-sm mb-6">Cada módulo puede contener múltiples bloques de texto, imágenes o videos.</p>

                 <div className="modules-list-editor">
                    {editingModules.map((mod, mIdx) => (
                      <div key={mod.id} className="module-item-card" style={{ marginBottom: '24px' }}>
                         <div className="module-item-header" style={{ padding: '16px 20px' }}>
                            <span className="mod-number">{mIdx + 1}</span>
                            <input 
                              className="form-control-ghost" 
                              style={{ fontSize: '16px', fontWeight: '800' }}
                              value={mod.titulo} 
                              onChange={e => {
                                const newM = [...editingModules];
                                newM[mIdx].titulo = e.target.value;
                                setEditingModules(newM);
                              }}
                            />
                            <button className="delete-mod" onClick={() => setEditingModules(editingModules.filter(m => m.id !== mod.id))}><Trash2 size={16} /></button>
                         </div>
                         <div className="module-item-body" style={{ padding: '24px' }}>
                            {renderBlocksEditor(
                              parseBlocks(mod.contenido),
                              (bId, f, v) => updateModuleBlock(mIdx, bId, f, v),
                              (bId, k, v) => updateModuleBlockMeta(mIdx, bId, k, v),
                              (bId) => removeBlockFromModule(mIdx, bId),
                              (tipo) => handleAddBlockToModule(mIdx, tipo)
                            )}
                         </div>
                      </div>
                    ))}
                 </div>

              {renderQuizBuilder()}
           </div>
        </div>

        {/* Botón guardar al pie */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 0 8px' }}>
          <button className="btn-primary" onClick={handleSaveCourse} disabled={isSavingCourse} style={{ opacity: isSavingCourse ? 0.7 : 1, cursor: isSavingCourse ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isSavingCourse
              ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" /></svg> Guardando...</>
              : <><Save size={18} /> Publicar Capacitación</>
            }
          </button>
        </div>

      </div>
      </div>
    );
  };

  /* ── Novedades ── */
  const fetchNovedades = async () => {
    const { data } = await supabase.from('novedades').select('*').order('orden', { ascending: true });
    setNovedades(data || []);
  };

  const handleSaveNovedad = async () => {
    if (!novedadFile && !novedadForm.imagen_url) return;
    setNovedadUploading(true);
    try {
      let imagen_url = novedadForm.imagen_url || null;
      if (novedadFile) {
        const ext = novedadFile.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('novedades').upload(path, novedadFile, { upsert: false });
        if (upErr) throw upErr;
        imagen_url = path;
      }
      const maxOrden = novedades.length > 0 ? Math.max(...novedades.map(n => n.orden || 0)) + 1 : 1;
      await supabase.from('novedades').insert({ titulo: novedadForm.titulo || null, link_url: novedadForm.link_url || null, imagen_url, activo: novedadForm.activo, orden: maxOrden, fecha_hasta: novedadForm.fecha_hasta || null });
      setNovedadForm({ titulo: '', link_url: '', activo: true, fecha_hasta: '' });
      setNovedadFile(null);
      await fetchNovedades();
    } catch (e) { alert(e.message); }
    finally { setNovedadUploading(false); }
  };

  const handleDeleteNovedad = async (nov) => {
    if (!window.confirm('¿Eliminar esta novedad?')) return;
    if (nov.imagen_url && !nov.imagen_url.startsWith('http')) {
      await supabase.storage.from('novedades').remove([nov.imagen_url]);
    }
    await supabase.from('novedades').delete().eq('id', nov.id);
    fetchNovedades();
  };

  const handleToggleNovedad = async (nov) => {
    await supabase.from('novedades').update({ activo: !nov.activo }).eq('id', nov.id);
    fetchNovedades();
  };

  const handleMoveNovedad = async (idx, dir) => {
    const arr = [...novedades];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx].orden, arr[swapIdx].orden] = [arr[swapIdx].orden, arr[idx].orden];
    await Promise.all([
      supabase.from('novedades').update({ orden: arr[idx].orden }).eq('id', arr[idx].id),
      supabase.from('novedades').update({ orden: arr[swapIdx].orden }).eq('id', arr[swapIdx].id),
    ]);
    fetchNovedades();
  };

  const getNovedadUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('novedades').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const renderNovedadesTab = () => (
    <div className="admin-list-panel">
      <div className="admin-list-header">
        <h3>Novedades <span className="admin-count">{novedades.length}</span></h3>
        <p className="text-muted text-xs" style={{ marginTop: 4 }}>Banners que se muestran en el Dashboard entre Accesos Rápidos y Próximos Eventos.</p>
      </div>

      {/* Formulario agregar */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Agregar novedad</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <input className="form-control" placeholder="Título (opcional)" value={novedadForm.titulo} onChange={e => setNovedadForm(f => ({ ...f, titulo: e.target.value }))} />
          <input className="form-control" placeholder="Link (opcional)" value={novedadForm.link_url} onChange={e => setNovedadForm(f => ({ ...f, link_url: e.target.value }))} />
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Visible hasta (opcional)</label>
            <input className="form-control" type="date" value={novedadForm.fecha_hasta} onChange={e => setNovedadForm(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input ref={novedadFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setNovedadFile(e.target.files[0] || null)} />
          <button className="btn-secondary" onClick={() => novedadFileRef.current?.click()}>
            <ImageIcon size={15} /> {novedadFile ? novedadFile.name : 'Seleccionar imagen'}
          </button>
          {novedadFile && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(novedadFile.size / 1024).toFixed(0)} KB</span>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginLeft: 'auto', cursor: 'pointer' }}>
            <input type="checkbox" checked={novedadForm.activo} onChange={e => setNovedadForm(f => ({ ...f, activo: e.target.checked }))} />
            Activo
          </label>
          <button className="btn-primary" onClick={handleSaveNovedad} disabled={novedadUploading || !novedadFile}>
            {novedadUploading ? 'Subiendo...' : '+ Agregar'}
          </button>
        </div>
      </div>

      {/* Lista */}
      {novedades.length === 0 ? (
        <p className="text-muted text-sm">No hay novedades todavía.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {novedades.map((nov, idx) => {
            const imgUrl = getNovedadUrl(nov.imagen_url);
            const today = new Date().toISOString().split('T')[0];
            const vencida = nov.fecha_hasta && nov.fecha_hasta < today;
            const porVencer = nov.fecha_hasta && !vencida && nov.fecha_hasta <= new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
            return (
              <div key={nov.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-secondary)', border: `1px solid ${vencida ? '#fca5a5' : 'var(--border-color)'}`, borderRadius: 10, padding: '12px 16px', opacity: vencida ? 0.6 : 1 }}>
                {/* Thumbnail */}
                <div style={{ width: 100, height: 36, borderRadius: 6, overflow: 'hidden', background: '#eee', flexShrink: 0 }}>
                  {imgUrl && <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{nov.titulo || <em style={{ color: 'var(--text-muted)' }}>Sin título</em>}</span>
                  {nov.link_url && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nov.link_url}</div>}
                  {nov.fecha_hasta && (
                    <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600, color: vencida ? '#ef4444' : porVencer ? '#f59e0b' : '#6b7280' }}>
                      {vencida ? '⛔ Vencida' : porVencer ? '⚠️ Vence' : 'Hasta'} {new Date(nov.fecha_hasta + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                {/* Activo toggle */}
                <button
                  onClick={() => handleToggleNovedad(nov)}
                  style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', background: nov.activo ? '#d1fae5' : '#f3f4f6', color: nov.activo ? '#059669' : '#6b7280', borderColor: nov.activo ? '#6ee7b7' : '#e5e7eb', fontWeight: 600 }}
                >
                  {nov.activo ? 'Activo' : 'Inactivo'}
                </button>
                {/* Reordenar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button className="action-btn" onClick={() => handleMoveNovedad(idx, -1)} disabled={idx === 0} style={{ padding: '2px 6px' }}><ChevronUp size={14} /></button>
                  <button className="action-btn" onClick={() => handleMoveNovedad(idx, 1)} disabled={idx === novedades.length - 1} style={{ padding: '2px 6px' }}><ChevronDown size={14} /></button>
                </div>
                {/* Eliminar */}
                <button className="action-btn delete" onClick={() => handleDeleteNovedad(nov)}><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const TAB_CONFIG = [
    { key: 'capacitaciones', label: 'Capacitaciones', icon: <GraduationCap size={18} />, onClick: () => { setActiveTab('capacitaciones'); setIsEditingCourse(false); } },
    { key: 'paf',            label: 'Plan PAF',        icon: <Calendar size={18} />,      onClick: () => setActiveTab('paf') },
    { key: 'onboarding',    label: 'Onboarding',      icon: <Rocket size={18} />,         onClick: () => { setActiveTab('onboarding'); setIsEditingStep(false); } },
    { key: 'eventos',       label: 'Eventos',          icon: <Calendar size={18} />,      onClick: () => { setActiveTab('eventos'); setIsEditingEvento(false); } },
    { key: 'faq',           label: 'FAQ',              icon: <MessageCircle size={18} />, onClick: () => { setActiveTab('faq'); setIsEditingFaq(false); } },
    { key: 'organigrama',   label: 'Organigrama',      icon: <LayoutGrid size={18} />,    onClick: () => { setActiveTab('organigrama'); setIsEditingOrg(false); } },
    { key: 'sgi',           label: 'SGI',              icon: <ShieldCheck size={18} />,   onClick: () => { setActiveTab('sgi'); closeSgiEdit(); } },
    { key: 'novedades',    label: 'Novedades',        icon: <Bell size={18} />,           onClick: () => { setActiveTab('novedades'); fetchNovedades(); } },
  ];

  const visibleTabs = TAB_CONFIG.filter(t => allowedTabs.includes(t.key));

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h2>Panel Admin</h2>
          <p>{isSuperAdmin ? 'Super Administrador' : 'Administrador'} · Gestiona Ribeiro 360</p>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-sidebar" style={{ minHeight: '80vh' }}>
          {visibleTabs.map(t => (
            <button key={t.key} className={`admin-tab ${activeTab === t.key ? 'active' : ''}`} onClick={t.onClick}>
              {t.icon} {t.label}
            </button>
          ))}
          {isSuperAdmin && (
            <>
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />
              <button className={`admin-tab ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => { setActiveTab('usuarios'); fetchAllUsers(); }}>
                <Users size={18} /> Usuarios
              </button>
            </>
          )}
        </div>

        <div className="admin-workarea">
          {activeTab === 'onboarding' && renderOnboardingTab()}
          {activeTab === 'capacitaciones' && renderCapacitacionesTab()}
          {activeTab === 'paf' && renderPAFTab()}
          {activeTab === 'eventos' && renderEventosTab()}
          {activeTab === 'faq' && renderFaqTab()}
          {activeTab === 'organigrama' && renderOrganigramaTab()}
          {activeTab === 'sgi' && renderSGITab()}
          {activeTab === 'novedades' && renderNovedadesTab()}
          {activeTab === 'usuarios' && isSuperAdmin && (
            <div className="admin-list-panel">
              <div className="admin-list-header">
                <h3>Usuarios <span className="admin-count">{allUsers.length}</span></h3>
              </div>
              {loadingUsers ? <p className="text-muted text-xs">Cargando...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allUsers.map(u => {
                    const isSelf = u.id === currentUserProfile?.id;
                    const currentTabs = u.admin_tabs ?? ALL_TABS;
                    const allSelected = ALL_TABS.every(t => currentTabs.includes(t));
                    const roleBadge = {
                      superadmin: { label: 'Super Admin', bg: '#1a1a1a', color: '#fff' },
                      admin:      { label: 'Admin',       bg: '#e8f5e9', color: '#2e7d32' },
                      user:       { label: 'Usuario',     bg: 'var(--bg-hover)', color: 'var(--text-muted)' },
                    }[u.role || 'user'];
                    const TAB_ICONS = {
                      capacitaciones: <GraduationCap size={14} />,
                      paf:            <Calendar size={14} />,
                      onboarding:     <Rocket size={14} />,
                      eventos:        <Calendar size={14} />,
                      faq:            <MessageCircle size={14} />,
                      organigrama:    <LayoutGrid size={14} />,
                      sgi:            <ShieldCheck size={14} />,
                    };
                    const TAB_LABELS = {
                      capacitaciones: 'Capacitaciones',
                      paf:            'Plan PAF',
                      onboarding:     'Onboarding',
                      eventos:        'Eventos',
                      faq:            'FAQ',
                      organigrama:    'Organigrama',
                      sgi:            'SGI',
                    };
                    return (
                      <div key={u.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
                        {/* Header del usuario */}
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', color: 'var(--text-main)', flexShrink: 0 }}>
                              {u.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <p style={{ fontWeight: '700', fontSize: '14px' }}>{u.full_name}</p>
                                {isSelf && <span style={{ fontSize: '11px', background: 'var(--primary-color)', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>Tú</span>}
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: roleBadge.bg, color: roleBadge.color }}>
                              {roleBadge.label}
                            </span>
                            {!isSelf && (
                              <select
                                className="form-control"
                                style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                value={u.role || 'user'}
                                onChange={e => handleUpdateUserRole(u.id, e.target.value)}
                              >
                                <option value="user">Usuario</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Sección de permisos solo para admins */}
                        {u.role === 'admin' && (
                          <div style={{ borderTop: '1px solid var(--border-color)', padding: '14px 20px', background: 'var(--bg-main)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ACCESO A SECCIONES</p>
                              <button
                                style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                onClick={() => handleUpdateUserTabs(u.id, allSelected ? [] : [...ALL_TABS])}
                              >
                                {allSelected ? 'Quitar todo' : 'Seleccionar todo'}
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '8px' }}>
                              {ALL_TABS.map(tab => {
                                const checked = currentTabs.includes(tab);
                                return (
                                  <label key={tab} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${checked ? 'var(--primary-color)' : 'var(--border-color)'}`, background: checked ? 'rgba(255,220,0,0.1)' : 'var(--bg-card)', cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: checked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                      {TAB_ICONS[tab]} {TAB_LABELS[tab]}
                                    </span>
                                    {/* Toggle switch */}
                                    <div style={{ position: 'relative', width: '32px', height: '18px', flexShrink: 0 }}>
                                      <input type="checkbox" checked={checked} style={{ display: 'none' }}
                                        onChange={() => {
                                          const base = u.admin_tabs ?? ALL_TABS;
                                          const next = checked ? base.filter(t => t !== tab) : [...base, tab];
                                          handleUpdateUserTabs(u.id, next);
                                        }}
                                      />
                                      <div onClick={() => {
                                        const base = u.admin_tabs ?? ALL_TABS;
                                        const next = checked ? base.filter(t => t !== tab) : [...base, tab];
                                        handleUpdateUserTabs(u.id, next);
                                      }} style={{ width: '32px', height: '18px', borderRadius: '9px', background: checked ? 'var(--primary-color)' : '#d1d5db', transition: 'background 0.2s', cursor: 'pointer', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '2px', left: checked ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
