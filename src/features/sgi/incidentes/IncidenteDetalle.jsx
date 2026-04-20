import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Clock, ChevronRight, Loader2, Search, User, Upload, X, Camera, HelpCircle, GitBranch, FileText } from 'lucide-react';
import IncidenteInformePDF from './IncidenteInformePDF';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import './IncidenteDetalle.css';

/* ── Constants ──────────────────────────────────────────────────────────────── */
const STEPS = [
  { num: 1, label: 'Registrar el Incidente' },
  { num: 2, label: 'Evidencias' },
  { num: 3, label: 'Designar el Equipo de Análisis' },
  { num: 4, label: 'Análisis de Causa Raíz' },
  { num: 5, label: 'Plan de Trabajo' },
  { num: 6, label: 'Cerrar las Acciones' },
  { num: 7, label: 'Verificar la Eficacia' },
];

const CLASIF_COLORS = {
  Ninguna:   { color: '#6B7280', rgb: '107,114,128' },
  Menor:     { color: '#10B981', rgb: '16,185,129' },
  Relevante: { color: '#F59E0B', rgb: '245,158,11' },
  Crítica:   { color: '#E71D36', rgb: '231,29,54' },
  Mayor:     { color: '#8B5CF6', rgb: '139,92,246' },
};

const TIPOS_INCIDENTE = ['Personal', 'Vehicular', 'Ambiental', 'Industrial'];
const CLASIFICACIONES = ['Ninguna', 'Menor', 'Relevante', 'Crítica', 'Mayor'];
const MAX_FOTOS = 6;

const EMPTY_FORM = {
  tipo:                     'Incidente',
  numero:                   '',
  fecha:                    new Date().toISOString().split('T')[0],
  hora_evento:              '',
  lugar:                    '',
  tarea_obra_servicio:      '',
  interno_vehiculo:         '',
  cliente_id:               '',
  nro_contrato:             '',
  contrato_na:              false,
  tipo_incidente:           '',
  clasificacion:            '',
  descripcion:              '',
  responsable_seguimiento_id: '',
  gerencia:                 '',
  sitio:                    '',
  emisor_id:                '',
};

/* ── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`incd-toast${type ? ` ${type}` : ''}`}>
      {type === 'success' && <Check size={16} />}
      {message}
    </div>
  );
}

/* ── Step Placeholder ───────────────────────────────────────────────────────── */
function StepPlaceholder({ step }) {
  return (
    <div className="incd-placeholder">
      <div className="incd-placeholder-icon"><Clock size={28} /></div>
      <h4>En desarrollo</h4>
      <p>El paso {step?.num} — <em>{step?.label}</em> — estará disponible próximamente.</p>
    </div>
  );
}

