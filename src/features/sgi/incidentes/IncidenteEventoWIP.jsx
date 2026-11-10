import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, FileText, Check, Loader2, AlertCircle } from 'lucide-react';
import { Select, SubmitButton, FieldError } from '../../../components/common';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import { hoyISO } from '../../../lib/fechas';
import { matchGerencia } from '../../../lib/gerencias';

const GERENCIAS = ['Servicios', 'Obras', 'CMASS', 'Administración, Finanzas y TI', 'RRHH', 'Institucional'];
import { useAuth } from '../../../contexts/AuthContext';
import { insertIncidenteConNumeroUnico, uploadIncAdjunto } from '../../../services/incidentesService';
import './IncidenteEvento.css';
import './IncidenteFormRedesign.css';

const MAX_ADJUNTOS = 5;
const ACCEPT = '.xlsx,.xls,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.mp3';

export default function IncidenteEventoWIP() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [form, setForm] = useState({
    nombre_reporta:     profile?.full_name ?? '',
    fecha:              hoyISO(),
    hora_evento:        '',
    gerencia:           matchGerencia(profile?.department, GERENCIAS),
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
    if (errors._global) setErrors({});
  };

  const v = useRequiredFields([
    { id: 'ev-nombre',      label: 'Nombre',               valid: !!form.nombre_reporta.trim() },
    { id: 'ev-fecha',       label: 'Fecha',                valid: !!form.fecha },
    { id: 'ev-hora',        label: 'Hora',                 valid: !!form.hora_evento.trim() },
    { id: 'ev-lugar',       label: 'Lugar',                valid: !!form.lugar.trim() },
    { id: 'ev-descripcion', label: 'Descripción',          valid: !!form.descripcion.trim() },
    { id: 'ev-acciones',    label: 'Acciones inmediatas',  valid: !!form.acciones_inmediatas.trim() },
  ]);
  const err = (id) => (v.isInvalid(id) ? 'Requerido' : null);

  const handleAdjuntos = (files) => {
    const remaining = MAX_ADJUNTOS - adjuntos.length;
    const toAdd = Array.from(files).slice(0, remaining).map(f => ({ file: f, name: f.name }));
    setAdjuntos(prev => [...prev, ...toAdd]);
  };

  const removeAdjunto = (idx) => setAdjuntos(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!v.isValid) { v.revealAll(); return; }

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
          <p className="ev-subtitle">Reporte inicial de evento — Ribeiro</p>
        </div>
      </div>

      <form className="ev-form" onSubmit={handleSubmit} noValidate>

        {/* 1. Nombre quien reporta */}
        <Field n={1} label="Apellido y nombre de quien carga el evento" required error={err('ev-nombre')} htmlFor="ev-nombre">
          <input
            id="ev-nombre"
            {...v.fieldProps('ev-nombre')}
            className={`ev-input${err('ev-nombre') ? ' ev-input--error' : ''}`}
            value={form.nombre_reporta}
            onChange={e => set('nombre_reporta', e.target.value)}
            placeholder="Escriba su respuesta"
          />
        </Field>

        {/* 2. Fecha */}
        <Field n={2} label="Fecha de ocurrencia del evento" required error={err('ev-fecha')} htmlFor="ev-fecha">
          <input
            type="date"
            id="ev-fecha"
            {...v.fieldProps('ev-fecha')}
            className={`ev-input${err('ev-fecha') ? ' ev-input--error' : ''}`}
            value={form.fecha}
            onChange={e => set('fecha', e.target.value)}
          />
        </Field>

        {/* 3. Hora */}
        <Field n={3} label="Hora aproximada de ocurrencia del evento" required error={err('ev-hora')} htmlFor="ev-hora">
          <input
            type="time"
            id="ev-hora"
            {...v.fieldProps('ev-hora')}
            className={`ev-input ev-input-time${err('ev-hora') ? ' ev-input--error' : ''}`}
            value={form.hora_evento}
            onChange={e => set('hora_evento', e.target.value)}
          />
        </Field>

        {/* 4. Gerencia / Área */}
        <Field n={4} label="Gerencia / Área involucrada">
          <Select
            value={form.gerencia}
            onChange={v => set('gerencia', v)}
            options={['Servicios', 'Obras', 'CMASS', 'Administración, Finanzas y TI', 'RRHH', 'Institucional']}
            placeholder="Seleccioná una opción"
            aria-label="Gerencia"
          />
        </Field>

        {/* 5. Lugar */}
        <Field n={5} label="Lugar de ocurrencia del evento" required error={err('ev-lugar')} htmlFor="ev-lugar">
          <input
            id="ev-lugar"
            {...v.fieldProps('ev-lugar')}
            className={`ev-input${err('ev-lugar') ? ' ev-input--error' : ''}`}
            value={form.lugar}
            onChange={e => set('lugar', e.target.value)}
            placeholder="Escriba su respuesta"
          />
        </Field>

        {/* 6. Afectado */}
        <Field n={6} label="Apellido y Nombre del personal afectado (si corresponde)">
          <input
            className="ev-input"
            value={form.afectado}
            onChange={e => set('afectado', e.target.value)}
            placeholder="Escriba su respuesta"
          />
        </Field>

        {/* 7. Descripción */}
        <Field n={7} label="Descripción del evento" required error={err('ev-descripcion')} htmlFor="ev-descripcion">
          <textarea
            id="ev-descripcion"
            {...v.fieldProps('ev-descripcion')}
            className={`ev-input ev-textarea${err('ev-descripcion') ? ' ev-input--error' : ''}`}
            value={form.descripcion}
            onChange={e => set('descripcion', e.target.value)}
            placeholder="Escriba su respuesta"
            rows={4}
          />
        </Field>

        {/* 8. Acciones inmediatas */}
        <Field n={8} label="Acciones inmediatas realizadas" required error={err('ev-acciones')} htmlFor="ev-acciones">
          <textarea
            id="ev-acciones"
            {...v.fieldProps('ev-acciones')}
            className={`ev-input ev-textarea${err('ev-acciones') ? ' ev-input--error' : ''}`}
            value={form.acciones_inmediatas}
            onChange={e => set('acciones_inmediatas', e.target.value)}
            placeholder="Escriba su respuesta"
            rows={4}
          />
        </Field>

        {/* 9. Adjuntos */}
        <Field n={9} label="Carga de fotos y archivos adjuntos relacionados con el evento">
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
          <SubmitButton
            type="submit"
            className="ev-btn-primary"
            missing={v.missing}
            onMissing={v.revealAll}
            saving={saving}
            savingLabel={<><Loader2 size={15} className="ev-spin" /> Guardando…</>}
          >
            Enviar reporte
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

function Field({ n, label, required, error, htmlFor, children }) {
  return (
    <div className={`ev-field${error ? ' ev-field--error' : ''}`}>
      <label className="ev-label" htmlFor={htmlFor}>
        <span className="ev-label-num">{n}.</span>
        {label}
        {required && <span className="ev-required"> *</span>}
      </label>
      {children}
      <FieldError show={!!error}>{error}</FieldError>
    </div>
  );
}
