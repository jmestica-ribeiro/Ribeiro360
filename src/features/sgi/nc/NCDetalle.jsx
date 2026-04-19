import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Upload, X, FileText, Clock, ChevronRight, Loader2, Search, User, HelpCircle, GitBranch, Settings, Package, Cloud, BarChart2, BookOpen, Users, Paperclip, Download } from 'lucide-react';
import NCExportarPDF from './NCInformePDF';
import NormaMultiSelector from './NormaMultiSelector';
import DocInternoSelector from './DocInternoSelector';
import './NormaPuntoSelector.css';
import { supabase } from '../../../lib/supabase';
import { notificarAsignacion } from '../../../lib/ncNotificaciones';
import { useAuth } from '../../../contexts/AuthContext';
import './NCDetalle.css';

/* ── Constants ──────────────────────────────────────────────────────────────── */
const STEPS = [
  { num: 1, label: 'Registrar el Hallazgo' },
  { num: 2, label: 'Designar el Equipo de Análisis' },
  { num: 3, label: 'Análisis de Causa Raíz' },
  { num: 4, label: 'Plan de Trabajo' },
  { num: 5, label: 'Verificar la Eficacia' },
];

const TIPOS = ['NC', 'OBS', 'OM', 'Fortaleza'];

const TIPO_PREFIX = { NC: 'NC', OBS: 'OBS', OM: 'OM', Fortaleza: 'F' };

const TIPO_COLORS = {
  NC:        { color: '#E71D36', rgb: '231,29,54' },
  OBS:       { color: '#F59E0B', rgb: '245,158,11' },
  OM:        { color: '#3B82F6', rgb: '59,130,246' },
  Fortaleza: { color: '#10B981', rgb: '16,185,129' },
};

const TIPO_TOOLTIPS = {
  NC:        'No Conformidad: incumplimiento de un requisito. Requiere análisis de causa y acción correctiva.',
  OBS:       'Observación: situación que podría derivar en una NC si no se atiende a tiempo.',
  OM:        'Oportunidad de Mejora: aspecto que, sin ser un incumplimiento, puede optimizarse.',
  Fortaleza: 'Fortaleza: práctica destacada que sirve como referencia positiva.',
};

const FUENTES = [
  { key: 'fuente_quejas',                label: 'Quejas / Reclamos' },
  { key: 'fuente_auditoria_interna',     label: 'Auditoría Interna' },
  { key: 'fuente_auditoria_externa',     label: 'Auditoría Externa' },
  { key: 'fuente_requisitos_legales',    label: 'Requisitos Legales' },
  { key: 'fuente_norma',                 label: 'Norma' },
  { key: 'fuente_documento_interno',     label: 'Documento Interno' },
  { key: 'fuente_producto_no_conforme',  label: 'Producto no conforme' },
  { key: 'fuente_servicio_no_conforme',  label: 'Servicio no conforme' },
  { key: 'fuente_otros',                 label: 'Otros' },
];

const NORMAS = ['ISO 9001', 'ISO 14001', 'ISO 45001', 'ISO 27001', 'Otra'];


const MAX_FILES = 5;

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`ncd-toast${type ? ` ${type}` : ''}`}>
      {type === 'success' ? <Check size={16} /> : null}
      {message}
    </div>
  );
}

/* ── Placeholder for future steps ──────────────────────────────────────────── */
function StepPlaceholder({ step }) {
  return (
    <div className="ncd-placeholder">
      <div className="ncd-placeholder-icon">
        <Clock size={28} />
      </div>
      <h4>Próximamente</h4>
      <p>
        El paso {step?.num} — <em>{step?.label}</em> — estará disponible en una próxima
        versión del módulo.
      </p>
    </div>
  );
}

