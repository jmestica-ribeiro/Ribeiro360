import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Mail, Save, Send, CheckCircle, FileText, Users, BookOpenCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast, LoadingSpinner } from '../../../components/common';
import {
  fetchNotifConfig,
  saveNotifConfig,
  previewEmailSgiPublicado,
  sendTestEmailSgiPublicado,
  NOTIF_SGI_PUBLICADO,
  SGI_PUBLICADO_DEFAULTS,
} from '../../../services/notifConfigService';
import '../../../components/layout/NotificacionesModal.css';
import './SgiNotifConfig.css';

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

const Row = ({ icon: Icon, title, desc, children }) => (
  <div className="sgin-row">
    {Icon && <span className="sgin-row-icon"><Icon size={16} strokeWidth={1.5} /></span>}
    <div className="sgin-row-text">
      <span className="sgin-row-title">{title}</span>
      {desc && <span className="sgin-row-desc">{desc}</span>}
    </div>
    {children}
  </div>
);

/**
 * Admin › SGI: configuración + vista previa del aviso a todos los usuarios
 * cuando un documento SGI queda vigente (nuevo o nueva revisión).
 * @param {{ titulo, codigo, versionNumero, documentoId } | null} ejemplo - documento real para la vista previa
 */
const SgiNotifConfig = ({ ejemplo }) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [saved, setSaved] = useState(null);       // config guardada
  const [form, setForm] = useState(null);         // config en edición
  const [saving, setSaving] = useState(false);

  const [vista, setVista] = useState('email');    // 'email' | 'campana'
  const [tipo, setTipo] = useState('nuevo'); // 'nuevo' | 'revision' | 'obligatoria'
  const esNuevo = tipo !== 'revision';
  const [preview, setPreview] = useState(null);   // { subject, html, recipients }
  const [previewError, setPreviewError] = useState(false);
  const [testState, setTestState] = useState('idle'); // idle | sending | sent

  useEffect(() => {
    fetchNotifConfig(NOTIF_SGI_PUBLICADO).then(({ data }) => {
      const cfg = {
        enabled: data?.enabled ?? SGI_PUBLICADO_DEFAULTS.enabled,
        opciones: { ...SGI_PUBLICADO_DEFAULTS.opciones, ...(data?.opciones || {}) },
      };
      setSaved(cfg);
      setForm(cfg);
    });
  }, []);

  const op = form?.opciones;
  const setOp = (k, v) => setForm(f => ({ ...f, opciones: { ...f.opciones, [k]: v } }));
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const sample = useMemo(() => ({
    titulo: ejemplo?.titulo || 'Procedimiento de ejemplo',
    codigo: ejemplo?.codigo || 'POE-XXX-01',
    versionNumero: esNuevo ? '0' : String((parseInt(ejemplo?.versionNumero, 10) || 0) + 1),
    documentoId: ejemplo?.documentoId,
    esNuevo,
    obligatoria: tipo === 'obligatoria',
    carpeta: ejemplo?.carpeta || null,
    mensajeExtra: op?.mensaje_extra || '',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ejemplo?.titulo, ejemplo?.codigo, ejemplo?.versionNumero, ejemplo?.documentoId, ejemplo?.carpeta, tipo, op?.mensaje_extra]);

  // Vista previa del email: la genera la Edge Function con el mismo template del envío real
  const ready = !!form;
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await previewEmailSgiPublicado(sample);
      if (cancelled) return;
      if (error || !data?.html) { setPreviewError(true); return; }
      setPreviewError(false);
      setPreview(data);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [sample, ready]);

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, opciones: { ...form.opciones, mensaje_extra: form.opciones.mensaje_extra.trim() } };
    const { error } = await saveNotifConfig(NOTIF_SGI_PUBLICADO, payload, profile?.id);
    setSaving(false);
    if (error) return showToast('No se pudo guardar la configuración', 'error');
    setSaved(payload);
    setForm(payload);
    showToast('Configuración de avisos guardada', 'success');
  };

  const handleTest = async () => {
    setTestState('sending');
    const { data, error } = await sendTestEmailSgiPublicado(sample);
    if (error) { setTestState('idle'); return showToast('No se pudo enviar el email de prueba', 'error'); }
    setTestState('sent');
    showToast(`Email de prueba enviado a ${data?.to ?? 'tu casilla'}`, 'success');
    setTimeout(() => setTestState('idle'), 4000);
  };

  if (!form) return <section className="adm-section"><LoadingSpinner /></section>;

  const activo = form.enabled && (op.email || op.campana);
  const sinEventos = !op.nuevos && !op.revisiones;

  return (
    <section className="adm-section">
      <div className="admin-list-header">
        <div>
          <h3>
            Aviso de documentos publicados{' '}
            <span className={`adm-badge ${activo ? 'success' : 'neutral'}`}>{activo ? 'Activo' : 'Apagado'}</span>
          </h3>
          <p className="adm-panel-desc">
            Cuando un documento queda vigente (al subirse sin control o al aprobarlo Gerencia), se avisa a todos los usuarios.
          </p>
        </div>
        <Switch on={form.enabled} onChange={v => setForm(f => ({ ...f, enabled: v }))} label="Activar avisos de documentos publicados" />
      </div>

      <div className={`sgin-grid${form.enabled ? '' : ' is-off'}`}>
        {/* ── Configuración ── */}
        <div className="sgin-config">
          <h4 className="sgin-label">Canales</h4>
          <Row
            icon={Mail}
            title="Email a todos los usuarios"
            desc={preview?.recipients != null ? `${preview.recipients} destinatarios con email` : 'Todos los usuarios con email'}
          >
            <Switch on={op.email} onChange={v => setOp('email', v)} label="Enviar email a todos los usuarios" />
          </Row>
          <Row icon={Bell} title="Aviso en la campana" desc="Aparece en Notificaciones durante 30 días">
            <Switch on={op.campana} onChange={v => setOp('campana', v)} label="Mostrar en la campana de notificaciones" />
          </Row>

          <h4 className="sgin-label">Avisar cuando</h4>
          <Row title="Se publica un documento nuevo">
            <Switch small on={op.nuevos} onChange={v => setOp('nuevos', v)} label="Avisar documentos nuevos" />
          </Row>
          <Row title="Se aprueba una nueva revisión" desc="De un documento que ya existía">
            <Switch small on={op.revisiones} onChange={v => setOp('revisiones', v)} label="Avisar nuevas revisiones" />
          </Row>
          {sinEventos && <p className="sgin-warn">Con ambas opciones apagadas no se envía ningún email.</p>}

          <h4 className="sgin-label">Filtros</h4>
          <Row title="Excluir Confidenciales y Restringidos" desc="Solo se avisa de documentos “No Confidencial”">
            <Switch small on={op.excluir_confidenciales} onChange={v => setOp('excluir_confidenciales', v)} label="Excluir documentos confidenciales o restringidos" />
          </Row>

          <h4 className="sgin-label">Lectura obligatoria</h4>
          <Row
            icon={BookOpenCheck}
            title="Email siempre para lectura obligatoria"
            desc="Se envía a todos aunque el email general esté apagado y sin aplicar los filtros de arriba"
          >
            <Switch small on={op.email_obligatoria} onChange={v => setOp('email_obligatoria', v)} label="Enviar siempre email en documentos de lectura obligatoria" />
          </Row>

          <div className="form-group sgin-msg">
            <label htmlFor="sgin-mensaje">Mensaje adicional en el email (opcional)</label>
            <textarea
              id="sgin-mensaje"
              className="form-control"
              rows={3}
              maxLength={500}
              value={op.mensaje_extra}
              onChange={e => setOp('mensaje_extra', e.target.value)}
              placeholder="Ej: Recordá leer el documento antes de tu próximo turno."
            />
          </div>

          <div className="sgin-actions">
            <button type="button" className="btn-primary" onClick={handleSave} disabled={!dirty || saving}>
              <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="adm-pill-btn" onClick={handleTest} disabled={testState !== 'idle'} title="Envía el email de muestra solo a tu casilla">
              {testState === 'sent'
                ? <><CheckCircle size={14} strokeWidth={1.5} /> Enviado</>
                : <><Send size={14} strokeWidth={1.5} /> {testState === 'sending' ? 'Enviando…' : 'Enviarme una prueba'}</>}
            </button>
            {dirty && <span className="sgin-dirty">Cambios sin guardar</span>}
          </div>
        </div>

        {/* ── Vista previa ── */}
        <div className="sgin-preview">
          <div className="sgin-preview-bar">
            <div className="org-segmented" role="tablist" aria-label="Canal a previsualizar">
              <button type="button" role="tab" aria-selected={vista === 'email'} className={vista === 'email' ? 'active' : ''} onClick={() => setVista('email')}>
                <Mail size={14} strokeWidth={1.5} /> Email
              </button>
              <button type="button" role="tab" aria-selected={vista === 'campana'} className={vista === 'campana' ? 'active' : ''} onClick={() => setVista('campana')}>
                <Bell size={14} strokeWidth={1.5} /> Campana
              </button>
            </div>
            <div className="org-segmented" role="tablist" aria-label="Tipo de aviso">
              {[['nuevo', 'Nuevo'], ['revision', 'Revisión'], ['obligatoria', 'Obligatoria']].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tipo === k} className={tipo === k ? 'active' : ''} onClick={() => setTipo(k)}>{l}</button>
              ))}
            </div>
          </div>

          {vista === 'email' ? (
            <div className="sgin-mail">
              <div className="sgin-mail-head">
                <span><strong>De:</strong> Ribeiro 360 &lt;notificaciones@notificaciones.ribeiro.ar&gt;</span>
                <span><strong>Para:</strong> <Users size={12} strokeWidth={1.5} /> {preview?.recipients ?? '…'} usuarios</span>
                <span className="sgin-mail-subject">{preview?.subject ?? 'Generando vista previa…'}</span>
              </div>
              {previewError ? (
                <div className="sgin-mail-error">No se pudo generar la vista previa. Verificá que la Edge Function <code>send-nc-email</code> esté desplegada.</div>
              ) : preview?.html ? (
                <iframe title="Vista previa del email" className="sgin-mail-frame" srcDoc={preview.html} sandbox="" />
              ) : (
                <div className="sgin-mail-loading"><LoadingSpinner /></div>
              )}
              {(tipo === 'obligatoria' ? !op.email_obligatoria : !op.email) && <p className="sgin-note">El email está apagado: así se vería si lo activás.</p>}
            </div>
          ) : (
            <div className="sgin-bell">
              <ul className="notif-list">
                <li className="notif-item">
                  <div className="notif-main">
                    <span className="notif-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                      <FileText size={18} strokeWidth={1.5} />
                    </span>
                    <span className="notif-info">
                      <span className="notif-meta">
                        <span className="notif-tag notif-tag--documento">SGI</span>
                        <span className="notif-date">Ahora</span>
                      </span>
                      <span className="notif-title">{sample.titulo}</span>
                      <span className="notif-subtitle">v{sample.versionNumero}</span>
                    </span>
                    <span className="notif-dot" aria-label="No leída" />
                  </div>
                </li>
              </ul>
              {!op.campana && <p className="sgin-note">La campana está apagada: los documentos no aparecerán en Notificaciones.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SgiNotifConfig;
