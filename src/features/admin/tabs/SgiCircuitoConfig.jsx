import React, { useEffect, useMemo, useState } from 'react';
import {
  FilePlus, SearchCheck, BadgeCheck, CheckCircle, ChevronRight, Mail, Eye, Save, Send,
  Users, BellRing, XCircle,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast, LoadingSpinner, Select } from '../../../components/common';
import { fetchDirectorioProfiles } from '../../../services/usuariosService';
import {
  fetchNotifConfig, saveNotifConfig, normalizarCircuito, emailCircuitoSgi, SGI_CIRCUITO,
} from '../../../services/notifConfigService';
import { isRevisorSgi } from '../../../lib/visibilidad';
import './SgiNotifConfig.css';
import './SgiCircuitoConfig.css';

// Alertas configurables: cada fila es un email (evento + destinatario).
const ALERTAS = [
  { key: 'revision_pendiente',   paso: 'revision',   evento: 'revision_pendiente',   rol: 'revisor',   titulo: 'Hay una versión para revisar',      para: 'Revisores' },
  { key: 'pendiente_aprobacion', paso: 'aprobacion', evento: 'pendiente_aprobacion', rol: 'aprobador', titulo: 'La revisión pasó y espera aprobación', para: 'Gerente aprobador' },
  { key: 'aprobado_autor',       paso: 'vigente',    evento: 'aprobado',             rol: 'autor',     titulo: 'Documento aprobado',               para: 'Autor' },
  { key: 'aprobado_revisor',     paso: 'vigente',    evento: 'aprobado',             rol: 'revisor',   titulo: 'Documento aprobado',               para: 'Revisor' },
  { key: 'rechazado_autor',      paso: 'rechazo',    evento: 'rechazado',            rol: 'autor',     titulo: 'Documento rechazado (con motivo)', para: 'Autor' },
  { key: 'rechazado_revisor',    paso: 'rechazo',    evento: 'rechazado',            rol: 'revisor',   titulo: 'Documento rechazado (con motivo)', para: 'Revisor' },
];

const RECORDATORIO_OPCIONES = [
  { value: '0', label: 'Nunca' },
  { value: '1', label: 'Cada día' },
  { value: '2', label: 'Cada 2 días' },
  { value: '3', label: 'Cada 3 días' },
  { value: '5', label: 'Cada 5 días' },
  { value: '7', label: 'Cada 7 días' },
];

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

const Switch = ({ on, onChange, label, small }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!on}
    aria-label={label}
    className={`adm-switch${small ? ' sm' : ''}${on ? ' on' : ''}`}
    onClick={() => onChange(!on)}
  >
    <span className="adm-switch-thumb" />
  </button>
);

/**
 * Admin › SGI: quién revisa, qué emails se envían en cada paso del circuito
 * de aprobación y cada cuánto se recuerdan los pendientes. Con vista previa.
 */
