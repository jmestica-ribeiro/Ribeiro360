import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, FileText, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { insertIncidenteConNumeroUnico, uploadIncAdjunto } from '../../../services/incidentesService';
import './IncidenteEvento.css';

const TIPOS_EVENTO = [
  'Vehicular o activo',
  'Accidente Personal',
  'Ambiental',
  'Alto Potencial',
  'Otro',
];

const MAX_ADJUNTOS = 5;
const ACCEPT = '.xlsx,.xls,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.mp3';

export default function IncidenteEventoWIP() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [form, setForm] = useState({
    nombre_reporta:     profile?.full_name ?? '',
    fecha:              new Date().toISOString().split('T')[0],
    hora_evento:        '',
    tipo_incidente:     '',
    gerencia:           '',
    lugar:              '',
    afectado:           '',
    descripcion:        '',
    acciones_inmediatas:'',
  });
  const [adjuntos, setAdjuntos] = useState([]); // { file, name }
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre_reporta.trim()) e.nombre_reporta = 'Requerido';
    if (!form.fecha)                 e.fecha           = 'Requerido';
    if (!form.hora_evento.trim())    e.hora_evento     = 'Requerido';
    if (!form.tipo_incidente)        e.tipo_incidente  = 'Seleccioná un tipo';
    if (!form.lugar.trim())          e.lugar           = 'Requerido';
    if (!form.descripcion.trim())    e.descripcion     = 'Requerido';
    if (!form.acciones_inmediatas.trim()) e.acciones_inmediatas = 'Requerido';
    return e;
  };

  const handleAdjuntos = (files) => {
    const remaining = MAX_ADJUNTOS - adjuntos.length;
    const toAdd = Array.from(files).slice(0, remaining).map(f => ({ file: f, name: f.name }));
    setAdjuntos(prev => [...prev, ...toAdd]);
  };

  const removeAdjunto = (idx) => setAdjuntos(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const year = new Date().getFullYear();

      const { data: nuevo, error: insErr } = await insertIncidenteConNumeroUnico({
        year,
        buildNumero: (seq) => `EV-${year}-${String(seq).padStart(3, '0')}`,
        buildPayload: (numero) => ({
          tipo:                'Evento',
          numero,
          nombre_reporta:      form.nombre_reporta.trim(),
          fecha:               form.fecha,
          hora_evento:         form.hora_evento.trim(),
          tipo_incidente:      form.tipo_incidente,
          gerencia:            form.gerencia.trim() || null,
          lugar:               form.lugar.trim(),
          involucrados:        form.afectado.trim() ? [{ nombre: form.afectado.trim() }] : [],
          descripcion:         form.descripcion.trim(),
          acciones_inmediatas: form.acciones_inmediatas.trim(),
          emisor_id:           profile?.id ?? null,
          estado:              'registrado',
        }),
      });
      if (insErr) throw insErr;

      // Subir adjuntos
      if (adjuntos.length && nuevo?.id) {
        await Promise.allSettled(
          adjuntos.map(({ file, name }) => {
            const ext = name.split('.').pop();
            const path = `${nuevo.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            return uploadIncAdjunto(path, file);
          })
        );
      }

      setSaved(true);
      setTimeout(() => navigate('/sgi/incidentes'), 1800);
    } catch (err) {
      setErrors({ _global: err.message || 'Error al guardar el evento.' });
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="ev-success">
        <div className="ev-success-icon"><Check size={32} /></div>
        <h2>Evento registrado</h2>
        <p>Redirigiendo al listado…</p>
      </div>
    );
  }

  return (
    <div className="ev-page">
      {/* Header */}
      <div className="ev-header">
        <button className="ev-back" onClick={() => navigate('/sgi/incidentes/nuevo')}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div>
          <h1 className="ev-title">Registrar Evento</h1>
          <p className="ev-subtitle">Reporte inicial de incidente — Ribeiro</p>
        </div>
      </div>

      <form className="ev-form" onSubmit={handleSubmit} noValidate>

        {/* 1. Nombre quien reporta */}
        <Field n={1} label="Apellido y nombre de quien carga el incidente" required error={errors.nombre_reporta}>
          <input
            className={`ev-input${errors.nombre_reporta ? ' ev-input--error' : ''}`}
            value={form.nombre_reporta}
            onChange={e => set('nombre_reporta', e.target.value)}
            placeholder="Escriba su respuesta"
          />
        </Field>

        {/* 2. Fecha */}
        <Field n={2} label="Fecha de ocurrencia del incidente" required error={errors.fecha}>
          <input
            type="date"
            className={`ev-input${errors.fecha ? ' ev-input--error' : ''}`}
            value={form.fecha}
            onChange={e => set('fecha', e.target.value)}
          />
        </Field>

        {/* 3. Hora */}
        <Field n={3} label="Hora aproximada de ocurrencia del incidente" required error={errors.hora_evento}>
          <input
            className={`ev-input${errors.hora_evento ? ' ev-input--error' : ''}`}
            value={form.hora_evento}
            onChange={e => set('hora_evento', e.target.value)}
            placeholder="Ej: 14:30 hs"
          />
        </Field>

        {/* 4. Tipo */}
        <Field n={4} label="Tipo de Incidente" required error={errors.tipo_incidente}>
          <div className="ev-radios">
            {TIPOS_EVENTO.map(t => (
              <label key={t} className="ev-radio-label">
                <input
                  type="radio"
                  name="tipo_incidente"
                  value={t}
                  checked={form.tipo_incidente === t}
                  onChange={() => set('tipo_incidente', t)}
                />
                <span className="ev-radio-dot" />
                {t}
              </label>
            ))}
          </div>
        </Field>

        {/* 5. Gerencia / Área */}
        <Field n={5} label="Gerencia / Área involucrada">
          <input
            className="ev-input"
            value={form.gerencia}
            onChange={e => set('gerencia', e.target.value)}
            placeholder="Escriba su respuesta"
          />
        </Field>

        {/* 6. Lugar */}
        <Field n={6} label="Lugar de ocurrencia del incidente" required error={errors.lugar}>
          <input
            className={`ev-input${errors.lugar ? ' ev-input--error' : ''}`}
            value={form.lugar}
            onChange={e => set('lugar', e.target.value)}
            placeholder="Escriba su respuesta"
          />
        </Field>

        {/* 7. Afectado */}
        <Field n={7} label="Apellido y Nombre del personal afectado (si corresponde)">
          <input
            className="ev-input"
            value={form.afectado}
            onChange={e => set('afectado', e.target.value)}
            placeholder="Escriba su respuesta"
          />
        </Field>

        {/* 8. Descripción */}
        <Field n={8} label="Descripción del incidente" required error={errors.descripcion}>
          <textarea
            className={`ev-input ev-textarea${errors.descripcion ? ' ev-input--error' : ''}`}
            value={form.descripcion}
            onChange={e => set('descripcion', e.target.value)}
            placeholder="Escriba su respuesta"
            rows={4}
          />
        </Field>

        {/* 9. Acciones inmediatas */}
        <Field n={9} label="Acciones inmediatas realizadas" required error={errors.acciones_inmediatas}>
          <textarea
            className={`ev-input ev-textarea${errors.acciones_inmediatas ? ' ev-input--error' : ''}`}
            value={form.acciones_inmediatas}
            onChange={e => set('acciones_inmediatas', e.target.value)}
            placeholder="Escriba su respuesta"
            rows={4}
          />
        </Field>

        {/* 10. Adjuntos */}
        <Field n={10} label="Carga de fotos y archivos adjuntos relacionados con el incidente">
          <div
            className="ev-dropzone"
            onClick={() => adjuntos.length < MAX_ADJUNTOS && fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleAdjuntos(e.dataTransfer.files); }}
          >
            <Upload size={18} />
            <span>Cargar archivo</span>
            <span className="ev-dropzone-hint">
              Límite: {MAX_ADJUNTOS} archivos · Excel, PPT, PDF, Imagen, Video, Audio
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={e => handleAdjuntos(e.target.files)}
          />
          {adjuntos.length > 0 && (
            <ul className="ev-adjuntos-list">
              {adjuntos.map(({ name }, idx) => (
                <li key={idx} className="ev-adjunto-item">
                  <FileText size={14} />
                  <span>{name}</span>
                  <button type="button" onClick={() => removeAdjunto(idx)}><X size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        {/* Error global */}
        {errors._global && (
          <div className="ev-error-global">
            <AlertCircle size={16} /> {errors._global}
          </div>
        )}

        {/* Submit */}
        <div className="ev-actions">
          <button
            type="button"
            className="ev-btn-secondary"
            onClick={() => navigate('/sgi/incidentes/nuevo')}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="ev-btn-primary" disabled={saving}>
            {saving ? <><Loader2 size={15} className="ev-spin" /> Guardando…</> : 'Enviar reporte'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ n, label, required, error, children }) {
  return (
    <div className={`ev-field${error ? ' ev-field--error' : ''}`}>
      <label className="ev-label">
        <span className="ev-label-num">{n}.</span>
        {label}
        {required && <span className="ev-required"> *</span>}
      </label>
      {children}
      {error && <span className="ev-field-error"><AlertCircle size={12} /> {error}</span>}
    </div>
  );
}