/* ── Stepper ────────────────────────────────────────────────────────────────── */
function Stepper({ steps, currentStep, pasoActual, isNew, onStepClick }) {
  return (
    <div className="incd-stepper">
      {steps.map((s, i) => {
        const isCompleted = s.num < pasoActual;
        const isCurrent   = s.num === currentStep;
        const isDisabled  = isNew ? s.num > 1 : s.num > pasoActual;
        return (
          <React.Fragment key={s.num}>
            <div
              className={`incd-step-item${isCompleted ? ' completed' : ''}${isCurrent ? ' current' : ''}${isDisabled ? ' disabled' : ''}`}
              onClick={() => !isDisabled && onStepClick(s.num)}
              title={isDisabled ? 'Completa los pasos anteriores primero' : s.label}
            >
              <div className="incd-step-indicator">
                {isCompleted ? <Check size={13} /> : s.num}
              </div>
              <div className="incd-step-info">
                <div className="incd-step-num">Paso {s.num}</div>
                <div className="incd-step-label">{s.label}</div>
              </div>
            </div>
            {i < steps.length - 1 && <div className={`incd-step-connector${s.num < pasoActual ? ' done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Person Picker Modal ────────────────────────────────────────────────────── */
function PersonPickerModal({ profiles, onSelect, onClose, title, multi = false, selectedIds = [] }) {
  const [query, setQuery] = useState('');
  const [localSelected, setLocalSelected] = useState(selectedIds);
  const inputRef = useRef(null);
  const PAGE_SIZE = 6;

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') { if (multi) onSelect(localSelected); onClose(); } };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose, multi, localSelected, onSelect]);

  const searching = query.trim().length > 0;
  const matched = searching
    ? profiles.filter(p => [p.full_name, p.job_title, p.department, p.office_location].some(v => v?.toLowerCase().includes(query.toLowerCase())))
    : profiles;
  const visible = searching ? matched : matched.slice(0, PAGE_SIZE);
  const hidden  = searching ? 0 : Math.max(0, matched.length - PAGE_SIZE);

  const getInitials = (name) => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const toggle = (id) => setLocalSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return createPortal(
    <div className="incd-picker-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { if (multi) onSelect(localSelected); onClose(); } }}>
      <div className="incd-picker-modal">
        <div className="incd-picker-header">
          <h4>{title}</h4>
          <button className="incd-picker-close" onClick={() => { if (multi) onSelect(localSelected); onClose(); }}><X size={16} /></button>
        </div>
        <div className="incd-picker-search">
          <Search size={14} className="incd-picker-search-icon" />
          <input ref={inputRef} type="text" placeholder="Buscar por nombre, cargo, gerencia..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <ul className="incd-picker-list">
          {visible.length === 0 && <li className="incd-picker-empty">Sin resultados</li>}
          {visible.map(p => {
            const checked = multi && localSelected.includes(p.id);
            return (
              <li key={p.id} className={`incd-picker-item${checked ? ' checked' : ''}`}
                onClick={() => { if (multi) toggle(p.id); else { onSelect(p); onClose(); } }}>
                {multi && <div className={`incd-picker-checkbox${checked ? ' on' : ''}`}>{checked && <Check size={11} />}</div>}
                <div className="incd-picker-avatar">
                  {p.avatar_url ? <img src={p.avatar_url} alt={p.full_name} /> : <span>{getInitials(p.full_name)}</span>}
                </div>
                <div className="incd-picker-info">
                  <span className="incd-picker-name">{p.full_name}</span>
                  {p.job_title && <span className="incd-picker-meta">{p.job_title}</span>}
                  {(p.department || p.office_location) && (
                    <span className="incd-picker-meta muted">{[p.department, p.office_location].filter(Boolean).join(' · ')}</span>
                  )}
                </div>
              </li>
            );
          })}
          {hidden > 0 && (
            <li className="incd-picker-hint"><Search size={13} /> Buscá para ver {hidden} usuario{hidden !== 1 ? 's' : ''} más</li>
          )}
        </ul>
        {multi && (
          <div className="incd-picker-footer">
            <span>{localSelected.length} seleccionado{localSelected.length !== 1 ? 's' : ''}</span>
            <button className="incd-picker-confirm" onClick={() => { onSelect(localSelected); onClose(); }}>Confirmar</button>
          </div>
        )}
      </div>
    </div>,
    document.getElementById('portal-root')
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function IncidenteDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id;
  const { user, profile } = useAuth();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const [loading, setLoading]       = useState(!isNew);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [showPDF, setShowPDF]       = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [pasoActual, setPasoActual] = useState(1);

  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [step2, setStep2]       = useState({ responsable_analisis_id: '', participantes: [] });
  const [step2Picker, setStep2Picker] = useState(null); // 'responsable' | 'participante'
  const [step3, setStep3]       = useState({
    tecnica: '5_porques',
    porques: ['', '', '', '', ''],
    causa_raiz: '',
  });

  const [profiles, setProfiles] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [gerencias, setGerencias] = useState([]);
  const [sitios, setSitios]     = useState([]);

  /* fotos pendientes de subir */
  const [pendingFotos, setPendingFotos]       = useState([]); // { file, preview }
  const [savedFotos, setSavedFotos]           = useState([]); // paths guardados en DB
  const fotoRef = useRef(null);

  const clasifColor = CLASIF_COLORS[form.clasificacion] || null;

  /* ── Lookups ── */
  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name, job_title, department, office_location, avatar_url').order('full_name'),
      supabase.from('centros_de_costos').select('id, nombre').eq('activo', true).order('nombre'),
    ]).then(([p, c]) => {
      if (p.data) {
        setProfiles(p.data);
        setGerencias([...new Set(p.data.map(x => x.department).filter(Boolean))].sort());
        setSitios([...new Set(p.data.map(x => x.office_location).filter(Boolean))].sort());
      }
      if (c.data) setClientes(c.data);
    });
  }, []);

  /* ── Default emisor ── */
  useEffect(() => {
    if (!isNew || !user?.id) return;
    setForm(f => ({
      ...f,
      emisor_id: f.emisor_id || user.id,
      gerencia:  f.gerencia  || profile?.department      || '',
      sitio:     f.sitio     || profile?.office_location || '',
    }));
  }, [isNew, user?.id, profile?.department, profile?.office_location]);

  /* ── Auto-numero ── */
  useEffect(() => {
    if (!isNew) return;
    const gen = async () => {
      const year   = new Date().getFullYear();
      const { count } = await supabase
        .from('inc_incidentes').select('id', { count: 'exact', head: true })
        .gte('created_at', `${year}-01-01`).lt('created_at', `${year + 1}-01-01`);
      setForm(f => ({ ...f, numero: `INC-${year}-${String((count || 0) + 1).padStart(3, '0')}` }));
    };
    gen();
  }, [isNew]);

  /* ── Load existing ── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from('inc_incidentes').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) { console.error(error); setLoading(false); return; }
        if (data) {
          setPasoActual(data.paso_actual || 1);
          setCurrentStep(data.paso_actual || 1);
          setForm({
            tipo:                       data.tipo                    || 'Incidente',
            numero:                     data.numero                  || '',
            fecha:                      data.fecha                   || new Date().toISOString().split('T')[0],
            hora_evento:                data.hora_evento             || '',
            lugar:                      data.lugar                   || '',
            tarea_obra_servicio:        data.tarea_obra_servicio     || '',
            interno_vehiculo:           data.interno_vehiculo        || '',
            cliente_id:                 data.cliente_id              || '',
            nro_contrato:               data.nro_contrato === 'N/A' ? '' : (data.nro_contrato || ''),
            contrato_na:                data.nro_contrato === 'N/A',
            tipo_incidente:             data.tipo_incidente          || '',
            clasificacion:              data.clasificacion           || '',
            descripcion:                data.descripcion             || '',
            equipo_analisis:            (() => { try { return Array.isArray(data.equipo_analisis) ? data.equipo_analisis : JSON.parse(data.equipo_analisis || '[]'); } catch { return []; } })(),
            responsable_seguimiento_id: data.responsable_seguimiento_id || '',
            gerencia:                   data.gerencia                || '',
            sitio:                      data.sitio                   || '',
            emisor_id:                  data.emisor_id               || '',
          });
          setSavedFotos(
            [data.foto_1, data.foto_2, data.foto_3, data.foto_4, data.foto_5, data.foto_6].filter(Boolean)
          );
          setStep2({
            responsable_analisis_id: data.responsable_analisis_id || '',
            participantes: (() => { try { return Array.isArray(data.participantes_analisis) ? data.participantes_analisis : JSON.parse(data.participantes_analisis || '[]'); } catch { return []; } })(),
          });
          setStep3({
            tecnica: data.acr_tecnica || '5_porques',
            porques: (() => { const raw = Array.isArray(data.acr_porques) ? data.acr_porques.map(p => p || '') : []; while (raw.length < 5) raw.push(''); return raw; })(),
            causa_raiz: data.acr_causa_raiz || '',
          });
        }
        setLoading(false);
      });
  }, [id]);

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), []);

  /* ── Save paso 1 ── */
  const handleSavePaso1 = async (advance = false) => {
    if (!form.descripcion.trim()) { showToast('La descripción es obligatoria', 'error'); return; }
    setSaving(true);
    try {
      /* subir fotos pendientes */
      const fotoPaths = [...savedFotos];
      for (const { file } of pendingFotos) {
        if (fotoPaths.length >= MAX_FOTOS) break;
        const ext  = file.name.split('.').pop();
        const path = `incidentes/${id || 'nuevo'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('inc-adjuntos').upload(path, file);
        if (!upErr) fotoPaths.push(path);
      }
      setPendingFotos([]);

      const payload = {
        numero:                     form.numero,
        fecha:                      form.fecha           || null,
        hora_evento:                form.hora_evento     || null,
        lugar:                      form.lugar           || null,
        tarea_obra_servicio:        form.tarea_obra_servicio || null,
        interno_vehiculo:           form.interno_vehiculo || null,
        cliente_id:                 form.cliente_id      || null,
        nro_contrato:               form.contrato_na ? 'N/A' : (form.nro_contrato || null),
        tipo_incidente:             form.tipo_incidente  || null,
        clasificacion:              form.clasificacion   || null,
        descripcion:                form.descripcion,
        responsable_seguimiento_id: form.responsable_seguimiento_id || null,
        gerencia:                   form.gerencia        || null,
        sitio:                      form.sitio           || null,
        emisor_id:                  form.emisor_id       || null,
        foto_1: fotoPaths[0] || null,
        foto_2: fotoPaths[1] || null,
        foto_3: fotoPaths[2] || null,
        foto_4: fotoPaths[3] || null,
        foto_5: fotoPaths[4] || null,
        foto_6: fotoPaths[5] || null,
        estado:      'abierto',
        paso_actual: advance ? 2 : 1,
      };

      if (isNew) {
        const { data, error } = await supabase.from('inc_incidentes').insert(payload).select('id').single();
        if (error) throw error;
        showToast('Incidente creado correctamente');
        navigate(`/sgi/incidentes/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase.from('inc_incidentes').update(payload).eq('id', id);
        if (error) throw error;
        if (advance) { setPasoActual(2); setCurrentStep(2); }
        showToast(advance ? 'Paso 1 completado' : 'Guardado correctamente');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el incidente', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Save Paso 2: Evidencias ── */
  const handleSavePaso2 = async (advance = false) => {
    if (!id) return;
    setSaving(true);
    try {
      const nextPaso = advance ? Math.max(pasoActual, 3) : pasoActual;
      const { error } = await supabase.from('inc_incidentes').update({ paso_actual: nextPaso }).eq('id', id);
      if (error) throw error;
      if (advance) { setPasoActual(p => Math.max(p, 3)); setCurrentStep(3); }
      showToast(advance ? 'Paso 2 completado' : 'Evidencias guardadas');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Save Paso 3: Designar Equipo ── */
  const handleSavePaso3 = async (advance = false) => {
    if (!step2.responsable_analisis_id) { showToast('Seleccioná un responsable de análisis', 'error'); return; }
    setSaving(true);
    try {
      const nextPaso = advance ? 4 : 3;
      const { error } = await supabase.from('inc_incidentes').update({
        responsable_analisis_id:  step2.responsable_analisis_id,
        participantes_analisis:   JSON.stringify(step2.participantes),
        paso_actual:              Math.max(pasoActual, nextPaso),
      }).eq('id', id);
      if (error) throw error;
      if (advance) { setPasoActual(p => Math.max(p, 4)); setCurrentStep(4); }
      showToast(advance ? 'Paso 3 completado' : 'Equipo guardado');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el equipo', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Save Paso 4: Análisis de Causa Raíz ── */
  const handleSavePaso4 = async (advance = false, tecnicaEfectiva = step3.tecnica) => {
    if (!id) return;
    setSaving(true);
    try {
      const nextPaso = advance ? Math.max(pasoActual, 5) : pasoActual;
      const { error } = await supabase.from('inc_incidentes').update({
        acr_tecnica:    tecnicaEfectiva,
        acr_porques:    step3.porques,
        acr_causa_raiz: step3.causa_raiz || null,
        paso_actual:    nextPaso,
      }).eq('id', id);
      if (error) throw error;
      if (advance) { setPasoActual(p => Math.max(p, 5)); setCurrentStep(5); }
      showToast(advance ? 'Paso 4 completado' : 'Análisis guardado');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el análisis', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Advance generic ── */
  const handleAdvanceStep = async (nextStep) => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('inc_incidentes').update({ paso_actual: nextStep }).eq('id', id);
      if (error) throw error;
      setPasoActual(nextStep);
      setCurrentStep(nextStep);
      showToast(`Paso ${nextStep - 1} completado`);
    } catch (err) {
      showToast('Error al avanzar el paso', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="incd-container">
        <div className="incd-loading"><Loader2 size={28} className="incd-spin" /><span>Cargando incidente...</span></div>
      </div>
    );
  }

  const step = STEPS.find(s => s.num === currentStep);

  return (
    <div className="incd-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showPDF && <IncidenteInformePDF incidenteId={id} onClose={() => setShowPDF(false)} />}

      {/* Header */}
      <div className="incd-page-header">
        <button className="incd-back-btn" onClick={() => navigate('/sgi/incidentes')}>
          <ArrowLeft size={15} /> Volver
        </button>
        <h2 className="incd-page-title">{isNew ? 'Nuevo Incidente' : form.numero || 'Incidente'}</h2>
        {!isNew && form.clasificacion && clasifColor && (
          <span className="incd-tipo-badge" style={{ background: `rgba(${clasifColor.rgb},0.12)`, color: clasifColor.color }}>
            {form.clasificacion}
          </span>
        )}
        {!isNew && form.tipo_incidente && (
          <span className="incd-clasif-badge">{form.tipo_incidente}</span>
        )}
        {!isNew && pasoActual >= 2 && (
          <button className="incd-pdf-btn" onClick={() => setShowPDF(true)}>
            <FileText size={14} /> Exportar PDF
          </button>
        )}
      </div>

      <div className="incd-layout">
        {/* Stepper */}
        <div className="incd-stepper-wrapper">
          <button className="incd-stepper-nav" disabled={currentStep === 1} onClick={() => setCurrentStep(s => Math.max(1, s - 1))}>
            <ArrowLeft size={16} />
          </button>
          <Stepper steps={STEPS} currentStep={currentStep} pasoActual={pasoActual} isNew={isNew} onStepClick={setCurrentStep} />
          <button className="incd-stepper-nav" disabled={currentStep === STEPS.length || currentStep >= pasoActual} onClick={() => setCurrentStep(s => Math.min(STEPS.length, s + 1))}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Step content */}
        <div className="incd-step-card">
          <div className="incd-panel-header">
            <div className="incd-panel-step-badge">{step?.num}</div>
            <div className="incd-panel-header-text">
              <h3>{step?.label}</h3>
              <p>{currentStep === 1 ? 'Completa la información del incidente registrado' : `Paso ${currentStep} de ${STEPS.length} del proceso de gestión`}</p>
            </div>
          </div>
          <div className="incd-step-body">
            {currentStep === 1 && (
              <Step1
                form={form} setForm={setForm}
                profiles={profiles} clientes={clientes} gerencias={gerencias} sitios={sitios}
                pendingFotos={pendingFotos} setPendingFotos={setPendingFotos}
                savedFotos={savedFotos} setSavedFotos={setSavedFotos}
                fotoRef={fotoRef}
                isNew={isNew} isAdmin={isAdmin} saving={saving}
                onSave={() => handleSavePaso1(false)}
                onSaveAndAdvance={() => handleSavePaso1(true)}
                pasoActual={pasoActual} id={id}
              />
            )}
            {currentStep === 2 && (
              <StepEvidencias
                incidenteId={id}
                saving={saving}
                pasoActual={pasoActual}
                clasificacion={form.clasificacion}
                onSave={() => handleSavePaso2(false)}
                onSaveAndAdvance={() => handleSavePaso2(true)}
              />
            )}
            {currentStep === 3 && (
              <Step2
                step2={step2} setStep2={setStep2}
                step2Picker={step2Picker} setStep2Picker={setStep2Picker}
                profiles={profiles} saving={saving}
                pasoActual={pasoActual}
                onSave={() => handleSavePaso3(false)}
                onSaveAndAdvance={() => handleSavePaso3(true)}
              />
            )}
            {currentStep === 4 && (
              <Step3
                step3={step3} setStep3={setStep3}
                clasificacion={form.clasificacion}
                saving={saving}
                pasoActual={pasoActual}
                onSave={() => {
                  const esCritico = form.clasificacion === 'Crítica' || form.clasificacion === 'Mayor';
                  handleSavePaso4(false, esCritico ? 'sistemico' : step3.tecnica);
                }}
                onSaveAndAdvance={() => {
                  const esCritico = form.clasificacion === 'Crítica' || form.clasificacion === 'Mayor';
                  handleSavePaso4(true, esCritico ? 'sistemico' : step3.tecnica);
                }}
              />
            )}
            {currentStep > 4 && <StepPlaceholder step={step} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1 ─────────────────────────────────────────────────────────────────── */
function Step1({ form, setForm, profiles, clientes, gerencias, sitios, pendingFotos, setPendingFotos, savedFotos, setSavedFotos, fotoRef, isNew, isAdmin, saving, onSave, onSaveAndAdvance, pasoActual, id }) {
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const emisor = profiles.find(p => p.id === form.emisor_id);
  const respSeg = profiles.find(p => p.id === form.responsable_seguimiento_id);

  const [picker, setPicker] = useState(null); // 'responsable'
  const [fotoUrls, setFotoUrls] = useState({});

  /* Generar signed URLs para fotos guardadas */
  useEffect(() => {
    if (savedFotos.length === 0) return;
    supabase.storage.from('inc-adjuntos').createSignedUrls(savedFotos, 3600).then(({ data }) => {
      const map = {};
      (data || []).forEach(s => { map[s.path] = s.signedUrl; });
      setFotoUrls(map);
    });
  }, [savedFotos]);

  const handleFotoAdd = (e) => {
    const files = Array.from(e.target.files);
    const total = savedFotos.length + pendingFotos.length;
    const available = MAX_FOTOS - total;
    files.slice(0, available).forEach(file => {
      const preview = URL.createObjectURL(file);
      setPendingFotos(prev => [...prev, { file, preview }]);
    });
    e.target.value = '';
  };

  const removePending = (idx) => {
    setPendingFotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeSaved = (path) => setSavedFotos(prev => prev.filter(p => p !== path));

  const totalFotos = savedFotos.length + pendingFotos.length;

  return (
    <div className="incd-step-form">

      {/* Clasificación — primer bloque */}
      <div className="incd-form-section">
        <div className="incd-section-title">Clasificación del incidente</div>
        <div className="incd-form-row">
          <div className="incd-form-group">
            <label className="incd-form-label">Tipo de incidente</label>
            <div className="incd-chip-group">
              {TIPOS_INCIDENTE.map(t => (
                <button key={t} type="button"
                  className={`incd-chip${form.tipo_incidente === t ? ' active' : ''}`}
                  onClick={() => set('tipo_incidente', form.tipo_incidente === t ? '' : t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="incd-form-group">
            <label className="incd-form-label">Clasificación</label>
            <div className="incd-chip-group">
              {CLASIFICACIONES.map(c => (
                <button key={c} type="button"
                  className={`incd-chip incd-chip-clasif${form.clasificacion === c ? ' active' : ''}`}
                  onClick={() => set('clasificacion', form.clasificacion === c ? '' : c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Datos del evento */}
      <div className="incd-form-section">
        <div className="incd-section-title">Datos del evento</div>

        <div className="incd-form-row">
          <div className="incd-form-group">
            <label className="incd-form-label">Número</label>
            <input type="text" className="incd-form-input incd-input-mono" value={form.numero} readOnly />
          </div>
          <div className="incd-form-group">
            <label className="incd-form-label">Fecha <span className="incd-required">*</span></label>
            <input type="date" className="incd-form-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>
        </div>

        <div className="incd-form-row">
          <div className="incd-form-group">
            <label className="incd-form-label">Hora del evento</label>
            <input type="time" className="incd-form-input" value={form.hora_evento} onChange={e => set('hora_evento', e.target.value)} />
          </div>
          <div className="incd-form-group">
            <label className="incd-form-label">Lugar / Ubicación</label>
            <input type="text" className="incd-form-input" placeholder="Ej: Planta Norte, Sector 3" value={form.lugar} onChange={e => set('lugar', e.target.value)} />
          </div>
        </div>

        <div className="incd-form-row">
          <div className="incd-form-group">
            <label className="incd-form-label">Gerencia</label>
            <select className="incd-form-input" value={form.gerencia} onChange={e => set('gerencia', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {gerencias.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="incd-form-group">
            <label className="incd-form-label">Sitio / Sucursal</label>
            <select className="incd-form-input" value={form.sitio} onChange={e => set('sitio', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {sitios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="incd-form-row">
          <div className="incd-form-group">
            <label className="incd-form-label">Tarea / Obra / Servicio</label>
            <input type="text" className="incd-form-input" placeholder="Ej: Mantenimiento eléctrico" value={form.tarea_obra_servicio} onChange={e => set('tarea_obra_servicio', e.target.value)} />
          </div>
          <div className="incd-form-group">
            <label className="incd-form-label">Interno / Vehículo</label>
            <input type="text" className="incd-form-input" placeholder="Ej: Camión interno #12" value={form.interno_vehiculo} onChange={e => set('interno_vehiculo', e.target.value)} />
          </div>
        </div>

        <div className="incd-form-row">
          <div className="incd-form-group">
            <label className="incd-form-label">Cliente</label>
            <select className="incd-form-input" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">— Sin cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="incd-form-group">
            <label className="incd-form-label">Contrato</label>
            <input type="text" className="incd-form-input" placeholder="Nro. de contrato" value={form.contrato_na ? 'N/A' : form.nro_contrato} readOnly={form.contrato_na} onChange={e => !form.contrato_na && set('nro_contrato', e.target.value)} />
            <label className="incd-check-inline">
              <input type="checkbox" checked={!!form.contrato_na} onChange={e => { set('contrato_na', e.target.checked); if (e.target.checked) set('nro_contrato', ''); }} />
              No aplica
            </label>
          </div>
        </div>
      </div>

      {/* Personas */}
      <div className="incd-form-section">
        <div className="incd-section-title">Personas involucradas</div>

        <div className="incd-form-row">
          <div className="incd-form-group">
            <label className="incd-form-label">Emisor</label>
            <div className="incd-form-readonly">
              {emisor ? <span>{emisor.full_name}{emisor.job_title ? ` · ${emisor.job_title}` : ''}</span> : <span className="incd-text-muted">—</span>}
            </div>
          </div>
          <div className="incd-form-group">
            <label className="incd-form-label">Responsable de seguimiento</label>
            <button type="button" className="incd-person-btn" onClick={() => setPicker('responsable')}>
              <User size={14} />
              {respSeg ? respSeg.full_name : '— Seleccionar —'}
              {respSeg && <span className="incd-person-clear" onClick={e => { e.stopPropagation(); set('responsable_seguimiento_id', ''); }}><X size={12} /></span>}
            </button>
          </div>
        </div>

      </div>

      {/* Descripción y Fotos — layout 2 columnas */}
      <div className="incd-form-section">
        <div className="incd-section-title">Descripción del evento y registros</div>
        <div className="incd-desc-fotos-row">
          <div className="incd-form-group incd-desc-col">
            <label className="incd-form-label">Descripción del evento <span className="incd-required">*</span></label>
            <textarea
              className="incd-form-textarea incd-textarea-tall"
              placeholder="Describí qué ocurrió, cuándo, dónde y cómo..."
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
            />
          </div>
          <div className="incd-form-group incd-fotos-col">
            <label className="incd-form-label">Registros fotográficos <span className="incd-fotos-count">({totalFotos}/{MAX_FOTOS})</span></label>
            <div className="incd-fotos-grid">
              {/* Fotos guardadas */}
              {savedFotos.map(path => (
                <div key={path} className="incd-foto-thumb">
                  {fotoUrls[path]
                    ? <img src={fotoUrls[path]} alt="registro" />
                    : <div className="incd-foto-loading"><Loader2 size={16} className="incd-spin" /></div>
                  }
                  <button className="incd-foto-remove" onClick={() => removeSaved(path)} title="Eliminar"><X size={12} /></button>
                </div>
              ))}
              {/* Fotos pendientes */}
              {pendingFotos.map((f, i) => (
                <div key={i} className="incd-foto-thumb incd-foto-pending">
                  <img src={f.preview} alt="nueva foto" />
                  <button className="incd-foto-remove" onClick={() => removePending(i)} title="Quitar"><X size={12} /></button>
                  <span className="incd-foto-pending-label">Por subir</span>
                </div>
              ))}
              {/* Botón agregar */}
              {totalFotos < MAX_FOTOS && (
                <button type="button" className="incd-foto-add" onClick={() => fotoRef.current?.click()}>
                  <Camera size={20} />
                  <span>Agregar</span>
                </button>
              )}
            </div>
            <input ref={fotoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFotoAdd} />
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="incd-step-actions">
        <button type="button" className="incd-btn-secondary" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 size={15} className="incd-spin" /> : null}
          {isNew ? 'Crear Incidente' : 'Guardar borrador'}
        </button>
        <button type="button" className="incd-btn-primary" onClick={onSaveAndAdvance} disabled={saving}>
          {saving ? <Loader2 size={15} className="incd-spin" /> : <Check size={15} />}
          Siguiente paso
        </button>
      </div>

      {/* Pickers */}
      {picker === 'responsable' && (
        <PersonPickerModal
          profiles={profiles}
          title="Responsable de seguimiento"
          onSelect={p => { set('responsable_seguimiento_id', p.id); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

/* ── Step 2: Equipo de Análisis ─────────────────────────────────────────────── */
/* ── Step 3 ─────────────────────────────────────────────────────────────────── */
const TECNICAS_INC = [
  { key: '5_porques',  icon: <HelpCircle size={20} />, title: '5 Por qués',    desc: 'Pregunta "¿Por qué?" de forma sucesiva para llegar a la causa raíz.' },
  { key: 'sistemico',  icon: <GitBranch size={20} />,  title: 'Método Sistémico', desc: 'Análisis sistémico de factores organizacionales, humanos y técnicos.' },
];

function Step3({ step3, setStep3, clasificacion, saving, pasoActual, onSave, onSaveAndAdvance }) {
  const esCritico = clasificacion === 'Crítica' || clasificacion === 'Mayor';
  // Derivar la técnica efectiva en render para evitar parpadeo con useEffect asíncrono
  const tecnicaEfectiva = esCritico ? 'sistemico' : step3.tecnica;

  return (
    <div className="incd-step-form">
      {/* Técnica */}
      <div className="incd-form-section">
        <p className="incd-section-title">Técnica de Análisis</p>
        {esCritico && (
          <div className="incd-info-banner">
            Por tratarse de un incidente <strong>{clasificacion}</strong>, el método de investigación debe ser el <strong>Método Sistémico</strong>, según la Matriz de Evaluación de Riesgos PG-7.
          </div>
        )}
        <div className="incd-tecnica-grid">
          {TECNICAS_INC.map(t => {
            const locked = esCritico && t.key !== 'sistemico';
            return (
              <div
                key={t.key}
                className={`incd-tecnica-card${tecnicaEfectiva === t.key ? ' active' : ''}${locked ? ' locked' : ''}`}
                onClick={() => !locked && setStep3(s => ({ ...s, tecnica: t.key }))}
              >
                <div className="incd-tecnica-card-icon">{t.icon}</div>
                <span className="incd-tecnica-card-title">{t.title}</span>
                <span className="incd-tecnica-card-desc">{t.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5 Por qués */}
      {tecnicaEfectiva === '5_porques' && (
        <div className="incd-form-section">
          <p className="incd-section-title">Los 5 Por qués</p>
          <div className="incd-porques-list">
            {(step3.porques || ['', '', '', '', '']).map((val, idx) => {
              const filled = (val || '').trim().length > 0;
              return (
                <div key={idx} className={`incd-porque-item${filled ? ' filled' : ''}`}>
                  <div className="incd-porque-num">{idx + 1}</div>
                  <div className="incd-porque-body">
                    <span className="incd-porque-label">¿Por qué {idx + 1}?</span>
                    <textarea
                      rows={2}
                      placeholder={`Escribe la causa ${idx + 1}...`}
                      value={val || ''}
                      onChange={e => {
                        const newPorques = [...step3.porques];
                        newPorques[idx] = e.target.value;
                        setStep3(s => ({ ...s, porques: newPorques }));
                      }}
                      className="incd-textarea"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sistémico */}
      {tecnicaEfectiva === 'sistemico' && (
        <div className="incd-form-section">
          <p className="incd-section-title">Análisis Sistémico</p>
          <div className="incd-form-group">
            <label className="incd-form-label">Descripción del análisis</label>
            <textarea
              rows={6}
              placeholder="Describe el análisis sistémico: factores organizacionales, humanos, técnicos y ambientales que contribuyeron al incidente..."
              value={step3.sistemico || ''}
              onChange={e => setStep3(s => ({ ...s, sistemico: e.target.value }))}
              className="incd-textarea"
            />
          </div>
        </div>
      )}

      {/* Causa Raíz */}
      <div className="incd-form-section">
        <p className="incd-section-title">Conclusión</p>
        <div className="incd-causa-raiz-box">
          <label>Causa Raíz Identificada</label>
          <textarea
            rows={3}
            placeholder="Describe la causa raíz detectada como resultado del análisis..."
            value={step3.causa_raiz}
            onChange={e => setStep3(s => ({ ...s, causa_raiz: e.target.value }))}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="incd-step-actions">
        <button type="button" className="incd-btn-secondary" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 size={15} className="incd-spin" /> : null}
          Guardar borrador
        </button>
        {pasoActual <= 4 && (
          <button type="button" className="incd-btn-primary" onClick={onSaveAndAdvance} disabled={saving}>
            {saving ? <Loader2 size={15} className="incd-spin" /> : <Check size={15} />}
            Siguiente paso
          </button>
        )}
      </div>
    </div>
  );
}

function PersonPickerBtn({ selectedId, profiles, onClick }) {
  const selected = profiles.find(p => p.id === selectedId);
  return (
    <button type="button" className="incd-person-btn" onClick={onClick}>
      <User size={14} />
      {selected ? selected.full_name : '— Seleccionar —'}
    </button>
  );
}

function Step2({ step2, setStep2, step2Picker, setStep2Picker, profiles, saving, pasoActual, onSave, onSaveAndAdvance }) {
  const getInitials = (name) => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  return (
    <div className="incd-step-form">
      {/* Responsable de Análisis */}
      <div className="incd-form-section">
        <p className="incd-section-title">Responsable de Análisis y Seguimiento</p>
        <div className="incd-form-grid cols-2">
          <div className="incd-form-group">
            <label className="incd-form-label">Responsable <span className="incd-required">*</span></label>
            <PersonPickerBtn
              selectedId={step2.responsable_analisis_id}
              profiles={profiles}
              onClick={() => setStep2Picker('responsable')}
            />
          </div>
        </div>
      </div>

      {/* Participantes */}
      <div className="incd-form-section">
        <p className="incd-section-title">Participantes del Análisis</p>
        <div className="incd-step2-participantes">
          <div className="incd-step2-selected">
            {step2.participantes.length === 0 ? (
              <p className="incd-step2-empty">No hay participantes seleccionados</p>
            ) : (
              step2.participantes.map(pid => {
                const p = profiles.find(x => x.id === pid);
                if (!p) return null;
                return (
                  <div key={pid} className="incd-step2-chip">
                    <div className="incd-step2-chip-avatar">
                      {p.avatar_url ? <img src={p.avatar_url} alt={p.full_name} /> : getInitials(p.full_name)}
                    </div>
                    <span className="incd-step2-chip-name">{p.full_name}</span>
                    <button
                      type="button"
                      className="incd-step2-chip-remove"
                      onClick={() => setStep2(s => ({ ...s, participantes: s.participantes.filter(x => x !== pid) }))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <button
            type="button"
            className="incd-step2-add-btn"
            onClick={() => setStep2Picker('participante')}
          >
            + Agregar participante
          </button>
        </div>
      </div>

      {/* Acciones */}
      <div className="incd-step-actions">
        <button type="button" className="incd-btn-secondary" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 size={15} className="incd-spin" /> : null}
          Guardar borrador
        </button>
        {pasoActual <= 3 && (
          <button type="button" className="incd-btn-primary" onClick={onSaveAndAdvance} disabled={saving}>
            {saving ? <Loader2 size={15} className="incd-spin" /> : <Check size={15} />}
            Siguiente paso
          </button>
        )}
      </div>

      {/* Pickers */}
      {step2Picker === 'responsable' && (
        <PersonPickerModal
          profiles={profiles}
          title="Seleccionar Responsable"
          onSelect={p => { setStep2(s => ({ ...s, responsable_analisis_id: p.id })); setStep2Picker(null); }}
          onClose={() => setStep2Picker(null)}
        />
      )}
      {step2Picker === 'participante' && (
        <PersonPickerModal
          profiles={profiles.filter(p => !step2.participantes.includes(p.id))}
          title="Agregar Participante"
          onSelect={p => { setStep2(s => ({ ...s, participantes: [...s.participantes, p.id] })); setStep2Picker(null); }}
          onClose={() => setStep2Picker(null)}
        />
      )}
    </div>
  );
}

const CLASIF_OPCIONAL = ['Ninguna', 'Menor'];

/* ── Step 2: Evidencias ─────────────────────────────────────────────────────── */
function StepEvidencias({ incidenteId, saving, pasoActual, clasificacion, onSaveAndAdvance, onSave }) {
  const isOpcional = CLASIF_OPCIONAL.includes(clasificacion);
  const [showPrompt, setShowPrompt] = useState(isOpcional);
  const [counts, setCounts] = useState({ p5: 0, timeline: 0 });
  const totalEvidencias = counts.p5 + counts.timeline;

  return (
    <div className="incd-step-form">
      {showPrompt ? (
        <div className="incd-ev-prompt">
          <div className="incd-ev-prompt-icon">
            <Camera size={32} />
          </div>
          <h4 className="incd-ev-prompt-title">Evidencias opcionales</h4>
          <p className="incd-ev-prompt-body">
            Para incidentes clasificados como <strong>{clasificacion || 'esta categoría'}</strong>, el registro de evidencias es opcional.
            <br />¿Deseas agregar la cronología y registros al incidente?
          </p>
          <div className="incd-ev-prompt-actions">
            <button
              type="button"
              className="incd-btn-primary"
              onClick={() => setShowPrompt(false)}
            >
              <Check size={15} /> Sí, agregar evidencias
            </button>
            <button
              type="button"
              className="incd-btn-secondary"
              onClick={onSaveAndAdvance}
              disabled={saving}
            >
              {saving ? <Loader2 size={15} className="incd-spin" /> : null}
              No, continuar sin evidencias
            </button>
          </div>
        </div>
      ) : (
        <>
          {isOpcional && (
            <div className="incd-info-banner">
              Las evidencias son <strong>opcionales</strong> para incidentes <strong>{clasificacion}</strong>. Podés omitirlas y continuar al siguiente paso.
            </div>
          )}
          <Cinco5PSection incidenteId={incidenteId} onCountChange={n => setCounts(c => ({ ...c, p5: n }))} />
          <TimelineSection incidenteId={incidenteId} onCountChange={n => setCounts(c => ({ ...c, timeline: n }))} />
          {!isOpcional && totalEvidencias === 0 && (
            <div className="incd-info-banner incd-info-banner--warn">
              Debés cargar al menos una evidencia (5P o cronología) para poder continuar al siguiente paso.
            </div>
          )}
          <div className="incd-step-actions">
            <button type="button" className="incd-btn-secondary" onClick={isOpcional ? onSaveAndAdvance : onSave} disabled={saving}>
              {saving ? <Loader2 size={15} className="incd-spin" /> : null}
              {isOpcional ? 'Omitir y continuar' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              className="incd-btn-primary"
              onClick={onSaveAndAdvance}
              disabled={saving || (!isOpcional && totalEvidencias === 0)}
              title={!isOpcional && totalEvidencias === 0 ? 'Cargá al menos una evidencia para continuar' : undefined}
            >
              {saving ? <Loader2 size={15} className="incd-spin" /> : <Check size={15} />}
              Siguiente paso
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── 5P Section ─────────────────────────────────────────────────────────────── */
const CATEGORIAS_5P = [
  {
    label: 'Proceso',
    ejemplos: ['Procedimientos operativos', 'Instructivos de trabajo', 'Análisis de riesgos (IPER, IPCR, etc)', 'Cumplimiento de tareas', 'Secuencia del proceso'],
  },
  {
    label: 'Posición',
    ejemplos: ['Ubicación exacta del evento', 'Condiciones del entorno (clima, iluminación)', 'Señalización existente', 'Orden y limpieza del área', 'Condiciones del terreno'],
  },
  {
    label: 'Partes',
    ejemplos: ['Equipos involucrados', 'Herramientas utilizadas', 'Materiales manipulados', 'Estado de los equipos', 'Fallas técnicas'],
  },
  {
    label: 'Personas',
    ejemplos: ['Operador involucrado', 'Supervisores', 'Testigos', 'Nivel de capacitación', 'Conducta observada'],
  },
  {
    label: 'Papel',
    ejemplos: ['Permisos de trabajo, documentos de la tarea', 'Análisis de Trabajo (Petra, ATS, etc)', 'Check list', 'Procedimientos vigentes', 'Registros de capacitación'],
  },
];

function Cinco5PSection({ incidenteId, onCountChange }) {
  const { user } = useAuth();
  const [evidencias, setEvidencias]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeCategoria, setActiveCategoria] = useState(null);
  const [saving, setSaving]               = useState(false);
  const [newDesc, setNewDesc]             = useState('');
  const [newFile, setNewFile]             = useState(null);
  const [signedUrls, setSignedUrls]       = useState({});
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (!incidenteId) return;
    setLoading(true);
    const { data } = await supabase.from('inc_5p').select('*')
      .eq('incidente_id', incidenteId).order('created_at', { ascending: true });
    const rows = data || [];
    setEvidencias(rows);
    onCountChange?.(rows.length);
    // Generar signed URLs para adjuntos
    const paths = rows.map(r => r.adjunto_path).filter(Boolean);
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from('inc-adjuntos').createSignedUrls(paths, 3600);
      const map = {};
      (signed || []).forEach(s => { map[s.path] = s.signedUrl; });
      setSignedUrls(map);
    }
    setLoading(false);
  }, [incidenteId]);

  useEffect(() => { load(); }, [load]);

  const handleSelectCategoria = (cat) => {
    setActiveCategoria(prev => prev === cat ? null : cat);
    setNewDesc('');
    setNewFile(null);
  };

  const handleAdd = async () => {
    if (!newDesc.trim() && !newFile) return;
    setSaving(true);
    try {
      let adjunto_path = null;
      if (newFile) {
        const ext  = newFile.name.split('.').pop();
        const path = `incidentes/${incidenteId}/5p/${activeCategoria}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('inc-adjuntos').upload(path, newFile);
        if (!upErr) adjunto_path = path;
      }
      await supabase.from('inc_5p').insert({
        incidente_id: incidenteId,
        categoria:    activeCategoria,
        descripcion:  newDesc.trim() || null,
        adjunto_path,
        created_by:   user?.id || null,
      });
      setNewDesc('');
      setNewFile(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('inc_5p').delete().eq('id', id);
    setEvidencias(prev => prev.filter(r => r.id !== id));
  };

  const countFor = (label) => evidencias.filter(r => r.categoria === label).length;
  const rowsFor  = (label) => evidencias.filter(r => r.categoria === label);

  const isImage = (path) => path && /\.(jpe?g|png|gif|webp|svg)$/i.test(path);

  return (
    <div className="incd-form-section">
      <div className="incd-section-title">Evidencias 5P</div>

      {/* Selector de categorías */}
      <div className="incd-5p-tabs">
        {CATEGORIAS_5P.map(({ label, ejemplos }) => {
          const count = countFor(label);
          const isActive = activeCategoria === label;
          return (
            <div key={label} className="incd-5p-tab-wrap">
              <button
                type="button"
                className={`incd-5p-tab${isActive ? ' active' : ''}${count > 0 ? ' has-items' : ''}`}
                onClick={() => handleSelectCategoria(label)}
              >
                <span className="incd-5p-tab-label">{label}</span>
                {count > 0 && <span className="incd-5p-tab-badge">{count}</span>}
              </button>
              <div className="incd-5p-tooltip">
                <p className="incd-5p-tooltip-title">Ejemplos de evidencias</p>
                <ul>
                  {ejemplos.map(ej => <li key={ej}>{ej}</li>)}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel de la categoría activa */}
      {activeCategoria && (
        <div className="incd-5p-panel">
          {loading ? (
            <div className="incd-timeline-empty"><Loader2 size={16} className="incd-spin" /> Cargando...</div>
          ) : (
            <>
              {/* Lista de evidencias existentes */}
              {rowsFor(activeCategoria).length === 0 ? (
                <p className="incd-5p-empty">Sin evidencias cargadas para <strong>{activeCategoria}</strong></p>
              ) : (
                <div className="incd-5p-list">
                  {rowsFor(activeCategoria).map(ev => (
                    <div key={ev.id} className="incd-5p-item">
                      <div className="incd-5p-item-body">
                        {ev.descripcion && <p className="incd-5p-item-desc">{ev.descripcion}</p>}
                        {ev.adjunto_path && (
                          isImage(ev.adjunto_path) && signedUrls[ev.adjunto_path] ? (
                            <a href={signedUrls[ev.adjunto_path]} target="_blank" rel="noreferrer">
                              <img src={signedUrls[ev.adjunto_path]} alt="adjunto" className="incd-5p-thumb" />
                            </a>
                          ) : signedUrls[ev.adjunto_path] ? (
                            <a href={signedUrls[ev.adjunto_path]} target="_blank" rel="noreferrer" className="incd-5p-file-link">
                              <Upload size={13} /> Ver adjunto
                            </a>
                          ) : null
                        )}
                      </div>
                      <button className="incd-tl-btn del" onClick={() => handleDelete(ev.id)} title="Eliminar"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario de nueva evidencia */}
              <div className="incd-5p-add-form">
                <textarea
                  className="incd-textarea"
                  rows={2}
                  placeholder={`Descripción de la evidencia de ${activeCategoria}...`}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
                <div className="incd-5p-add-row">
                  <button
                    type="button"
                    className={`incd-5p-file-btn${newFile ? ' has-file' : ''}`}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={14} />
                    {newFile ? newFile.name : 'Adjuntar archivo'}
                    {newFile && (
                      <span className="incd-5p-file-clear" onClick={e => { e.stopPropagation(); setNewFile(null); }}><X size={11} /></span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="incd-btn-primary incd-5p-confirm-btn"
                    onClick={handleAdd}
                    disabled={saving || (!newDesc.trim() && !newFile)}
                  >
                    {saving ? <Loader2 size={14} className="incd-spin" /> : <Check size={14} />}
                    Agregar
                  </button>
                </div>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { setNewFile(e.target.files[0] || null); e.target.value = ''; }} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Timeline Section ───────────────────────────────────────────────────────── */
function TimelineSection({ incidenteId, onCountChange }) {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  // Estado para filas guardadas en DB (cuando ya hay id)
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(!!incidenteId);
  const [saving, setSaving]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({});

  // Fila de nueva entrada
  const [newRow, setNewRow] = useState({ fecha: today, hora: '', actividad: '' });

  const load = useCallback(async () => {
    if (!incidenteId) return;
    setLoading(true);
    const { data } = await supabase
      .from('inc_timeline').select('*')
      .eq('incidente_id', incidenteId)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true, nullsFirst: true });
    const rows = data || [];
    setRows(rows);
    onCountChange?.(rows.length);
    setLoading(false);
  }, [incidenteId]);

  useEffect(() => { load(); }, [load]);

  const formatFecha = (d) => { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; };
  const formatHora  = (h) => h ? h.slice(0, 5) : '—';

  /* ── Agregar fila ── */
  const handleAdd = async () => {
    if (!newRow.actividad.trim()) return;
    const entry = { fecha: newRow.fecha, hora: newRow.hora || null, actividad: newRow.actividad.trim() };

    setSaving(true);
    await supabase.from('inc_timeline').insert({ ...entry, incidente_id: incidenteId, created_by: user?.id || null });
    setNewRow({ fecha: today, hora: '', actividad: '' });
    await load();
    setSaving(false);
  };

  /* ── Eliminar ── */
  const handleDelete = async (rowId) => {
    await supabase.from('inc_timeline').delete().eq('id', rowId);
    setRows(r => r.filter(x => x.id !== rowId));
  };

  /* ── Editar (solo filas DB) ── */
  const startEdit = (row) => { setEditingId(row.id); setEditForm({ fecha: row.fecha, hora: row.hora || '', actividad: row.actividad }); };

  const handleSaveEdit = async () => {
    if (!editForm.actividad.trim()) return;
    await supabase.from('inc_timeline').update({ fecha: editForm.fecha, hora: editForm.hora || null, actividad: editForm.actividad.trim() }).eq('id', editingId);
    setEditingId(null);
    await load();
  };

  // Filas a mostrar ordenadas por fecha+hora
  const allRows = rows.slice().sort((a, b) => {
    const ka = `${a.fecha || ''}${a.hora || '99:99'}`;
    const kb = `${b.fecha || ''}${b.hora || '99:99'}`;
    return ka.localeCompare(kb);
  });

  return (
    <div className="incd-form-section">
      <div className="incd-section-title">Línea del tiempo / Cronología</div>

      <div className="incd-timeline-table-wrap">
        <table className="incd-timeline-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Fecha</th>
              <th style={{ width: 80 }}>Hora</th>
              <th>Actividad</th>
              <th style={{ width: 72 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}><div className="incd-timeline-empty">Cargando...</div></td></tr>
            ) : allRows.length === 0 ? (
              <tr><td colSpan={4}><div className="incd-timeline-empty">Sin eventos — agregá la primera fila abajo</div></td></tr>
            ) : allRows.map((row) => (
              editingId === row.id ? (
                <tr key={row.id} className="incd-timeline-editing">
                  <td><input type="date" className="incd-tl-input" value={editForm.fecha}     onChange={e => setEditForm(f => ({ ...f, fecha: e.target.value }))} /></td>
                  <td><input type="time" className="incd-tl-input" value={editForm.hora}      onChange={e => setEditForm(f => ({ ...f, hora:  e.target.value }))} /></td>
                  <td><input type="text" className="incd-tl-input" value={editForm.actividad} onChange={e => setEditForm(f => ({ ...f, actividad: e.target.value }))} autoFocus /></td>
                  <td>
                    <div className="incd-tl-actions">
                      <button className="incd-tl-btn save"   onClick={handleSaveEdit}           title="Guardar"><Check size={13} /></button>
                      <button className="incd-tl-btn cancel" onClick={() => setEditingId(null)} title="Cancelar"><X size={13} /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={row.id}>
                  <td className="incd-tl-fecha">{formatFecha(row.fecha)}</td>
                  <td className="incd-tl-hora">{formatHora(row.hora)}</td>
                  <td className="incd-tl-actividad">{row.actividad}</td>
                  <td>
                    <div className="incd-tl-actions">
                      <button className="incd-tl-btn edit" onClick={() => startEdit(row)} title="Editar"><Clock size={13} /></button>
                      <button className="incd-tl-btn del"  onClick={() => handleDelete(row.id)} title="Eliminar"><X size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            ))}

            {/* Nueva entrada */}
            <tr className="incd-timeline-new-row">
              <td><input type="date" className="incd-tl-input" value={newRow.fecha} onChange={e => setNewRow(r => ({ ...r, fecha: e.target.value }))} /></td>
              <td><input type="time" className="incd-tl-input" value={newRow.hora}  onChange={e => setNewRow(r => ({ ...r, hora:  e.target.value }))} /></td>
              <td><input type="text" className="incd-tl-input" placeholder="Describí la actividad o evento..." value={newRow.actividad}
                onChange={e => setNewRow(r => ({ ...r, actividad: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} /></td>
              <td>
                <button className="incd-tl-btn add" onClick={handleAdd} disabled={saving || !newRow.actividad.trim()} title="Agregar">
                  {saving ? <Loader2 size={13} className="incd-spin" /> : <Check size={13} />}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
