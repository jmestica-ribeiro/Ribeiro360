import { supabase } from './supabase';

/**
 * Inserta notificaciones NC para usuarios recién asignados a un rol.
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