/* ── Person Picker Button ───────────────────────────────────────────────────── */
function PersonPickerBtn({ selectedId, profiles, onClick, disabled }) {
  const selected = profiles.find(p => p.id === selectedId);
  return (
    <button
      type="button"
      className={`ncd-person-btn${disabled ? ' ncd-input-readonly' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <User size={14} />
      {disabled ? 'N/A' : selected ? selected.full_name : '— Seleccionar —'}
    </button>
  );
}

/* ── Multi Person Picker Button ─────────────────────────────────────────────── */
function MultiPersonPickerBtn({ selectedIds, profiles, onClick }) {
  const selected = profiles.filter(p => selectedIds.includes(p.id));
  return (
    <button type="button" className="ncd-multi-person-btn" onClick={onClick}>
      {selected.length === 0 ? (
        <span className="ncd-multi-person-placeholder"><User size={14} /> — Seleccionar —</span>
      ) : (
        <div className="ncd-multi-person-tags">
          {selected.map(p => (
            <span key={p.id} className="ncd-multi-person-tag">{p.full_name}</span>
          ))}
        </div>
      )}
    </button>
  );
}

/* ── Person Picker Modal ────────────────────────────────────────────────────── */
const PAGE_SIZE = 5;

function PersonPickerModal({ profiles, onSelect, onClose, title, multi = false, selectedIds = [] }) {
  const [query, setQuery] = useState('');
  const [localSelected, setLocalSelected] = useState(selectedIds);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const isSearching = query.trim().length > 0;

  const matched = isSearching
    ? profiles.filter(p =>
        [p.full_name, p.job_title, p.department, p.office_location]
          .some(v => v?.toLowerCase().includes(query.toLowerCase()))
      )
    : profiles;

  const visible = isSearching ? matched : matched.slice(0, PAGE_SIZE);
  const hidden  = isSearching ? 0 : Math.max(0, matched.length - PAGE_SIZE);

  const getInitials = (name) =>
    name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  const toggleLocal = (id) => {
    setLocalSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return createPortal(
    <div className="ncd-picker-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) { if (multi) onSelect(localSelected); onClose(); } }}>
      <div className="ncd-picker-modal">
        <div className="ncd-picker-header">
          <h4>{title}</h4>
          <button className="ncd-picker-close" onClick={() => { if (multi) onSelect(localSelected); onClose(); }}><X size={16} /></button>
        </div>
        <div className="ncd-picker-search">
          <Search size={15} className="ncd-picker-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar por nombre, cargo, gerencia..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <ul className="ncd-picker-list">
          {visible.length === 0 && (
            <li className="ncd-picker-empty">No se encontraron resultados</li>
          )}
          {visible.map(p => {
            const isChecked = multi && localSelected.includes(p.id);
            return (
              <li
                key={p.id}
                className={`ncd-picker-item${isChecked ? ' ncd-picker-item--checked' : ''}`}
                onClick={() => { if (multi) { toggleLocal(p.id); } else { onSelect(p); onClose(); } }}
              >
                {multi && (
                  <div className={`ncd-picker-checkbox${isChecked ? ' checked' : ''}`}>
                    {isChecked && <Check size={11} />}
                  </div>
                )}
                <div className="ncd-picker-avatar">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.full_name} />
                    : <span>{getInitials(p.full_name)}</span>
                  }
                </div>
                <div className="ncd-picker-info">
                  <span className="ncd-picker-name">{p.full_name}</span>
                  {p.job_title && <span className="ncd-picker-meta">{p.job_title}</span>}
                  {(p.department || p.office_location) && (
                    <span className="ncd-picker-meta muted">
                      {[p.department, p.office_location].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {hidden > 0 && (
            <li className="ncd-picker-hint">
              <Search size={13} />
              Buscá para ver {hidden} usuario{hidden !== 1 ? 's' : ''} más
            </li>
          )}
        </ul>
        {multi && (
          <div className="ncd-picker-footer">
            <span className="ncd-picker-footer-count">{localSelected.length} seleccionado{localSelected.length !== 1 ? 's' : ''}</span>
            <button className="ncd-picker-confirm" onClick={() => { onSelect(localSelected); onClose(); }}>Confirmar</button>
          </div>
        )}
      </div>
    </div>,
    document.getElementById('portal-root')
  );
}

/* ── Accion Modal Inner ─────────────────────────────────────────────────────── */
function AccionModalInner({ editingAccion, accionForm, setAccionForm, profiles, accionPicker, setAccionPicker, onClose, onSaved, onHitoSaved, hallazgoId, hallazgoNumero }) {
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('datos'); // unused, kept for compat
  const [hitos, setHitos] = useState([]);
  const [hitosLoading, setHitosLoading] = useState(false);
  const [hitoForm, setHitoForm] = useState({ descripcion: '', fecha: new Date().toISOString().split('T')[0], porcentaje: 10 });
  const [hitoFiles, setHitoFiles] = useState([]);
  const [savingHito, setSavingHito] = useState(false);
  const hitoFileRef = useRef();

  // Cargar hitos y generar signed URLs para adjuntos
  useEffect(() => {
    if (!editingAccion?.id) return;
    setHitosLoading(true);
    supabase.from('nc_accion_hitos')
      .select('*')
      .eq('accion_id', editingAccion.id)
      .order('fecha', { ascending: true })
      .then(async ({ data }) => {
        const rows = data || [];
        // Generar signed URLs para todos los adjuntos
        const withUrls = await Promise.all(rows.map(async h => {
          const paths = [h.adjunto_1, h.adjunto_2, h.adjunto_3].filter(Boolean);
          if (paths.length === 0) return h;
          const { data: signed } = await supabase.storage
            .from('nc-adjuntos')
            .createSignedUrls(paths, 3600); // 1 hora
          const urlMap = {};
          (signed || []).forEach(s => { urlMap[s.path] = s.signedUrl; });
          return {
            ...h,
            adjunto_1_url: h.adjunto_1 ? urlMap[h.adjunto_1] : null,
            adjunto_2_url: h.adjunto_2 ? urlMap[h.adjunto_2] : null,
            adjunto_3_url: h.adjunto_3 ? urlMap[h.adjunto_3] : null,
          };
        }));
        setHitos(withUrls);
        setHitosLoading(false);
      });
  }, [editingAccion?.id]);

  // Avance calculado como suma de hitos (max 100) — fuente de verdad
  const avanceCalculado = Math.min(100, hitos.reduce((sum, h) => sum + (h.porcentaje || 0), 0));
  // Máximo que puede aportar el próximo hito
  const maxProximoHito = Math.max(5, 100 - avanceCalculado);

  const handleGuardar = async () => {
    if (!accionForm.descripcion.trim()) return;
    const tieneAvance = editingAccion?.id && hitoForm.descripcion.trim();
    if (tieneAvance && hitoFiles.length === 0) return; // evidencia obligatoria

    setSaving(true);
    try {
      const prevResponsableId = editingAccion?.responsable_id || null;
      let accionId = editingAccion?.id;

      if (accionId) {
        const estado = avanceCalculado === 100 ? 'cerrada' : avanceCalculado > 0 ? 'en_proceso' : 'pendiente';
        await supabase.from('nc_acciones').update({
          descripcion: accionForm.descripcion,
          responsable_id: accionForm.responsable_id || null,
          fecha_vencimiento: accionForm.fecha_vencimiento || null,
          avance: avanceCalculado,
          estado,
        }).eq('id', accionId);
      } else {
        const { count } = await supabase.from('nc_acciones').select('id', { count: 'exact', head: true }).eq('hallazgo_id', hallazgoId);
        const codigo = `ACC-${String((count || 0) + 1).padStart(4, '0')}`;
        const { data: inserted } = await supabase.from('nc_acciones').insert({
          hallazgo_id: hallazgoId,
          codigo,
          descripcion: accionForm.descripcion,
          responsable_id: accionForm.responsable_id || null,
          fecha_vencimiento: accionForm.fecha_vencimiento || null,
          avance: 0,
          estado: 'pendiente',
        }).select('id').single();
        accionId = inserted?.id;
      }

      if (accionForm.responsable_id) {
        await notificarAsignacion({
          hallazgoId,
          hallazgoNumero: hallazgoNumero || hallazgoId,
          tipo: 'responsable_accion',
          newIds: [accionForm.responsable_id],
          prevIds: prevResponsableId ? [prevResponsableId] : [],
        });
      }

      // Si hay datos de avance, registrar el hito junto al guardado
      if (accionId && hitoForm.descripcion.trim() && hitoFiles.length > 0) {
        const adjuntoUrls = [];
        for (const file of hitoFiles.slice(0, 3)) {
          const ext = file.name.split('.').pop();
          const path = `hitos/${accionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('nc-adjuntos').upload(path, file);
          if (uploadError) { console.error('Error upload:', uploadError); continue; }
          adjuntoUrls.push(path);
        }
        const { error: hitoError } = await supabase.from('nc_accion_hitos').insert({
          accion_id: accionId,
          descripcion: hitoForm.descripcion.trim(),
          fecha: hitoForm.fecha,
          porcentaje: parseInt(Math.min(hitoForm.porcentaje, maxProximoHito), 10),
          adjunto_1: adjuntoUrls[0] || null,
          adjunto_2: adjuntoUrls[1] || null,
          adjunto_3: adjuntoUrls[2] || null,
        });
        if (hitoError) console.error('Error hito:', hitoError);
        setHitoForm({ descripcion: '', fecha: new Date().toISOString().split('T')[0], porcentaje: 10 });
        setHitoFiles([]);
        onHitoSaved?.();
      }

      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHito = async (hitoId) => {
    await supabase.from('nc_accion_hitos').delete().eq('id', hitoId);
    const { data } = await supabase.from('nc_accion_hitos').select('*').eq('accion_id', editingAccion.id).order('fecha', { ascending: true });
    const rows = data || [];
    const withUrls = await Promise.all(rows.map(async h => {
      const paths = [h.adjunto_1, h.adjunto_2, h.adjunto_3].filter(Boolean);
      if (paths.length === 0) return h;
      const { data: signed } = await supabase.storage.from('nc-adjuntos').createSignedUrls(paths, 3600);
      const urlMap = {};
      (signed || []).forEach(s => { urlMap[s.path] = s.signedUrl; });
      return {
        ...h,
        adjunto_1_url: h.adjunto_1 ? urlMap[h.adjunto_1] : null,
        adjunto_2_url: h.adjunto_2 ? urlMap[h.adjunto_2] : null,
        adjunto_3_url: h.adjunto_3 ? urlMap[h.adjunto_3] : null,
      };
    }));
    setHitos(withUrls);
    onHitoSaved?.();
  };

  return createPortal(
    <div className="ncd-picker-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ncd-accion-modal">
        <div className="ncd-accion-modal-header">
          <h4>{editingAccion ? editingAccion.codigo : 'Nueva Acción'}</h4>
          <button className="ncd-picker-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className={`ncd-accion-modal-body${editingAccion ? ' ncd-accion-modal-split' : ''}`}>

          {/* Columna izquierda */}
          <div className="ncd-accion-col-left">

            {/* Bloque: datos de la acción */}
            <div className="ncd-accion-datos">
              <div className="ncd-form-group">
                <label>Descripción</label>
                <textarea rows={2} placeholder="Describí la acción a tomar..." value={accionForm.descripcion} onChange={e => setAccionForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div className="ncd-form-grid cols-2">
                <div className="ncd-form-group">
                  <label>Responsable</label>
                  <PersonPickerBtn selectedId={accionForm.responsable_id} profiles={profiles} onClick={() => setAccionPicker(true)} />
                </div>
                <div className="ncd-form-group">
                  <label>Fecha de vencimiento</label>
                  <input type="date" value={accionForm.fecha_vencimiento} onChange={e => setAccionForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
                </div>
              </div>
              {editingAccion && (
                <div className="ncd-accion-avance-display">
                  <div className="ncd-accion-avance-top">
                    <span>Avance total</span>
                    <strong style={{ color: avanceCalculado === 100 ? '#10B981' : 'var(--text-main)' }}>{avanceCalculado}%</strong>
                  </div>
                  <div className="ncd-accion-progress-bar" style={{ height: 6 }}>
                    <div className="ncd-accion-progress-fill" style={{ width: `${avanceCalculado}%`, background: avanceCalculado === 100 ? '#10B981' : 'var(--primary-color)' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Bloque: registrar avance */}
            {editingAccion && (
              <div className="ncd-accion-avance-block">
                <p className="ncd-section-title" style={{ marginBottom: 4 }}>Registrar avance</p>
                <div className="ncd-form-group">
                  <label>¿Qué se hizo?</label>
                  <textarea rows={2} placeholder="Describí la acción realizada..." value={hitoForm.descripcion} onChange={e => setHitoForm(f => ({ ...f, descripcion: e.target.value }))} />
                </div>
                <div className="ncd-form-grid cols-2">
                  <div className="ncd-form-group">
                    <label>Fecha</label>
                    <input type="date" value={hitoForm.fecha} onChange={e => setHitoForm(f => ({ ...f, fecha: e.target.value }))} />
                  </div>
                  <div className="ncd-form-group">
                    <label>% que aporta: <strong>{Math.min(hitoForm.porcentaje, maxProximoHito)}%</strong> {avanceCalculado >= 100 && <span style={{ color: '#E71D36', fontSize: 11 }}>— acción al 100%</span>}</label>
                    <input type="range" min={5} max={maxProximoHito} step={5} value={Math.min(hitoForm.porcentaje, maxProximoHito)} onChange={e => setHitoForm(f => ({ ...f, porcentaje: Number(e.target.value) }))} className="ncd-avance-slider" disabled={avanceCalculado >= 100} />
                  </div>
                </div>
                {/* Adjuntos */}
                <div className="ncd-hito-adjuntos-picker">
                  <input
                    ref={hitoFileRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const selected = Array.from(e.target.files || []).slice(0, 3);
                      setHitoFiles(selected);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="ncd-adjunto-pick-btn"
                    onClick={() => hitoFileRef.current?.click()}
                    disabled={avanceCalculado >= 100}
                  >
                    <Paperclip size={13} />
                    {hitoFiles.length > 0 ? `${hitoFiles.length} archivo${hitoFiles.length > 1 ? 's' : ''} seleccionado${hitoFiles.length > 1 ? 's' : ''}` : 'Adjuntar archivos (máx. 3)'}
                  </button>
                  {hitoFiles.length > 0 && (
                    <div className="ncd-hito-files-preview">
                      {hitoFiles.map((f, i) => (
                        <span key={i} className="ncd-hito-file-chip">
                          <FileText size={11} />
                          {f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name}
                          <button onClick={() => setHitoFiles(prev => prev.filter((_, j) => j !== i))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  {hitoForm.descripcion.trim() && hitoFiles.length === 0 && (
                    <p className="ncd-hito-adjunto-hint">
                      Este campo es obligatorio, por favor, dejá la evidencia de tu acción.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: historial de hitos */}
          {editingAccion && (
            <div className="ncd-accion-col-right">
              <p className="ncd-section-title" style={{ marginBottom: 14 }}>
                Historial {hitos.length > 0 && <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12 }}>— {hitos.length} hito{hitos.length !== 1 ? 's' : ''}</span>}
              </p>
              <div className="ncd-hitos-list">
                {hitosLoading ? (
                  <div style={{ textAlign: 'center', padding: 16 }}><Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--text-muted)' }} /></div>
                ) : hitos.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Aún no hay hitos registrados</p>
                ) : (
                  hitos.map(h => (
                    <div key={h.id} className="ncd-hito-item">
                      <div className="ncd-hito-dot" />
                      <div className="ncd-hito-content">
                        <div className="ncd-hito-header">
                          <span className="ncd-hito-fecha">{new Date(h.fecha).toLocaleDateString('es-AR')}</span>
                          <span className="ncd-hito-pct">+{h.porcentaje}%</span>
                          <button className="ncd-adjunto-remove" onClick={() => handleDeleteHito(h.id)} title="Eliminar hito"><X size={13} /></button>
                        </div>
                        <p className="ncd-hito-desc">{h.descripcion}</p>
                        {[
                          { path: h.adjunto_1, url: h.adjunto_1_url },
                          { path: h.adjunto_2, url: h.adjunto_2_url },
                          { path: h.adjunto_3, url: h.adjunto_3_url },
                        ].filter(a => a.path && a.url).length > 0 && (
                          <div className="ncd-hito-adjuntos">
                            {[
                              { path: h.adjunto_1, url: h.adjunto_1_url },
                              { path: h.adjunto_2, url: h.adjunto_2_url },
                              { path: h.adjunto_3, url: h.adjunto_3_url },
                            ].filter(a => a.path && a.url).map((a, i) => {
                              const name = decodeURIComponent(a.path.split('/').pop().replace(/^\d+-[a-z0-9]+\./, ''));
                              return (
                                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="ncd-hito-adjunto-link">
                                  <Paperclip size={11} />
                                  {name.length > 20 ? name.slice(0, 18) + '…' : name}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ncd-accion-modal-footer">
          <button className="ncd-btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="ncd-btn-primary"
            onClick={handleGuardar}
            disabled={
              saving ||
              !accionForm.descripcion.trim() ||
              (editingAccion?.id && hitoForm.descripcion.trim() && hitoFiles.length === 0)
            }
          >
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Check size={14} />}
            {editingAccion ? 'Guardar cambios' : 'Agregar acción'}
          </button>
        </div>
      </div>
      {accionPicker && (
        <PersonPickerModal
          profiles={profiles}
          title="Seleccionar Responsable"
          onSelect={p => { setAccionForm(f => ({ ...f, responsable_id: p.id })); setAccionPicker(false); }}
          onClose={() => setAccionPicker(false)}
        />
      )}
    </div>,
    document.getElementById('portal-root')
  );
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Step5Hitos — carga hitos de una acción para mostrar en paso 5 ─────────── */
function Step5Hitos({ accionId }) {
  const [hitos, setHitos] = useState([]);
  useEffect(() => {
    supabase.from('nc_accion_hitos').select('fecha, porcentaje, descripcion')
      .eq('accion_id', accionId).order('fecha', { ascending: true })
      .then(({ data }) => setHitos(data || []));
  }, [accionId]);
  if (hitos.length === 0) return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin hitos registrados.</p>;
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Historial de avance</p>
      {hitos.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, paddingLeft: 8, borderLeft: '2px solid var(--border-color)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(h.fecha)}</span>
          <span style={{ fontSize: 11, color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>+{h.porcentaje}%</span>
          <span style={{ fontSize: 11, color: 'var(--text-main)' }}>{h.descripcion}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function NCDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile } = useAuth();
  const isNew = !id;

  /* ── State ── */
  const [currentStep, setCurrentStep] = useState(1);
  const [pasoActual, setPasoActual] = useState(1);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null); // 'auditor' | 'emisor' | 'responsable' | 'verif' | null
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  // Lookup data
  const [gerencias, setGerencias] = useState([]); // distinct strings from profiles.department
  const [sitios, setSitios] = useState([]);        // distinct strings from profiles.office_location
  const [clientes, setClientes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [sgiDocumentos, setSgiDocumentos] = useState([]);

  // Form data - Step 1
  const [form, setForm] = useState({
    tipo: 'NC',
    numero: '',
    fecha: new Date().toISOString().split('T')[0],
    gerencia: '',
    sitio: '',
    area: '',
    obra: '',
    obra_na: false,
    nro_contrato: '',
    contrato_na: false,
    cliente_id: '',
    auditor_id: '',
    auditor_na: false,
    emisor_id: '',
    responsable_proceso: [],
    responsable_verif: [],
    descripcion: '',
    fuente_quejas: false,
    fuente_auditoria_interna: false,
    fuente_auditoria_externa: false,
    fuente_requisitos_legales: false,
    fuente_norma: false,
    fuente_norma_puntos: [],
    fuente_documento_interno: false,
    fuente_doc_interno_refs: [],
    fuente_producto_no_conforme: false,
    fuente_servicio_no_conforme: false,
    fuente_otros: false,
  });

  // Adjuntos
  const [pendingFiles, setPendingFiles] = useState([]); // { file, name, size } — not yet uploaded
  const [savedAdjuntos, setSavedAdjuntos] = useState([]); // from nc_adjuntos
  const [uploadProgress, setUploadProgress] = useState(null); // null | 0-100
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Step 2 state
  const [step2, setStep2] = useState({ responsable_analisis_id: '', participantes: [] });

  // Step 3 state
  const [step3, setStep3] = useState({
    tecnica: '5_porques',
    porques: ['', '', '', '', ''],
    ishikawa: { mano_obra: '', maquinas: '', materiales: '', metodos: '', medio_ambiente: '', medicion: '' },
    otro_descripcion: '',
    causa_raiz: '',
  });
  const [step2Picker, setStep2Picker] = useState(null); // 'responsable' | 'participante' | null

  const [showPDF, setShowPDF] = useState(false);

  // Ref que rastrea las asignaciones ya guardadas en DB (para detectar nuevas al guardar)
  const savedAssignmentsRef = useRef({
    emisor_id: '',
    auditor_id: '',
    responsable_proceso: [],
    responsable_verif: [],
    responsable_analisis_id: '',
    participantes: [],
  });

  // Step 5 state — verificación por acción
  const [accionesVerif, setAccionesVerif] = useState({}); // { [accionId]: { eficaz, fecha, detalle, adjuntos, files, saving } }
  const step5FileRefs = useRef({});

  // Step 4 state
  const [acciones, setAcciones] = useState([]);
  const [accionesLoading, setAccionesLoading] = useState(false);
  const [showAccionModal, setShowAccionModal] = useState(false);
  const [seleccionarVerif, setSeleccionarVerif] = useState(null);
  const [confirmRectif, setConfirmRectif] = useState(null); // accionId pendiente de confirmar
  const [rectifForm, setRectifForm] = useState({ responsable_id: '', fecha_vencimiento: '' });
  const [rectifPicker, setRectifPicker] = useState(false); // null=sin respuesta, true=sí, false=no
  const [editingAccion, setEditingAccion] = useState(null);
  const [accionForm, setAccionForm] = useState({ descripcion: '', responsable_id: '', fecha_vencimiento: '', avance: 0 });
  const [accionPicker, setAccionPicker] = useState(false);

  /* ── Load lookups ── */
  useEffect(() => {
    const fetchLookups = async () => {
      const [c, p, d] = await Promise.all([
        supabase.from('centros_de_costos').select('id, nombre, categoria').eq('activo', true).order('codigo'),
        supabase.from('profiles').select('id, full_name, job_title, department, office_location, avatar_url').order('full_name'),
        supabase.from('sgi_documentos').select('id, titulo, codigo, tipo_documento').eq('activo', true).order('titulo'),
      ]);
      if (c.data) setClientes(c.data);
      if (p.data) {
        setProfiles(p.data);
        setGerencias([...new Set(p.data.map(x => x.department).filter(Boolean))].sort());
        setSitios([...new Set(p.data.map(x => x.office_location).filter(Boolean))].sort());
      }
      if (d.data) setSgiDocumentos(d.data);
    };
    fetchLookups();
  }, []);

  /* ── Default emisor + pre-fill gerencia/sitio from Teams profile ── */
  useEffect(() => {
    if (!isNew || !user?.id) return;
    setForm(f => {
      const updates = {};
      if (!f.emisor_id) updates.emisor_id = user.id;
      if (!f.gerencia && profile?.department) updates.gerencia = profile.department;
      if (!f.sitio && profile?.office_location) updates.sitio = profile.office_location;
      return Object.keys(updates).length ? { ...f, ...updates } : f;
    });
  }, [isNew, user?.id, profile?.department, profile?.office_location]);

  /* ── Auto-generate numero when tipo changes (new records only) ── */
  useEffect(() => {
    if (!isNew) return;
    const generateNumero = async () => {
      const year = new Date().getFullYear();
      const prefix = TIPO_PREFIX[form.tipo] || form.tipo;
      const { count } = await supabase
        .from('nc_hallazgos')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', form.tipo)
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`);
      const seq = String((count || 0) + 1).padStart(3, '0');
      setForm(f => ({ ...f, numero: `${prefix}-${year}-${seq}` }));
    };
    generateNumero();
  }, [isNew, form.tipo]);

  /* ── Load existing hallazgo ── */
  useEffect(() => {
    if (!id) return;
    const fetchHallazgo = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('nc_hallazgos')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          const paso = data.paso_actual || 1;
          setPasoActual(paso);
          setCurrentStep(paso);
          setForm({
            tipo: data.tipo || 'NC',
            numero: data.numero || '',
            fecha: data.fecha || new Date().toISOString().split('T')[0],
            gerencia: data.gerencia || '',
            sitio: data.sitio || '',
            area: data.area || '',
            obra: data.obra || '',
            obra_na: data.obra === 'N/A',
            nro_contrato: data.nro_contrato || '',
            contrato_na: data.nro_contrato === 'N/A',
            cliente_id: data.cliente_id || '',
            auditor_id: data.auditor_id || '',
            auditor_na: !!data.auditor_na,
            emisor_id: data.emisor_id || '',
            responsable_proceso: (() => {
              const v = data.responsable_proceso;
              if (!v) return [];
              try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
            })(),
            responsable_verif: (() => {
              const v = data.responsable_verif;
              if (!v) return [];
              try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
            })(),
            descripcion: data.descripcion || '',
            fuente_quejas: !!data.fuente_quejas,
            fuente_auditoria_interna: !!data.fuente_auditoria_interna,
            fuente_auditoria_externa: !!data.fuente_auditoria_externa,
            fuente_requisitos_legales: !!data.fuente_requisitos_legales,
            fuente_norma: !!data.fuente_norma,
            fuente_norma_puntos: (() => {
              try { const p = JSON.parse(data.fuente_norma_puntos); return Array.isArray(p) ? p : []; } catch { return []; }
            })(),
            fuente_documento_interno: !!data.fuente_documento_interno,
            fuente_doc_interno_refs: (() => {
              try { const p = JSON.parse(data.fuente_doc_interno_refs); return Array.isArray(p) ? p : []; } catch { return []; }
            })(),
            fuente_producto_no_conforme: !!data.fuente_producto_no_conforme,
            fuente_servicio_no_conforme: !!data.fuente_servicio_no_conforme,
            fuente_otros: !!data.fuente_otros,
          });

          // Load step 2 fields
          setStep2({
            responsable_analisis_id: data.responsable_analisis_id || '',
            participantes: data.participantes_analisis || [],
          });

          // Snapshot de asignaciones guardadas en DB (para detectar nuevas al guardar)
          savedAssignmentsRef.current = {
            emisor_id: data.emisor_id || '',
            auditor_id: data.auditor_id || '',
            auditor_na: !!data.auditor_na,
            responsable_proceso: (() => { try { const p = JSON.parse(data.responsable_proceso); return Array.isArray(p) ? p : []; } catch { return []; } })(),
            responsable_verif: (() => { try { const p = JSON.parse(data.responsable_verif); return Array.isArray(p) ? p : []; } catch { return []; } })(),
            responsable_analisis_id: data.responsable_analisis_id || '',
            participantes: data.participantes_analisis || [],
          };

          // Load step 3 fields
          setStep3({
            tecnica: data.acr_tecnica || '5_porques',
            porques: (() => {
              const raw = Array.isArray(data.acr_porques) ? data.acr_porques.map(p => p || '') : [];
              while (raw.length < 5) raw.push('');
              return raw;
            })(),
            ishikawa: data.acr_ishikawa || { mano_obra: '', maquinas: '', materiales: '', metodos: '', medio_ambiente: '', medicion: '' },
            otro_descripcion: data.acr_otro_descripcion || '',
            causa_raiz: data.acr_causa_raiz || '',
          });

          // Inicializar respuesta de verificación según si ya había responsables
          const verifGuardados = (() => { try { const p = JSON.parse(data.responsable_verif); return Array.isArray(p) ? p : []; } catch { return []; } })();
          if (verifGuardados.length > 0) setSeleccionarVerif(true);
          else if (data.responsable_verif !== undefined) setSeleccionarVerif(false);

          // Load adjuntos paso 1
          const { data: adj } = await supabase
            .from('nc_adjuntos')
            .select('*')
            .eq('hallazgo_id', id)
            .eq('paso', 1);
          if (adj) setSavedAdjuntos(adj);

        }
      } catch (err) {
        console.error('Error loading hallazgo:', err);
        showToast('Error al cargar el hallazgo', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchHallazgo();
  }, [id]);

  /* ── Toast helper ── */
  const showToast = useCallback((message, type = '') => {
    setToast({ message, type });
  }, []);

  /* ── Fetch acciones (Step 4) ── */
  const fetchAcciones = useCallback(async () => {
    if (!id) return;
    setAccionesLoading(true);
    const { data } = await supabase
      .from('nc_acciones')
      .select('*, responsable:profiles!responsable_id(full_name)')
      .eq('hallazgo_id', id)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });
    setAcciones(data || []);
    // Inicializar estado de verificación por acción
    const verif = {};
    for (const a of data || []) {
      verif[a.id] = {
        eficaz: a.verif_eficaz ?? null,
        fecha: a.verif_fecha || '',
        detalle: a.verif_detalle || '',
        adjuntos: [a.verif_adjunto_1, a.verif_adjunto_2, a.verif_adjunto_3].filter(Boolean),
        files: [],
        saving: false,
      };
    }
    setAccionesVerif(verif);
    setAccionesLoading(false);
  }, [id]);

  useEffect(() => {
    if ((currentStep === 4 || currentStep === 5) && !isNew) fetchAcciones();
  }, [currentStep, fetchAcciones, isNew]);

  const esResponsableCalidad = profiles.find(p => p.id === user?.id)?.job_title === 'Responsable de Calidad';
  const canVerif = form.responsable_verif.includes(user?.id) ||
    (form.responsable_verif.length === 0 && esResponsableCalidad);

  // canEdit: admins with 'sgi' tab, or people directly involved in the hallazgo
  const isSgiAdmin = isAdmin || (profile?.admin_tabs ?? []).includes('sgi');
  const canEdit = isNew || isSgiAdmin
    || form.emisor_id === user?.id
    || form.auditor_id === user?.id
    || form.responsable_proceso.includes(user?.id)
    || step2.responsable_analisis_id === user?.id
    || step2.participantes.includes(user?.id);

  /* ── Form helpers ── */
  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  /* ── File handling ── */
  const handleFileSelect = (files) => {
    const currentCount = pendingFiles.length + savedAdjuntos.length;
    const remaining = MAX_FILES - currentCount;
    if (remaining <= 0) {
      showToast(`Máximo ${MAX_FILES} archivos permitidos`, 'error');
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    setPendingFiles(prev => [
      ...prev,
      ...toAdd.map(f => ({ file: f, name: f.name, size: f.size, id: Math.random().toString(36).slice(2) })),
    ]);
  };

  const removePending = (fId) => setPendingFiles(prev => prev.filter(f => f.id !== fId));

  /* ── Upload files to Supabase storage ── */
  const uploadPendingFiles = async (hallazgoId) => {
    if (pendingFiles.length === 0) return;
    setUploadProgress(0);
    const uploaded = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const { file, name } = pendingFiles[i];
      const ext = name.split('.').pop();
      const path = `${hallazgoId}/paso1/${Date.now()}_${name}`;
      const { error: upErr } = await supabase.storage
        .from('nc-adjuntos')
        .upload(path, file, { upsert: false });

      if (upErr) {
        console.error('Upload error:', upErr);
        continue;
      }
      const { data: urlData } = supabase.storage.from('nc-adjuntos').getPublicUrl(path);
      uploaded.push({ hallazgo_id: hallazgoId, nombre: name, url: urlData?.publicUrl || '', paso: 1 });
      setUploadProgress(Math.round(((i + 1) / pendingFiles.length) * 100));
    }
    if (uploaded.length > 0) {
      await supabase.from('nc_adjuntos').insert(uploaded);
    }
    setPendingFiles([]);
    setUploadProgress(null);
  };

  /* ── NC notifications helper ── */
  const _notificarCambiosAsignacion = async (hId, hNumero) => {
    const prev = savedAssignmentsRef.current;
    const notifs = [
      { tipo: 'emisor',                newIds: form.emisor_id ? [form.emisor_id] : [],           prevIds: prev.emisor_id ? [prev.emisor_id] : [] },
      { tipo: 'auditor',               newIds: form.auditor_id ? [form.auditor_id] : [],         prevIds: prev.auditor_id ? [prev.auditor_id] : [] },
      { tipo: 'responsable_proceso',   newIds: form.responsable_proceso,                         prevIds: prev.responsable_proceso },
      { tipo: 'responsable_verif',     newIds: form.responsable_verif,                           prevIds: prev.responsable_verif },
      { tipo: 'responsable_analisis',  newIds: step2.responsable_analisis_id ? [step2.responsable_analisis_id] : [], prevIds: prev.responsable_analisis_id ? [prev.responsable_analisis_id] : [] },
      { tipo: 'participante_analisis', newIds: step2.participantes,                              prevIds: prev.participantes },
    ];
    await Promise.all(notifs.map(n =>
      notificarAsignacion({ hallazgoId: hId, hallazgoNumero: hNumero, tipo: n.tipo, newIds: n.newIds, prevIds: n.prevIds })
    ));
    // Actualizar snapshot
    savedAssignmentsRef.current = {
      emisor_id: form.emisor_id,
      auditor_id: form.auditor_id,
      responsable_proceso: [...form.responsable_proceso],
      responsable_verif: [...form.responsable_verif],
      responsable_analisis_id: step2.responsable_analisis_id,
      participantes: [...step2.participantes],
    };
  };

  /* ── Save / Submit ── */
  const handleSave = async (advance = false) => {
    if (!form.tipo) { showToast('Selecciona un tipo de documento', 'error'); return; }
    if (!form.descripcion.trim()) { showToast('La descripción es obligatoria', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        tipo: form.tipo,
        numero: form.numero || null,
        fecha: form.fecha || null,
        gerencia: form.gerencia || null,
        sitio: form.sitio || null,
        area: form.area || null,
        obra: form.obra || null,
        nro_contrato: form.nro_contrato || null,
        cliente_id: form.cliente_id || null,
        auditor_id: form.auditor_na ? null : (form.auditor_id || null),
        auditor_na: form.auditor_na,
        emisor_id: form.emisor_id || null,
        responsable_proceso: form.responsable_proceso.length > 0 ? JSON.stringify(form.responsable_proceso) : null,
        responsable_verif: form.responsable_verif.length > 0 ? JSON.stringify(form.responsable_verif) : null,
        descripcion: form.descripcion,
        fuente_quejas: form.fuente_quejas,
        fuente_auditoria_interna: form.fuente_auditoria_interna,
        fuente_auditoria_externa: form.fuente_auditoria_externa,
        fuente_requisitos_legales: form.fuente_requisitos_legales,
        fuente_norma: form.fuente_norma,
        fuente_norma_puntos: form.fuente_norma ? JSON.stringify(form.fuente_norma_puntos) : '[]',
        fuente_documento_interno: form.fuente_documento_interno,
        fuente_doc_interno_refs: form.fuente_documento_interno ? JSON.stringify(form.fuente_doc_interno_refs) : '[]',
        fuente_producto_no_conforme: form.fuente_producto_no_conforme,
        fuente_servicio_no_conforme: form.fuente_servicio_no_conforme,
        fuente_otros: form.fuente_otros,
        responsable_analisis_id: step2.responsable_analisis_id || null,
        participantes_analisis: step2.participantes,
        acr_tecnica: step3.tecnica,
        acr_porques: step3.porques,
        acr_ishikawa: step3.ishikawa,
        acr_otro_descripcion: step3.otro_descripcion || null,
        acr_causa_raiz: step3.causa_raiz || null,
        updated_at: new Date().toISOString(),
      };

      let hallazgoId = id;

      if (isNew) {
        const newPaso = advance ? 2 : 1;
        const { data, error } = await supabase
          .from('nc_hallazgos')
          .insert({ ...payload, paso_actual: newPaso, estado: 'abierto', created_by: user?.id })
          .select('id')
          .single();
        if (error) throw error;
        hallazgoId = data.id;
        await uploadPendingFiles(hallazgoId);
        // Notificar asignaciones en hallazgo nuevo
        await _notificarCambiosAsignacion(hallazgoId, form.numero);
        showToast('Hallazgo creado correctamente', 'success');
        navigate(`/sgi/nc/${hallazgoId}`, { replace: true });
        if (advance) {
          setPasoActual(newPaso);
          setCurrentStep(newPaso);
        }
      } else {
        const closing = advance && currentStep === 5;
        const newPaso = closing ? 5 : advance ? Math.max(pasoActual, currentStep + 1) : pasoActual;
        const { error } = await supabase
          .from('nc_hallazgos')
          .update({ ...payload, paso_actual: newPaso, ...(closing ? { estado: 'cerrado' } : {}) })
          .eq('id', id);
        if (error) throw error;
        await uploadPendingFiles(hallazgoId);
        // Notificar nuevas asignaciones
        await _notificarCambiosAsignacion(id, form.numero);
        setPasoActual(newPaso);
        if (advance && !closing) setCurrentStep(currentStep + 1);
        showToast(closing ? 'Hallazgo cerrado correctamente' : 'Guardado correctamente', 'success');
        if (closing) navigate('/sgi/nc');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Stepper click ── */
  const handleStepClick = (stepNum) => {
    if (isNew) return; // new record: can only be on step 1
    if (stepNum > pasoActual) return; // can't skip ahead
    setCurrentStep(stepNum);
  };

  /* ── Render Step 1 ── */
  const renderStep1 = () => (
    <>
      {/* Tipo */}
      <div className="ncd-form-section">
        <p className="ncd-section-title">Tipo de Documento</p>
        <div className="ncd-tipo-group">
          {TIPOS.map(t => {
            const tc = TIPO_COLORS[t];
            return (
              <React.Fragment key={t}>
                <input
                  type="radio"
                  name="tipo"
                  id={`tipo-${t}`}
                  value={t}
                  checked={form.tipo === t}
                  onChange={() => setField('tipo', t)}
                  className="ncd-tipo-radio"
                />
                <label
                  htmlFor={`tipo-${t}`}
                  className="ncd-tipo-label"
                  style={{
                    '--tipo-color': tc.color,
                    '--tipo-rgb': tc.rgb,
                  }}
                  data-tooltip={TIPO_TOOLTIPS[t]}
                >
                  {t}
                </label>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Fuentes */}
      <div className="ncd-form-section">
        <p className="ncd-section-title">Fuentes</p>
        <div className="ncd-fuentes-grid">
          {FUENTES.map(f => (
            <label
              key={f.key}
              className={`ncd-fuente-item${form[f.key] ? ' checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={!!form[f.key]}
                onChange={e => {
                  setField(f.key, e.target.checked);
                  if (f.key === 'fuente_norma' && !e.target.checked) setField('fuente_norma_puntos', []);
                  if (f.key === 'fuente_documento_interno' && !e.target.checked) setField('fuente_doc_interno_refs', []);
                }}
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>

        {form.fuente_norma && (
          <div className="ncd-norma-detalle">
            <NormaMultiSelector
              value={form.fuente_norma_puntos}
              onChange={v => setField('fuente_norma_puntos', v)}
            />
          </div>
        )}

        {form.fuente_documento_interno && (
          <div className="ncd-norma-detalle">
            <DocInternoSelector
              documentos={sgiDocumentos}
              value={form.fuente_doc_interno_refs}
              onChange={v => setField('fuente_doc_interno_refs', v)}
            />
          </div>
        )}
      </div>

      {/* Datos generales */}
      <div className="ncd-form-section">
        <p className="ncd-section-title">Datos Generales</p>
        <div className="ncd-form-grid cols-2">
          <div className="ncd-form-group">
            <label htmlFor="nro">Nro.</label>
            <input
              id="nro"
              type="text"
              value={form.numero}
              readOnly
              className="ncd-input-readonly"
            />
          </div>
          <div className="ncd-form-group">
            <label htmlFor="fecha">Fecha</label>
            <input
              id="fecha"
              type="date"
              value={form.fecha}
              onChange={e => setField('fecha', e.target.value)}
            />
          </div>
          <div className="ncd-form-group">
            <label htmlFor="gerencia">Gerencia</label>
            <select id="gerencia" value={form.gerencia} onChange={e => setField('gerencia', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {gerencias.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="ncd-form-group">
            <label htmlFor="sitio">Sitio</label>
            <select id="sitio" value={form.sitio} onChange={e => setField('sitio', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {sitios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="ncd-form-group">
            <label htmlFor="area">Área</label>
            <select id="area" value={form.area} onChange={e => setField('area', e.target.value)}>
              <option value="">— Seleccionar —</option>
            </select>
          </div>
          <div className="ncd-form-group">
            <label htmlFor="obra">Obra</label>
            <input
              id="obra"
              type="text"
              placeholder="Nombre de la obra"
              value={form.obra}
              readOnly={form.obra_na}
              className={form.obra_na ? 'ncd-input-readonly' : ''}
              onChange={e => setField('obra', e.target.value)}
            />
            <label className="ncd-check-inline">
              <input
                type="checkbox"
                checked={!!form.obra_na}
                onChange={e => {
                  const checked = e.target.checked;
                  setForm(f => ({ ...f, obra_na: checked, obra: checked ? 'N/A' : '' }));
                }}
              />
              No aplica
            </label>
          </div>
          <div className="ncd-form-group">
            <label htmlFor="contrato">Nro. Contrato</label>
            <input
              id="contrato"
              type="text"
              placeholder="Nro. de contrato"
              value={form.nro_contrato}
              readOnly={form.contrato_na}
              className={form.contrato_na ? 'ncd-input-readonly' : ''}
              onChange={e => setField('nro_contrato', e.target.value)}
            />
            <label className="ncd-check-inline">
              <input
                type="checkbox"
                checked={!!form.contrato_na}
                onChange={e => {
                  const checked = e.target.checked;
                  setForm(f => ({ ...f, contrato_na: checked, nro_contrato: checked ? 'N/A' : '' }));
                }}
              />
              No aplica
            </label>
          </div>
          <div className="ncd-form-group">
            <label htmlFor="cliente">Cliente</label>
            <select id="cliente" value={form.cliente_id} onChange={e => setField('cliente_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {(() => {
                const LABELS = {
                  interno: 'Interno',
                  mantenimiento_servicios: 'Operaciones y Servicios',
                  obras: 'Obras',
                  operaciones_mantenimiento: 'Operaciones y Mantenimiento',
                };
                const grouped = clientes.reduce((acc, c) => {
                  const cat = c.categoria || 'sin_categoria';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(c);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([cat, items]) => (
                  <optgroup key={cat} label={LABELS[cat] || cat}>
                    {items.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </optgroup>
                ));
              })()}
            </select>
          </div>
          <div className="ncd-form-group">
            <label>Auditor</label>
            <PersonPickerBtn
              selectedId={form.auditor_id}
              profiles={profiles}
              onClick={() => { if (!form.auditor_na) setPickerTarget('auditor'); }}
              disabled={form.auditor_na}
            />
            <label className="ncd-check-inline">
              <input
                type="checkbox"
                checked={!!form.auditor_na}
                onChange={e => {
                  const checked = e.target.checked;
                  setForm(f => ({ ...f, auditor_na: checked, auditor_id: checked ? '' : f.auditor_id }));
                }}
              />
              No aplica
            </label>
          </div>
          <div className="ncd-form-group">
            <label>Emisor del Hallazgo</label>
            <PersonPickerBtn
              selectedId={form.emisor_id}
              profiles={profiles}
              onClick={() => setPickerTarget('emisor')}
            />
          </div>
          <div className="ncd-form-group full">
            <label>Responsable del Proceso</label>
            <MultiPersonPickerBtn
              selectedIds={form.responsable_proceso}
              profiles={profiles}
              onClick={() => setPickerTarget('responsable')}
            />
          </div>
          <div className="ncd-form-group full">
            <label htmlFor="descripcion">Descripción <span style={{ color: '#E71D36' }}>*</span></label>
            <textarea
              id="descripcion"
              rows={4}
              placeholder="Describe el hallazgo con detalle..."
              value={form.descripcion}
              onChange={e => setField('descripcion', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Adjuntos */}
      <div className="ncd-form-section">
        <p className="ncd-section-title">Adjuntos (máx. {MAX_FILES})</p>
        <div
          className={`ncd-upload-area${dragOver ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={e => handleFileSelect(e.target.files)}
          />
          <div className="ncd-upload-icon"><Upload size={20} /></div>
          <p className="ncd-upload-label">Arrastra archivos aquí o haz click para seleccionar</p>
          <p className="ncd-upload-hint">
            <strong>{MAX_FILES - pendingFiles.length - savedAdjuntos.length}</strong> espacios disponibles
          </p>
        </div>

        {uploadProgress !== null && (
          <div className="ncd-upload-progress">
            <div className="ncd-upload-progress-bar">
              <div className="ncd-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="ncd-upload-progress-text">Subiendo... {uploadProgress}%</span>
          </div>
        )}

        {(savedAdjuntos.length > 0 || pendingFiles.length > 0) && (
          <div className="ncd-adjuntos-list">
            {savedAdjuntos.map(a => (
              <div key={a.id} className="ncd-adjunto-item">
                <FileText size={15} className="ncd-adjunto-icon" />
                <a
                  className="ncd-adjunto-name"
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                >
                  {a.nombre}
                </a>
                <span className="ncd-adjunto-size">Guardado</span>
              </div>
            ))}
            {pendingFiles.map(f => (
              <div key={f.id} className="ncd-adjunto-item">
                <FileText size={15} className="ncd-adjunto-icon" />
                <span className="ncd-adjunto-name">{f.name}</span>
                <span className="ncd-adjunto-size">{formatBytes(f.size)}</span>
                <button className="ncd-adjunto-remove" onClick={() => removePending(f.id)} type="button">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  /* ── Render Step 2 ── */
  const renderStep2 = () => (
    <>
      <div className="ncd-form-section">
        <p className="ncd-section-title">Responsable de Análisis y Seguimiento</p>
        <div className="ncd-form-grid cols-2">
          <div className="ncd-form-group">
            <label>Responsable</label>
            <PersonPickerBtn
              selectedId={step2.responsable_analisis_id}
              profiles={profiles}
              onClick={() => setStep2Picker('responsable')}
            />
          </div>
        </div>
      </div>

      <div className="ncd-form-section">
        <p className="ncd-section-title">Participantes del Análisis</p>
        <div className="ncd-step2-participantes">
          <div className="ncd-step2-selected">
            {step2.participantes.length === 0 ? (
              <p className="ncd-step2-empty">No hay participantes seleccionados</p>
            ) : (
              step2.participantes.map(pid => {
                const p = profiles.find(x => x.id === pid);
                if (!p) return null;
                const initials = p.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
                return (
                  <div key={pid} className="ncd-step2-chip">
                    <div className="ncd-step2-chip-avatar">
                      {p.avatar_url ? <img src={p.avatar_url} alt={p.full_name} /> : initials}
                    </div>
                    <span className="ncd-step2-chip-name">{p.full_name}</span>
                    <button
                      type="button"
                      className="ncd-step2-chip-remove"
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
            className="ncd-step2-add-btn"
            onClick={() => setStep2Picker('participante')}
          >
            + Agregar participante
          </button>
        </div>
      </div>

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
    </>
  );

  /* ── Render Step 3 ── */
  const renderStep3 = () => {
    const TECNICAS = [
      {
        key: '5_porques',
        icon: <HelpCircle size={20} />,
        title: '5 Por qués',
        desc: 'Pregunta "¿Por qué?" de forma sucesiva para llegar a la causa raíz.',
      },
      {
        key: 'ishikawa',
        icon: <GitBranch size={20} />,
        title: 'Diagrama Ishikawa',
        desc: 'Analiza causas por categorías: Mano de Obra, Máquinas, Materiales, etc.',
      },
      {
        key: 'otro',
        icon: <FileText size={20} />,
        title: 'Otro método',
        desc: 'Describe libremente el análisis de causa raíz utilizado.',
      },
    ];

    const ISHIKAWA_FIELDS = [
      { key: 'mano_obra',      label: 'Mano de Obra',  icon: <Users size={14} /> },
      { key: 'maquinas',       label: 'Máquinas',       icon: <Settings size={14} /> },
      { key: 'materiales',     label: 'Materiales',     icon: <Package size={14} /> },
      { key: 'metodos',        label: 'Métodos',        icon: <BookOpen size={14} /> },
      { key: 'medio_ambiente', label: 'Medio Ambiente', icon: <Cloud size={14} /> },
      { key: 'medicion',       label: 'Medición',       icon: <BarChart2 size={14} /> },
    ];

    return (
      <>
        {/* Técnica selector */}
        <div className="ncd-form-section">
          <p className="ncd-section-title">Técnica de Análisis</p>
          <div className="ncd-tecnica-grid">
            {TECNICAS.map(t => (
              <div
                key={t.key}
                className={`ncd-tecnica-card${step3.tecnica === t.key ? ' active' : ''}`}
                onClick={() => setStep3(s => ({ ...s, tecnica: t.key }))}
              >
                <div className="ncd-tecnica-card-icon">{t.icon}</div>
                <span className="ncd-tecnica-card-title">{t.title}</span>
                <span className="ncd-tecnica-card-desc">{t.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5 Por qués */}
        {step3.tecnica === '5_porques' && (
          <div className="ncd-form-section">
            <p className="ncd-section-title">Los 5 Por qués</p>
            <div className="ncd-porques-list">
              {(step3.porques || ['', '', '', '', '']).map((val, idx) => {
                const filled = (val || '').trim().length > 0;
                return (
                  <div key={idx} className={`ncd-porque-item${filled ? ' filled' : ''}`}>
                    <div className="ncd-porque-num">{idx + 1}</div>
                    <div className="ncd-porque-body">
                      <span className="ncd-porque-label">¿Por qué {idx + 1}?</span>
                      <textarea
                        rows={2}
                        placeholder={`Escribe la causa ${idx + 1}...`}
                        value={val || ''}
                        onChange={e => {
                          const newPorques = [...step3.porques];
                          newPorques[idx] = e.target.value;
                          setStep3(s => ({ ...s, porques: newPorques }));
                        }}
                        style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '10px 14px', fontSize: '14px', color: 'var(--text-main)', background: '#ffffff', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '64px', transition: 'var(--transition)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ishikawa */}
        {step3.tecnica === 'ishikawa' && (
          <div className="ncd-form-section">
            <p className="ncd-section-title">Categorías del Diagrama</p>
            <div className="ncd-ishikawa-grid">
              {ISHIKAWA_FIELDS.map(f => (
                <div key={f.key} className="ncd-ishikawa-item">
                  <span className="ncd-ishikawa-label">{f.icon}{f.label}</span>
                  <textarea
                    rows={3}
                    placeholder={`Causas relacionadas con ${f.label.toLowerCase()}...`}
                    value={step3.ishikawa[f.key]}
                    onChange={e => setStep3(s => ({ ...s, ishikawa: { ...s.ishikawa, [f.key]: e.target.value } }))}
                    style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '10px 14px', fontSize: '14px', color: 'var(--text-main)', background: '#ffffff', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '80px', transition: 'var(--transition)' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Otro */}
        {step3.tecnica === 'otro' && (
          <div className="ncd-form-section">
            <p className="ncd-section-title">Descripción del Análisis</p>
            <div className="ncd-form-group full">
              <label htmlFor="otro_descripcion">Descripción del análisis</label>
              <textarea
                id="otro_descripcion"
                rows={5}
                placeholder="Describe el método y proceso de análisis utilizado..."
                value={step3.otro_descripcion}
                onChange={e => setStep3(s => ({ ...s, otro_descripcion: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Causa Raíz Identificada — siempre visible */}
        <div className="ncd-form-section">
          <p className="ncd-section-title">Conclusión</p>
          <div className="ncd-causa-raiz-box">
            <label htmlFor="causa_raiz">Causa Raíz Identificada</label>
            <textarea
              id="causa_raiz"
              rows={3}
              placeholder="Describe la causa raíz detectada como resultado del análisis..."
              value={step3.causa_raiz}
              onChange={e => setStep3(s => ({ ...s, causa_raiz: e.target.value }))}
            />
          </div>
        </div>
      </>
    );
  };

  /* ── Render current step content ── */
  /* ── Render Step 4 ── */
  const renderStep4 = () => (
    <>
      <div className="ncd-form-section">
        <p className="ncd-section-title">Acciones del Plan de Trabajo</p>

        {accionesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <div className="ncd-acciones-list">
            {acciones.length === 0 && (
              <div className="ncd-acciones-empty">
                <p>No hay acciones registradas aún</p>
                <span>Agregá la primera acción con el botón de abajo</span>
              </div>
            )}
            {acciones.map(a => {
              const pct = a.avance || 0;
              const estadoColor = { pendiente: '#F59E0B', en_proceso: '#3B82F6', cerrada: '#10B981' }[a.estado] || '#9ca3af';
              const diasRestantes = (() => {
                if (a.estado === 'cerrada' || !a.fecha_vencimiento) return null;
                const hoy = new Date(); hoy.setHours(0,0,0,0);
                const vence = new Date(a.fecha_vencimiento); vence.setHours(0,0,0,0);
                return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
              })();
              return (
                <div key={a.id} className="ncd-accion-card" onClick={() => { setEditingAccion(a); setAccionForm({ descripcion: a.descripcion, responsable_id: a.responsable_id || '', fecha_vencimiento: a.fecha_vencimiento || '', avance: a.avance || 0 }); setShowAccionModal(true); }}>
                  <div className="ncd-accion-card-header">
                    <span className="ncd-accion-codigo">{a.codigo}</span>
                    {a.tipo === 'rectificativa' && (
                      <span className="ncd-accion-badge-rectif">RECTIFICATIVA</span>
                    )}
                    <span className="ncd-accion-estado" style={{ background: estadoColor + '20', color: estadoColor }}>{a.estado?.replace('_', ' ')}</span>
                    {diasRestantes !== null && (
                      <span className={`ncd-accion-dias${diasRestantes < 0 ? ' vencida' : diasRestantes === 0 ? ' hoy' : diasRestantes <= 7 ? ' urgente' : ' normal'}`}>
                        {diasRestantes < 0
                          ? `Vencida hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) !== 1 ? 's' : ''}`
                          : diasRestantes === 0
                          ? 'Vence hoy'
                          : `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`}
                      </span>
                    )}
                    {a.tipo !== 'rectificativa' && (
                      <button
                        className="ncd-accion-delete"
                        title="Eliminar acción"
                        onClick={async e => {
                          e.stopPropagation();
                          if (!window.confirm(`¿Eliminar ${a.codigo}?`)) return;
                          await supabase.from('nc_acciones').delete().eq('id', a.id);
                          fetchAcciones();
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <p className="ncd-accion-desc">{a.descripcion}</p>
                  <div className="ncd-accion-card-footer">
                    <span className="ncd-accion-meta">{a.responsable?.full_name || '—'}</span>
                    {a.fecha_vencimiento && <span className="ncd-accion-meta">Vence: {new Date(a.fecha_vencimiento).toLocaleDateString('es-AR')}</span>}
                    <div className="ncd-accion-progress-wrap">
                      <div className="ncd-accion-progress-bar">
                        <div className="ncd-accion-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : 'var(--primary-color)' }} />
                      </div>
                      <span className="ncd-accion-pct">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="ncd-step2-add-btn"
          style={{ marginTop: 12 }}
          onClick={() => { setEditingAccion(null); setAccionForm({ descripcion: '', responsable_id: '', fecha_vencimiento: '', avance: 0 }); setShowAccionModal(true); }}
        >
          + Nueva acción
        </button>
      </div>

      <div className="ncd-form-section">
        <p className="ncd-section-title">Responsable de Verificar la Eficacia</p>

        {/* Pregunta inicial */}
        {seleccionarVerif === null && (
          <div className="ncd-verif-pregunta">
            <p className="ncd-verif-pregunta-texto">
              ¿Deseás asignar responsable(s) de verificación?
            </p>
            <p className="ncd-verif-pregunta-hint">
              Si no lo hacés, el/la Responsable de Calidad llevará a cabo esta verificación.
            </p>
            <div className="ncd-verif-pregunta-btns">
              <button type="button" className="ncd-verif-btn-si" onClick={() => setSeleccionarVerif(true)}>
                Sí, quiero asignar
              </button>
              <button type="button" className="ncd-verif-btn-no" onClick={() => { setSeleccionarVerif(false); setField('responsable_verif', []); }}>
                No, dejar al Responsable de Calidad
              </button>
            </div>
          </div>
        )}

        {/* Respondió NO */}
        {seleccionarVerif === false && (() => {
          const responsablesCalidad = profiles.filter(p => p.job_title === 'Responsable de Calidad');
          return (
            <div className="ncd-verif-calidad">
              <p className="ncd-verif-calidad-texto">
                La verificación de eficacia quedará a cargo de{' '}
                <strong>{responsablesCalidad.length > 0 ? responsablesCalidad.map(p => p.full_name).join(', ') : 'el/la Responsable de Calidad'}</strong>.
              </p>
              <button type="button" className="ncd-verif-cambiar" onClick={() => setSeleccionarVerif(null)}>
                Cambiar respuesta
              </button>
            </div>
          );
        })()}

        {/* Respondió SÍ */}
        {seleccionarVerif === true && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              El auditor, emisor, responsables del proceso, responsable de análisis y participantes del equipo no pueden ser seleccionados.
            </p>
            <div className="ncd-form-group" style={{ maxWidth: 400 }}>
              <MultiPersonPickerBtn
                selectedIds={form.responsable_verif}
                profiles={profiles}
                onClick={() => setPickerTarget('verif')}
              />
            </div>
            <button type="button" className="ncd-verif-cambiar" style={{ marginTop: 8 }} onClick={() => { setSeleccionarVerif(null); setField('responsable_verif', []); }}>
              Cambiar respuesta
            </button>
          </>
        )}
      </div>

      {showAccionModal && (
        <AccionModalInner
          editingAccion={editingAccion}
          accionForm={accionForm}
          setAccionForm={setAccionForm}
          profiles={profiles}
          accionPicker={accionPicker}
          setAccionPicker={setAccionPicker}
          onClose={() => { setShowAccionModal(false); fetchAcciones(); }}
          onSaved={() => { setShowAccionModal(false); fetchAcciones(); }}
          onHitoSaved={() => fetchAcciones()}
          hallazgoId={id}
          hallazgoNumero={form.numero}
        />
      )}
    </>
  );

  /* ── Render Step 5 ── */
  const setVerif = (accionId, patch) =>
    setAccionesVerif(prev => ({ ...prev, [accionId]: { ...prev[accionId], ...patch } }));

  const handleSaveVerif = async (accionId) => {
    const v = accionesVerif[accionId];
    if (!v) return;
    setVerif(accionId, { saving: true });
    try {
      const newUrls = [];
      for (const file of (v.files || []).slice(0, 3 - (v.adjuntos || []).length)) {
        const ext = file.name.split('.').pop();
        const path = `verif/${accionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('nc-adjuntos').upload(path, file);
        if (!error) newUrls.push(path);
      }
      const allAdj = [...(v.adjuntos || []), ...newUrls].slice(0, 3);
      await supabase.from('nc_acciones').update({
        verif_eficaz: v.eficaz,
        verif_fecha: v.fecha || null,
        verif_detalle: v.detalle || null,
        verif_adjunto_1: allAdj[0] || null,
        verif_adjunto_2: allAdj[1] || null,
        verif_adjunto_3: allAdj[2] || null,
      }).eq('id', accionId);
      setVerif(accionId, { adjuntos: allAdj, files: [], saving: false });

      // Si no fue eficaz → crear acción rectificativa y volver al paso 4
      if (v.eficaz === false) {
        const { count } = await supabase
          .from('nc_acciones').select('id', { count: 'exact', head: true })
          .eq('hallazgo_id', id);
        const codigo = `ACC-${String((count || 0) + 1).padStart(4, '0')}`;
        const { data: inserted } = await supabase.from('nc_acciones').insert({
          hallazgo_id: id,
          codigo,
          descripcion: `[RECTIFICATIVA] ${v.detalle || 'Acción no fue eficaz — requiere nueva acción correctiva.'}`,
          responsable_id: rectifForm.responsable_id || null,
          fecha_vencimiento: rectifForm.fecha_vencimiento || null,
          avance: 0,
          estado: 'pendiente',
          tipo: 'rectificativa',
        }).select('id').single();
        if (rectifForm.responsable_id && inserted?.id) {
          await notificarAsignacion({
            hallazgoId: id,
            hallazgoNumero: form.numero || id,
            tipo: 'responsable_accion',
            newIds: [rectifForm.responsable_id],
            prevIds: [],
          });
        }
        setRectifForm({ responsable_id: '', fecha_vencimiento: '' });
        await supabase.from('nc_hallazgos').update({ paso_actual: 4 }).eq('id', id);
        setPasoActual(4);
        setCurrentStep(4);
        await fetchAcciones();
        showToast('Acción no eficaz: se creó una acción rectificativa y se regresó al Paso 4', 'error');
      } else {
        showToast('Verificación guardada', 'success');
      }
    } catch {
      setVerif(accionId, { saving: false });
    }
  };

  const renderStep5 = () => {
    if (accionesLoading) return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Loader2 size={24} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
    if (acciones.length === 0) return (
      <div className="ncd-form-section">
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay acciones registradas en el Plan de Trabajo.</p>
      </div>
    );
    const verifResponsables = profiles.filter(p => form.responsable_verif.includes(p.id));
    return (
      <div className="ncd-form-section" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {!canVerif && (
          <div className="ncd-verif-locked">
            <div className="ncd-verif-locked-icon">
              <User size={20} />
            </div>
            <div className="ncd-verif-locked-body">
              <span className="ncd-verif-locked-title">Verificación restringida</span>
              <span className="ncd-verif-locked-desc">
                {verifResponsables.length > 0
                  ? <>La verificación de eficacia está a cargo de: <strong>{verifResponsables.map(p => p.full_name).join(', ')}</strong></>
                  : 'No hay responsables de verificación asignados. Editá el Paso 4 para asignarlos.'}
              </span>
            </div>
          </div>
        )}
        {acciones.map(a => {
          const v = accionesVerif[a.id] || { eficaz: null, fecha: '', detalle: '', adjuntos: [], files: [], saving: false };
          const totalAdj = (v.adjuntos?.length || 0) + (v.files?.length || 0);
          const estadoColor = { pendiente: '#F59E0B', en_proceso: '#3B82F6', cerrada: '#10B981' }[a.estado] || '#9ca3af';

          return (
            <div key={a.id} className="ncd-step5-accion-card">
              {/* Resumen de la acción */}
              <div className="ncd-step5-accion-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{a.codigo}</span>
                  <span style={{ background: estadoColor + '20', color: estadoColor, borderRadius: 4, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                    {a.estado?.replace('_', ' ')}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vence: {a.fecha_vencimiento ? new Date(a.fecha_vencimiento).toLocaleDateString('es-AR') : '—'}</span>
              </div>

              <div className="ncd-step5-accion-body">
                {/* Col izq: resumen + hitos */}
                <div className="ncd-step5-col-left">
                  <p style={{ fontSize: 13, color: 'var(--text-main)', marginBottom: 10 }}>{a.descripcion}</p>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Responsable </span>
                      <span style={{ fontSize: 12 }}>{a.responsable?.full_name || '—'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Avance </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: a.avance === 100 ? '#10B981' : 'var(--text-main)' }}>{a.avance || 0}%</span>
                    </div>
                  </div>
                  <div className="ncd-accion-progress-bar" style={{ marginBottom: 12 }}>
                    <div className="ncd-accion-progress-fill" style={{ width: `${a.avance || 0}%`, background: a.avance === 100 ? '#10B981' : 'var(--primary-color)' }} />
                  </div>
                  {/* Hitos */}
                  <Step5Hitos accionId={a.id} />
                </div>

                {/* Col der: verificación */}
                <div className="ncd-step5-col-right">
                  {!canVerif && v.eficaz !== null && v.eficaz !== undefined ? (
                    <div className="ncd-step5-verif-readonly">
                      <span className="ncd-step5-verif-readonly-label">Resultado</span>
                      <span className={`ncd-step5-verif-readonly-result${v.eficaz ? ' si' : ' no'}`}>
                        {v.eficaz ? '✓ Eficaz' : '✗ No eficaz'}
                      </span>
                      {v.fecha && <span className="ncd-step5-verif-readonly-meta">Fecha: {new Date(v.fecha).toLocaleDateString('es-AR')}</span>}
                      {v.detalle && <span className="ncd-step5-verif-readonly-meta">{v.detalle}</span>}
                    </div>
                  ) : !canVerif ? (
                    <div className="ncd-step5-verif-readonly ncd-step5-verif-readonly--pending">
                      <span className="ncd-step5-verif-readonly-label">Pendiente de verificación</span>
                    </div>
                  ) : null}
                  {canVerif && <div className="ncd-step5-verif-block">
                    <div className="ncd-step5-header">
                      <span className="ncd-step5-header-title">Verificación de Eficacia</span>
                    </div>

                    <div className="ncd-step5-eficaz-row">
                      <span className="ncd-step5-eficaz-label">¿Fué eficaz?</span>
                      <label className="ncd-step5-radio">
                        <input type="radio" name={`eficaz-${a.id}`} checked={v.eficaz === true} onChange={() => setVerif(a.id, { eficaz: true })} disabled={!canVerif} />
                        Sí
                      </label>
                      <label className="ncd-step5-radio">
                        <input type="radio" name={`eficaz-${a.id}`} checked={v.eficaz === false} onChange={() => setVerif(a.id, { eficaz: false })} disabled={!canVerif} />
                        No
                      </label>
                    </div>

                    <div className="ncd-step5-detalle">
                      <label className="ncd-step5-detalle-label">
                        Fecha de evaluación:
                        <input type="date" className="ncd-step5-fecha" style={{ marginLeft: 8 }} value={v.fecha} onChange={e => setVerif(a.id, { fecha: e.target.value })} disabled={!canVerif} />
                      </label>
                      <label className="ncd-step5-detalle-label" style={{ marginTop: 10 }}>Detalle:</label>
                      <textarea
                        rows={3}
                        placeholder="Indique las causas que justifican la decisión..."
                        value={v.detalle}
                        onChange={e => setVerif(a.id, { detalle: e.target.value })}
                        disabled={!canVerif}
                      />
                    </div>

                    {/* Adjuntos */}
                    <div className="ncd-step5-adjuntos">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(v.adjuntos || []).map((path, i) => {
                          const name = decodeURIComponent(path.split('/').pop().replace(/^\d+-[a-z0-9]+\./, ''));
                          return (
                            <span key={i} className="ncd-hito-file-chip">
                              <FileText size={11} />
                              {name.length > 20 ? name.slice(0, 18) + '…' : name}
                              <button onClick={() => {
                                const updated = v.adjuntos.filter((_, j) => j !== i);
                                setVerif(a.id, { adjuntos: updated });
                                supabase.from('nc_acciones').update({
                                  verif_adjunto_1: updated[0] || null,
                                  verif_adjunto_2: updated[1] || null,
                                  verif_adjunto_3: updated[2] || null,
                                }).eq('id', a.id);
                              }}><X size={10} /></button>
                            </span>
                          );
                        })}
                        {(v.files || []).map((f, i) => (
                          <span key={i} className="ncd-hito-file-chip">
                            <FileText size={11} />
                            {f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}
                            <button onClick={() => setVerif(a.id, { files: v.files.filter((_, j) => j !== i) })}><X size={10} /></button>
                          </span>
                        ))}
                        {totalAdj < 3 && (
                          <>
                            <input
                              ref={el => step5FileRefs.current[a.id] = el}
                              type="file" multiple
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                              style={{ display: 'none' }}
                              onChange={e => {
                                const sel = Array.from(e.target.files || []).slice(0, 3 - totalAdj);
                                setVerif(a.id, { files: [...(v.files || []), ...sel] });
                                e.target.value = '';
                              }}
                            />
                            <button className="ncd-adjunto-pick-btn" onClick={() => step5FileRefs.current[a.id]?.click()} disabled={!canVerif}>
                              <Paperclip size={12} />
                              Adjuntar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="ncd-step5-footer">
                      <button
                        className="ncd-btn-primary"
                        onClick={() => {
                          if (v.eficaz === false) setConfirmRectif(a.id);
                          else handleSaveVerif(a.id);
                        }}
                        disabled={v.saving || v.eficaz === null || !canVerif}
                      >
                        {v.saving ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Check size={13} />}
                        Guardar
                      </button>
                    </div>
                  </div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStepContent = () => {
    const step = STEPS.find(s => s.num === currentStep);
    if (currentStep === 1) return renderStep1();
    if (currentStep === 2) return renderStep2();
    if (currentStep === 3) return renderStep3();
    if (currentStep === 4) return renderStep4();
    if (currentStep === 5) return renderStep5();
    return <StepPlaceholder step={step} />;
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="ncd-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <Loader2 size={28} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  const currentStepData = STEPS.find(s => s.num === currentStep);

  return (
    <div className="ncd-container">
      {/* Header */}
      <div className="ncd-page-header">
        <button className="ncd-back-btn" onClick={() => navigate('/sgi/nc')}>
          <ArrowLeft size={15} />
          Volver
        </button>
        <h1 className="ncd-page-title">
          {isNew ? 'Nuevo Hallazgo' : `Hallazgo #${form.numero || id?.slice(0, 8)}`}
        </h1>
        {!isNew && (
          <span className="ncd-page-subtitle">
            — Paso {pasoActual} de 5
          </span>
        )}
        {!isNew && (
          <button
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#E71D36', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => setShowPDF(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><polyline points="9 9 10 9"/></svg>
            Exportar PDF
          </button>
        )}
      </div>

      {/* Stepper — horizontal */}
      <div className="ncd-stepper-wrapper">
        <button
          className="ncd-stepper-nav"
          onClick={() => setCurrentStep(s => s - 1)}
          disabled={currentStep <= 1}
          title="Paso anterior"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="ncd-stepper">
        {STEPS.map((step, i) => {
          const isCompleted = step.num < pasoActual;
          const isCurrent   = step.num === currentStep;
          const isDisabled  = isNew ? step.num > 1 : step.num > pasoActual;

          return (
            <React.Fragment key={step.num}>
              <div
                className={`ncd-step-item${isCompleted ? ' completed' : ''}${isCurrent ? ' current' : ''}${isDisabled ? ' disabled' : ''}`}
                onClick={() => handleStepClick(step.num)}
                title={isDisabled ? 'Completa los pasos anteriores primero' : step.label}
              >
                <div className="ncd-step-indicator">
                  {isCompleted ? <Check size={13} /> : step.num}
                </div>
                <div className="ncd-step-info">
                  <div className="ncd-step-num">Paso {step.num}</div>
                  <div className="ncd-step-label">{step.label}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && <div className={`ncd-step-connector${step.num < pasoActual ? ' done' : ''}`} />}
            </React.Fragment>
          );
        })}
        </div>

        <button
          className="ncd-stepper-nav"
          onClick={() => setCurrentStep(s => s + 1)}
          disabled={currentStep >= pasoActual || isNew}
          title="Paso siguiente"
        >
          <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>

      {/* Layout */}
      <div className="ncd-layout">
        {/* Content */}
        <div className="ncd-content-panel">
          <div className="ncd-panel-header">
            <div className="ncd-panel-step-badge">{currentStepData?.num}</div>
            <div className="ncd-panel-header-text">
              <h3>{currentStepData?.label}</h3>
              <p>
                {currentStep === 1
                  ? 'Completa la información del hallazgo detectado'
                  : `Paso ${currentStep} de 5 del proceso de gestión`}
              </p>
            </div>
          </div>

          {!canEdit && (
            <div className="ncd-readonly-banner">
              <div className="ncd-readonly-banner-icon"><User size={18} /></div>
              <span>Solo pueden editar este hallazgo: el emisor, auditor, responsables del proceso, equipo de análisis y administradores SGI.</span>
            </div>
          )}

          <div className="ncd-panel-body">
            {renderStepContent()}
          </div>

          {currentStep <= 5 && (
            <div className="ncd-panel-footer">
              <div className="ncd-panel-footer-left">
                {currentStep > 1 && !isNew && (
                  <button
                    className="ncd-btn-secondary"
                    onClick={() => setCurrentStep(s => s - 1)}
                    disabled={saving}
                  >
                    ← Paso anterior
                  </button>
                )}
              </div>
              <div className="ncd-panel-footer-right">
                <button
                  className="ncd-btn-secondary"
                  onClick={() => handleSave(false)}
                  disabled={saving || !canEdit || (currentStep === 5 && !canVerif)}
                >
                  {saving ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
                  Guardar borrador
                </button>
                {(() => {
                  const sinAcciones = currentStep === 4 && acciones.length === 0;
                  const accionesPendientes = currentStep === 4 && acciones.length > 0 && acciones.some(a => a.estado !== 'cerrada');
                  const isCierre = currentStep === 5;
                  const verifPendiente = isCierre && acciones.some(a => (accionesVerif[a.id]?.eficaz ?? a.verif_eficaz) === null || (accionesVerif[a.id]?.eficaz ?? a.verif_eficaz) === undefined);
                  return (
                    <button
                      className="ncd-btn-primary"
                      onClick={() => handleSave(true)}
                      disabled={saving || !canEdit || sinAcciones || accionesPendientes || verifPendiente || (isCierre && !canVerif)}
                      title={sinAcciones ? 'Agregá al menos una acción antes de continuar' : accionesPendientes ? 'Cerrá todas las acciones antes de continuar' : verifPendiente ? 'Completá la verificación de todas las acciones' : ''}
                      style={isCierre ? { background: '#10B981', borderColor: '#10B981' } : {}}
                    >
                      {saving
                        ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} />
                        : <Check size={15} />}
                      {isCierre ? 'Cerrar hallazgo' : isNew ? 'Guardar y continuar' : 'Siguiente paso'}
                      {accionesPendientes && (
                        <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 4, opacity: 0.8 }}>
                          ({acciones.filter(a => a.estado !== 'cerrada').length} pendiente{acciones.filter(a => a.estado !== 'cerrada').length !== 1 ? 's' : ''})
                        </span>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmación acción rectificativa */}
      {confirmRectif && createPortal(
        <div className="ncd-picker-overlay ncd-confirm-rectif-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setConfirmRectif(null); }}>
          <div className="ncd-confirm-rectif-modal">
            <div className="ncd-confirm-rectif-icon">⚠</div>
            <h4 className="ncd-confirm-rectif-title">Acción marcada como no eficaz</h4>
            <p className="ncd-confirm-rectif-body">
              Se generará una nueva acción <strong>RECTIFICATIVA</strong> y el hallazgo volverá al <strong>Paso 4</strong>. Podés asignar un responsable y fecha de vencimiento ahora.
            </p>

            <div className="ncd-confirm-rectif-fields">
              <div className="ncd-form-group">
                <label>Responsable de la acción rectificativa</label>
                <PersonPickerBtn
                  selectedId={rectifForm.responsable_id}
                  profiles={profiles}
                  onClick={() => setRectifPicker(true)}
                />
              </div>
              <div className="ncd-form-group">
                <label>Fecha de vencimiento</label>
                <input
                  type="date"
                  value={rectifForm.fecha_vencimiento}
                  onChange={e => setRectifForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                />
              </div>
            </div>

            <div className="ncd-confirm-rectif-btns">
              <button className="ncd-btn-secondary" onClick={() => setConfirmRectif(null)}>
                Cancelar
              </button>
              <button
                className="ncd-btn-primary"
                style={{ background: '#E71D36', borderColor: '#E71D36' }}
                onClick={() => { const aid = confirmRectif; setConfirmRectif(null); handleSaveVerif(aid); }}
              >
                <Check size={14} /> Confirmar y generar rectificativa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {rectifPicker && (
        <PersonPickerModal
          profiles={profiles}
          title="Responsable de la acción rectificativa"
          selectedIds={rectifForm.responsable_id ? [rectifForm.responsable_id] : []}
          onSelect={p => { setRectifForm(f => ({ ...f, responsable_id: p.id })); setRectifPicker(false); }}
          onClose={() => setRectifPicker(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Person Picker */}
      {pickerTarget && pickerTarget !== 'responsable' && (
        <PersonPickerModal
          profiles={profiles}
          title={pickerTarget === 'auditor' ? 'Seleccionar Auditor' : 'Seleccionar Emisor'}
          onSelect={(p) => setField(pickerTarget === 'auditor' ? 'auditor_id' : 'emisor_id', p.id)}
          onClose={() => setPickerTarget(null)}
        />
      )}
      {pickerTarget === 'responsable' && (
        <PersonPickerModal
          profiles={profiles}
          title="Responsables del Proceso"
          multi
          selectedIds={form.responsable_proceso}
          onSelect={(ids) => setField('responsable_proceso', ids)}
          onClose={() => setPickerTarget(null)}
        />
      )}
      {pickerTarget === 'verif' && (() => {
        const excludidos = new Set([
          form.auditor_id,
          form.emisor_id,
          step2.responsable_analisis_id,
          ...(step2.participantes || []),
          ...(form.responsable_proceso || []),
        ].filter(Boolean));
        const profilesVerif = profiles.filter(p => !excludidos.has(p.id));
        return (
          <PersonPickerModal
            profiles={profilesVerif}
            title="Responsables de Verificar la Eficacia"
            multi
            selectedIds={form.responsable_verif}
            onSelect={(ids) => setField('responsable_verif', ids)}
            onClose={() => setPickerTarget(null)}
          />
        );
      })()}
      {showPDF && (
        <NCExportarPDF hallazgoId={id} onClose={() => setShowPDF(false)} />
      )}
    </div>
  );
}