const SgiCircuitoConfig = ({ ejemplo }) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [personas, setPersonas] = useState([]);

  const [previewKey, setPreviewKey] = useState('revision_pendiente'); // key de ALERTAS o 'recordatorio'
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [testState, setTestState] = useState('idle');

  useEffect(() => {
    fetchNotifConfig(SGI_CIRCUITO).then(({ data }) => {
      const cfg = normalizarCircuito(data);
      setSaved(cfg);
      setForm(cfg);
    });
    fetchDirectorioProfiles().then(({ data }) => setPersonas(data));
  }, []);

  const op = form?.opciones;
  const setOp = (k, v) => setForm(f => ({ ...f, opciones: { ...f.opciones, [k]: v } }));
  const setAlerta = (k, v) => setForm(f => ({ ...f, opciones: { ...f.opciones, alertas: { ...f.opciones.alertas, [k]: v } } }));
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const departamentos = useMemo(() => {
    const set = new Set(personas.map(p => p.department?.trim()).filter(Boolean));
    if (op?.revisor_departamento) set.add(op.revisor_departamento);
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [personas, op?.revisor_departamento]);

  const personaOptions = useMemo(() => personas.map(p => ({
    value: p.id,
    label: p.full_name || p.email,
    description: [p.job_title, p.department].filter(Boolean).join(' · ') || undefined,
  })), [personas]);

  // Quiénes pueden revisar hoy con la config en edición
  const revisores = useMemo(
    () => (op ? personas.filter(p => isRevisorSgi(p, op)) : []),
    [personas, op],
  );

  // ── Vista previa ──
  const previewDef = previewKey === 'recordatorio'
    ? { evento: 'recordatorio_revision', rol: 'revisor', titulo: 'Recordatorio de pendiente', para: 'Quien tiene el pendiente' }
    : ALERTAS.find(a => a.key === previewKey);

  const sample = useMemo(() => ({
    evento: previewDef.evento,
    rol: previewDef.rol,
    titulo: ejemplo?.titulo || 'Procedimiento de ejemplo',
    codigo: ejemplo?.codigo || 'POE-XXX-01',
    versionNumero: String((parseInt(ejemplo?.versionNumero, 10) || 0) + 1),
    documentoId: ejemplo?.documentoId,
    dias: Number(op?.recordatorio_dias) || 3,
    area: op?.revisor_departamento || 'el área revisora',
  }),[previewDef.evento, previewDef.rol, ejemplo?.titulo, ejemplo?.codigo, ejemplo?.versionNumero, ejemplo?.documentoId, op?.recordatorio_dias, op?.revisor_departamento]);

  const ready = !!form;
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setPreview(null);
    const t = setTimeout(async () => {
      const { data, error } = await emailCircuitoSgi('preview', sample);
      if (cancelled) return;
      if (error || !data?.html) { setPreviewError(true); return; }
      setPreviewError(false);
      setPreview(data);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [sample, ready]);

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, opciones: { ...form.opciones, revisor_departamento: (form.opciones.revisor_departamento || '').trim() } };
    const { error } = await saveNotifConfig(SGI_CIRCUITO, payload, profile?.id);
    setSaving(false);
    if (error) return showToast('No se pudo guardar el circuito', 'error');
    setSaved(payload);
    setForm(payload);
    showToast('Circuito de aprobación guardado', 'success');
  };

  const handleTest = async () => {
    setTestState('sending');
    const { data, error } = await emailCircuitoSgi('test', sample);
    if (error) { setTestState('idle'); return showToast('No se pudo enviar el email de prueba', 'error'); }
    setTestState('sent');
    showToast(`Email de prueba enviado a ${data?.to ?? 'tu casilla'}`, 'success');
    setTimeout(() => setTestState('idle'), 4000);
  };

  if (!form) return <section className="adm-section"><LoadingSpinner /></section>;

  const a = op.alertas;
  const sinRevisores = revisores.length === 0;
  const emailsActivos = Object.values(a).filter(Boolean).length + (op.recordatorio_dias > 0 ? 1 : 0);

  // Chips de alertas por paso para el diagrama
  const chips = (paso) => ALERTAS.filter(x => x.paso === paso).map(x => (
    <button
      key={x.key}
      type="button"
      className={`sgic-chip${a[x.key] && form.enabled ? ' on' : ''}${previewKey === x.key ? ' selected' : ''}`}
      onClick={() => setPreviewKey(x.key)}
      title={`Ver email: ${x.titulo} → ${x.para}`}
    >
      <Mail size={12} strokeWidth={1.5} aria-hidden="true" /> {x.para}
    </button>
  ));

  const PASOS = [
    { key: 'creacion',   icon: FilePlus,    titulo: 'Creación',   desc: 'Alguien sube un documento controlado o corrige uno rechazado' },
    { key: 'revision',   icon: SearchCheck, titulo: `Revisión ${op.revisor_departamento || ''}`.trim(), desc: `${revisores.length} persona${revisores.length === 1 ? '' : 's'} pueden revisar` },
    { key: 'aprobacion', icon: BadgeCheck,  titulo: 'Aprobación', desc: 'Gerente elegido en cada documento (o gerente del área del autor)' },
    { key: 'vigente',    icon: CheckCircle, titulo: 'Vigente',    desc: 'Queda publicada para todos' },
  ];

  return (
    <section className="adm-section">
      <div className="admin-list-header">
        <div>
          <h3>
            Circuito de aprobación{' '}
            <span className={`adm-badge ${form.enabled ? 'success' : 'neutral'}`}>
              {form.enabled ? `${emailsActivos} alertas activas` : 'Alertas apagadas'}
            </span>
          </h3>
          <p className="adm-panel-desc">
            Definí quién revisa los documentos controlados y a quién se avisa por email en cada paso. Tocá un aviso para ver el email.
          </p>
        </div>
        <Switch on={form.enabled} onChange={v => setForm(f => ({ ...f, enabled: v }))} label="Activar alertas del circuito de aprobación" />
      </div>

      {/* ── Diagrama del circuito ── */}
      <ol className="sgic-flow" aria-label="Pasos del circuito de aprobación">
        {PASOS.map((p, i) => (
          <React.Fragment key={p.key}>
            <li className={`sgic-step sgic-step--${p.key}${p.key === 'revision' && sinRevisores ? ' warn' : ''}`}>
              <span className="sgic-step-num">{i + 1}</span>
              <span className="sgic-step-icon"><p.icon size={18} strokeWidth={1.5} /></span>
              <strong>{p.titulo}</strong>
              <span className="sgic-step-desc">{p.desc}</span>
              <div className="sgic-chips">{chips(p.key)}</div>
            </li>
            {i < PASOS.length - 1 && <li className="sgic-arrow" aria-hidden="true"><ChevronRight size={18} /></li>}
          </React.Fragment>
        ))}
      </ol>
      <div className="sgic-reject">
        <XCircle size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>Si se rechaza en revisión o aprobación, vuelve al autor con el motivo. Al corregirlo y guardarlo, reingresa a revisión.</span>
        <div className="sgic-chips">{chips('rechazo')}</div>
      </div>

      <div className={`sgin-grid${form.enabled ? '' : ' is-off-alerts'}`}>
        {/* ── Configuración ── */}
        <div className="sgin-config">
          <h4 className="sgin-label">Quién revisa</h4>
          <div className="form-group">
            <label htmlFor="sgic-area">Área revisora</label>
            <Select
              id="sgic-area"
              searchable
              clearable
              value={op.revisor_departamento || ''}
              onChange={v => setOp('revisor_departamento', v || '')}
              placeholder="Sin área (solo revisores adicionales)"
              options={departamentos.map(d => ({ value: d, label: d }))}
            />
            <span className="sgic-help">Todas las personas de esta área pueden revisar y reciben el aviso.</span>
          </div>
          <div className="form-group">
            <label htmlFor="sgic-extra">Revisores adicionales</label>
            <Select
              id="sgic-extra"
              multiple
              searchable
              value={op.revisores_ids}
              onChange={v => setOp('revisores_ids', v || [])}
              placeholder="Buscar personas…"
              options={personaOptions}
            />
          </div>
          <div className={`sgic-revisores${sinRevisores ? ' warn' : ''}`}>
            <Users size={14} strokeWidth={1.5} aria-hidden="true" />
            {sinRevisores
              ? <span>Nadie puede revisar: los documentos controlados quedarían trabados.</span>
              : <>
                  <span>{revisores.length} {revisores.length === 1 ? 'persona puede' : 'personas pueden'} revisar</span>
                  <span className="sgic-avatars">
                    {revisores.slice(0, 8).map(r => <span key={r.id} className="sgic-avatar" title={r.full_name}>{initials(r.full_name)}</span>)}
                    {revisores.length > 8 && <span className="sgic-avatar more">+{revisores.length - 8}</span>}
                  </span>
                </>}
          </div>

          <h4 className="sgin-label">Alertas por email</h4>
          {ALERTAS.map(x => (
            <div key={x.key} className={`sgin-row sgic-alert-row${previewKey === x.key ? ' selected' : ''}`}>
              <div className="sgin-row-text">
                <span className="sgin-row-title">{x.titulo}</span>
                <span className="sgin-row-desc">Para: {x.para}</span>
              </div>
              <button type="button" className="adm-action sm" title="Ver email" aria-label={`Ver email: ${x.titulo} para ${x.para}`} onClick={() => setPreviewKey(x.key)}>
                <Eye size={14} strokeWidth={1.5} />
              </button>
              <Switch small on={a[x.key]} onChange={v => setAlerta(x.key, v)} label={`${x.titulo} → ${x.para}`} />
            </div>
          ))}

          <h4 className="sgin-label">Recordatorios</h4>
          <div className={`sgin-row sgic-alert-row${previewKey === 'recordatorio' ? ' selected' : ''}`}>
            <span className="sgin-row-icon"><BellRing size={16} strokeWidth={1.5} /></span>
            <div className="sgin-row-text">
              <span className="sgin-row-title">Recordar pendientes trabados</span>
              <span className="sgin-row-desc">A quien tenga que revisar o aprobar, mientras siga pendiente</span>
            </div>
            <button type="button" className="adm-action sm" title="Ver email" aria-label="Ver email de recordatorio" onClick={() => setPreviewKey('recordatorio')}>
              <Eye size={14} strokeWidth={1.5} />
            </button>
            <div className="sgic-recordatorio">
              <Select
                size="sm"
                value={String(op.recordatorio_dias)}
                onChange={v => setOp('recordatorio_dias', Number(v) || 0)}
                options={RECORDATORIO_OPCIONES}
                aria-label="Frecuencia de recordatorios"
              />
            </div>
          </div>

          <p className="sgic-help sgic-footnote">Quien realiza una acción no recibe el aviso de su propia acción.</p>

          <div className="sgin-actions">
            <button type="button" className="btn-primary" onClick={handleSave} disabled={!dirty || saving}>
              <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
            {dirty && <span className="sgin-dirty">Cambios sin guardar</span>}
          </div>
        </div>

        {/* ── Vista previa ── */}
        <div className="sgin-preview">
          <div className="sgic-preview-head">
            <div>
              <span className="sgin-label sgic-preview-label">Vista previa</span>
              <strong>{previewDef.titulo}</strong>
              <span className="sgin-row-desc"> → {previewDef.para}</span>
            </div>
            <button type="button" className="adm-pill-btn sm" onClick={handleTest} disabled={testState !== 'idle'} title="Envía este email de muestra solo a tu casilla">
              {testState === 'sent'
                ? <><CheckCircle size={14} strokeWidth={1.5} /> Enviado</>
                : <><Send size={14} strokeWidth={1.5} /> {testState === 'sending' ? 'Enviando…' : 'Enviarme prueba'}</>}
            </button>
          </div>
          <div className="sgin-mail">
            <div className="sgin-mail-head">
              <span><strong>De:</strong> Ribeiro 360 &lt;notificaciones@notificaciones.ribeiro.ar&gt;</span>
              <span className="sgin-mail-subject">{preview?.subject ?? 'Generando vista previa…'}</span>
            </div>
            {previewError ? (
              <div className="sgin-mail-error">No se pudo generar la vista previa. Verificá que la Edge Function <code>send-nc-email</code> esté desplegada con la última versión.</div>
            ) : preview?.html ? (
              <iframe title="Vista previa del email del circuito" className="sgin-mail-frame" srcDoc={preview.html} sandbox="" />
            ) : (
              <div className="sgin-mail-loading"><LoadingSpinner /></div>
            )}
            {previewKey !== 'recordatorio' && !a[previewKey] && <p className="sgin-note">Este aviso está apagado: así se vería si lo activás.</p>}
            {previewKey === 'recordatorio' && !op.recordatorio_dias && <p className="sgin-note">Los recordatorios están apagados: así se verían si los activás.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SgiCircuitoConfig;
