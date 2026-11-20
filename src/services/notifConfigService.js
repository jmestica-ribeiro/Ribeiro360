import { supabase } from '../lib/supabase';

export const NOTIF_SGI_PUBLICADO = 'sgi_documento_publicado';

/** Valores por defecto si la fila todavía no existe en notif_config. */
export const SGI_PUBLICADO_DEFAULTS = {
  enabled: true,
  opciones: {
    email: false,
    campana: true,
    nuevos: true,
    revisiones: true,
    excluir_confidenciales: true,
    email_obligatoria: true,
    mensaje_extra: '',
  },
};

export const SGI_CIRCUITO = 'sgi_circuito_aprobacion';

/** Valores por defecto del circuito de aprobación SGI (deben coincidir con _shared/sgiCircuito.ts). */
export const SGI_CIRCUITO_DEFAULTS = {
  enabled: true,
  opciones: {
    revisor_departamento: 'CMASS',
    revisores_ids: [],
    alertas: {
      revision_pendiente: true,
      pendiente_aprobacion: true,
      aprobado_autor: true,
      aprobado_revisor: true,
      rechazado_autor: true,
      rechazado_revisor: true,
    },
    recordatorio_dias: 3,
  },
};

/** Normaliza la fila de notif_config del circuito, completando con los defaults. */
export function normalizarCircuito(row) {
  const op = row?.opciones || {};
  const d = SGI_CIRCUITO_DEFAULTS.opciones;
  return {
    enabled: row?.enabled ?? SGI_CIRCUITO_DEFAULTS.enabled,
    opciones: {
      revisor_departamento: op.revisor_departamento ?? d.revisor_departamento,
      revisores_ids: Array.isArray(op.revisores_ids) ? op.revisores_ids : [],
      alertas: { ...d.alertas, ...(op.alertas || {}) },
      recordatorio_dias: Number(op.recordatorio_dias ?? d.recordatorio_dias) || 0,
    },
  };
}

// Cache en memoria: la config del circuito se consulta en varias pantallas de SGI.
let _circuitoPromise = null;
export function fetchSgiCircuitoConfig({ force = false } = {}) {
  if (force || !_circuitoPromise) {
    _circuitoPromise = fetchNotifConfig(SGI_CIRCUITO).then(({ data, error }) => {
      if (error) _circuitoPromise = null; // reintentar la próxima vez
      return { data: normalizarCircuito(data), error };
    });
  }
  return _circuitoPromise;
}

export async function fetchNotifConfig(key) {
  const { data, error } = await supabase
    .from('notif_config')
    .select('key, enabled, opciones, updated_at')
    .eq('key', key)
    .maybeSingle();
  if (error) console.error('[notifConfigService] fetchNotifConfig:', error.message);
  return { data, error };
}

export async function saveNotifConfig(key, { enabled, opciones }, userId) {
  const { data, error } = await supabase
    .from('notif_config')
    .upsert([{ key, enabled, opciones, updated_at: new Date().toISOString(), updated_by: userId ?? null }], { onConflict: 'key' })
    .select()
    .single();
  if (error) console.error('[notifConfigService] saveNotifConfig:', error.message);
  if (!error && key === SGI_CIRCUITO) _circuitoPromise = null;
  return { data, error };
}

/**
 * Vista previa / prueba de los emails del circuito de aprobación (solo admins).
 * @param {'preview'|'test'} mode
 * @param {{ evento, rol, titulo, codigo, versionNumero, documentoId, dias, area }} sample
 */
export async function emailCircuitoSgi(mode, sample) {
  const { data, error } = await supabase.functions.invoke('send-nc-email', {
    body: { notifType: 'sgi_circuito', mode, ...sample },
  });
  if (error) console.error(`[notifConfigService] emailCircuitoSgi (${mode}):`, error.message);
  return { data, error };
}

/**
 * Vista previa del email "documento SGI publicado" generada por la Edge Function
 * (mismo template que el envío real). Solo admins.
 * @returns {{ data: { subject, html, recipients } | null, error }}
 */
export async function previewEmailSgiPublicado(sample) {
  const { data, error } = await supabase.functions.invoke('send-nc-email', {
    body: { notifType: 'sgi_publicado', mode: 'preview', ...sample },
  });
  if (error) console.error('[notifConfigService] previewEmailSgiPublicado:', error.message);
  return { data, error };
}

/** Envía el email de muestra solo al admin logueado. */
export async function sendTestEmailSgiPublicado(sample) {
  const { data, error } = await supabase.functions.invoke('send-nc-email', {
    body: { notifType: 'sgi_publicado', mode: 'test', ...sample },
  });
  if (error) console.error('[notifConfigService] sendTestEmailSgiPublicado:', error.message);
  return { data, error };
}
