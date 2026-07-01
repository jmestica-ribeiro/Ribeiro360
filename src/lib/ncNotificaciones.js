import { supabase } from './supabase';

/**
 * Inserta notificaciones NC para usuarios recién asignados a un rol
 * y despacha un email via la Edge Function send-nc-email.
 *
 * @param {object} opts
 * @param {string}   opts.hallazgoId
 * @param {string}   opts.hallazgoNumero  - e.g. "NC-2026-001"
 * @param {string}   opts.tipo            - ver TIPOS_NC abajo
 * @param {string[]} opts.newIds          - IDs de usuarios ahora asignados
 * @param {string[]} opts.prevIds         - IDs de usuarios que ya estaban asignados
 */
export async function notificarAsignacion({ hallazgoId, hallazgoNumero, tipo, newIds, prevIds = [] }) {
  const added = newIds.filter(id => !prevIds.includes(id));
  if (added.length === 0) return;

  const rows = added.map(user_id => ({
    user_id,
    hallazgo_id: hallazgoId,
    tipo,
    hallazgo_numero: hallazgoNumero,
    leida: false,
  }));

  const { error } = await supabase.from('nc_notificaciones').insert(rows);
  if (error) console.error('[nc_notif] insert error:', error.message);

  // Email — fire-and-forget: no bloquea ni propaga errores al flujo principal
  console.log('[nc_notif] invocando send-nc-email para', added.length, 'usuarios');
  supabase.functions
    .invoke('send-nc-email', {
      body: { userIds: added, hallazgoNumero, tipo, hallazgoId },
    })
    .then(({ data, error: fnErr }) => {
      if (fnErr) console.warn('[nc_notif] email error:', fnErr.message);
      else console.log('[nc_notif] email result:', data);
    })
    .catch(err => console.warn('[nc_notif] email invoke failed:', err?.message));
}

/**
 * Notifica a todos los asignados a un hallazgo cuando cambia de paso o se cierra.
 * @param {'avance'|'cerrado'} evento
 * @param {string[]} userIds - todos los IDs de personas asignadas al hallazgo
 */
export function notificarCambioEstadoHallazgo({ hallazgoId, hallazgoNumero, evento, nuevoPaso, userIds }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  supabase.functions
    .invoke('send-nc-email', {
      body: { notifType: 'nc_estado', userIds: ids, hallazgoNumero, evento, nuevoPaso, hallazgoId },
    })
    .then(({ error: fnErr }) => {
      if (fnErr) console.warn('[nc_notif] estado email error:', fnErr.message);
    })
    .catch(err => console.warn('[nc_notif] estado invoke failed:', err?.message));
}

/**
 * Envía email al responsable de un documento SGI cuando cambia el estado de su versión.
 * @param {'pendiente_aprobacion'|'aprobado'|'rechazado'} evento
 */
export function notificarDocumentoSGI({ userId, documentoTitulo, versionNumero, evento, documentoId }) {
  if (!userId) return;
  supabase.functions
    .invoke('send-nc-email', {
      body: { notifType: 'sgi', userId, documentoTitulo, versionNumero, evento, documentoId },
    })
    .then(({ error: fnErr }) => {
      if (fnErr) console.warn('[nc_notif] sgi email error:', fnErr.message);
    })
    .catch(err => console.warn('[nc_notif] sgi invoke failed:', err?.message));
}

/**
 * Envía email al responsable de una acción correctiva en un incidente.
 */
export function notificarAccionIncidente({ userId, incidenteNumero, accionDescripcion, incidenteId }) {
  if (!userId) return;
  supabase.functions
    .invoke('send-nc-email', {
      body: { notifType: 'inc', userId, incidenteNumero, accionDescripcion, incidenteId },
    })
    .then(({ error: fnErr }) => {
      if (fnErr) console.warn('[nc_notif] inc email error:', fnErr.message);
    })
    .catch(err => console.warn('[nc_notif] inc invoke failed:', err?.message));
}

/**
 * Envía email a todos los usuarios que coinciden con las reglas de visibilidad
 * de un curso recién publicado.
 * @param {object[]} visRules - reglas de visibilidad [{ campo, valor }]
 * @param {object[]} destinatarios - destinatarios directos [{ user_id }]
 */
export function notificarNuevoCurso({ cursoTitulo, cursoId, visRules = [], destinatarios = [] }) {
  const destinatariosIds = destinatarios.map(d => d.user_id).filter(Boolean);
  supabase.functions
    .invoke('send-nc-email', {
      body: { notifType: 'curso', cursoTitulo, cursoId, visRules, destinatariosIds },
    })
    .then(({ error: fnErr }) => {
      if (fnErr) console.warn('[nc_notif] curso email error:', fnErr.message);
    })
    .catch(err => console.warn('[nc_notif] curso invoke failed:', err?.message));
}

/**
 * Envía email a todos los usuarios que coinciden con las reglas de visibilidad
 * de un evento recién publicado.
 * @param {object[]} visRules - reglas de visibilidad [{ campo, valor }]
 */
export function notificarNuevoEvento({ eventoTitulo, eventoId, eventoFecha, visRules = [] }) {
  supabase.functions
    .invoke('send-nc-email', {
      body: { notifType: 'evento', eventoTitulo, eventoId, eventoFecha, visRules },
    })
    .then(({ error: fnErr }) => {
      if (fnErr) console.warn('[nc_notif] evento email error:', fnErr.message);
    })
    .catch(err => console.warn('[nc_notif] evento invoke failed:', err?.message));
}

export const TIPOS_NC = {
  emisor:               { label: 'Emisor del Hallazgo',             subtitulo: (n) => `Fuiste asignado como emisor en ${n}` },
  auditor:              { label: 'Auditor',                         subtitulo: (n) => `Fuiste asignado como auditor en ${n}` },
  responsable_proceso:  { label: 'Responsable del Proceso',         subtitulo: (n) => `Fuiste asignado como responsable del proceso en ${n}` },
  responsable_analisis: { label: 'Responsable de Análisis',         subtitulo: (n) => `Fuiste asignado como responsable del análisis en ${n}` },
  participante_analisis:{ label: 'Participante del Análisis',       subtitulo: (n) => `Fuiste incluido en el equipo de análisis de ${n}` },
  responsable_verif:    { label: 'Verificación de Eficacia',        subtitulo: (n) => `Fuiste asignado para verificar la eficacia de ${n}` },
  responsable_accion:   { label: 'Responsable de Acción Correctiva',subtitulo: (n) => `Se te asignó una acción correctiva en ${n}` },
};
