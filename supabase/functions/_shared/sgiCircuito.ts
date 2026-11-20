// Circuito de aprobación SGI: config, destinatarios y emails.
// Lo usan send-nc-email (avisos inmediatos) y send-nc-reminders (recordatorios diarios).
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { APP_URL, emailLayout, escapeHtml } from './emailLayout.ts';

export const CIRCUITO_KEY = 'sgi_circuito_aprobacion';

export type Alertas = {
  revision_pendiente: boolean;
  pendiente_aprobacion: boolean;
  aprobado_autor: boolean;
  aprobado_revisor: boolean;
  rechazado_autor: boolean;
  rechazado_revisor: boolean;
};

export type CircuitoConfig = {
  enabled: boolean;
  revisor_departamento: string;
  revisores_ids: string[];
  alertas: Alertas;
  recordatorio_dias: number;
};

const DEFAULTS: Omit<CircuitoConfig, 'enabled'> = {
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
};

export async function loadCircuitoConfig(admin: SupabaseClient): Promise<CircuitoConfig> {
  const { data } = await admin.from('notif_config').select('enabled, opciones').eq('key', CIRCUITO_KEY).maybeSingle();
  const op = (data?.opciones ?? {}) as Partial<CircuitoConfig>;
  return {
    enabled: data?.enabled ?? true,
    revisor_departamento: op.revisor_departamento ?? DEFAULTS.revisor_departamento,
    revisores_ids: Array.isArray(op.revisores_ids) ? op.revisores_ids : [],
    alertas: { ...DEFAULTS.alertas, ...(op.alertas ?? {}) },
    recordatorio_dias: Number(op.recordatorio_dias ?? DEFAULTS.recordatorio_dias) || 0,
  };
}

export type Persona = { id: string; full_name: string | null; email: string };

const ACTIVO = 'is_active.eq.true,is_active.is.null';

/** Personas del área revisora + revisores adicionales configurados. */
export async function resolveRevisores(admin: SupabaseClient, cfg: CircuitoConfig): Promise<Persona[]> {
  const out = new Map<string, Persona>();
  if (cfg.revisor_departamento) {
    const { data } = await admin.from('profiles').select('id, full_name, email')
      .ilike('department', cfg.revisor_departamento).or(ACTIVO).not('email', 'is', null);
    (data ?? []).forEach((p: Persona) => out.set(p.id, p));
  }
  if (cfg.revisores_ids.length) {
    const { data } = await admin.from('profiles').select('id, full_name, email')
      .in('id', cfg.revisores_ids).or(ACTIVO).not('email', 'is', null);
    (data ?? []).forEach((p: Persona) => out.set(p.id, p));
  }
  return [...out.values()];
}

/** Gerente aprobador elegido en el documento; si no hay, gerentes del área del autor. */
export async function resolveAprobadores(
  admin: SupabaseClient,
  doc: { aprobador_id: string | null; created_by: string | null },
): Promise<Persona[]> {
  if (doc.aprobador_id) {
    const { data } = await admin.from('profiles').select('id, full_name, email').eq('id', doc.aprobador_id).not('email', 'is', null);
    return data ?? [];
  }
  if (!doc.created_by) return [];
  const { data: autor } = await admin.from('profiles').select('department').eq('id', doc.created_by).maybeSingle();
  if (!autor?.department) return [];
  const { data } = await admin.from('profiles').select('id, full_name, email')
    .eq('department', autor.department).ilike('job_title', 'gerente%').or(ACTIVO).not('email', 'is', null);
  return data ?? [];
}

export async function getPersona(admin: SupabaseClient, id: string | null): Promise<Persona | null> {
  if (!id) return null;
  const { data } = await admin.from('profiles').select('id, full_name, email').eq('id', id).maybeSingle();
  return data?.email ? data : null;
}

// ── Emails ────────────────────────────────────────────────────────────────────

export type EventoCircuito =
  | 'revision_pendiente' | 'pendiente_aprobacion' | 'aprobado' | 'rechazado'
  | 'recordatorio_revision' | 'recordatorio_aprobacion';
export type Rol = 'revisor' | 'aprobador' | 'autor';

export type DocEmail = {
  documentoId: string;
  titulo: string;
  codigo?: string | null;
  versionNumero?: string | null;
  comentario?: string | null;
  dias?: number;
  area?: string;
};

export function circuitoSubject(evento: EventoCircuito, rol: Rol, d: DocEmail): string {
  const t = d.titulo;
  const S: Record<string, string> = {
    revision_pendiente:      `Documento para revisar: ${t}`,
    pendiente_aprobacion:    `Documento pendiente de tu aprobación: ${t}`,
    aprobado:                rol === 'autor' ? `Tu documento fue aprobado: ${t}` : `Documento aprobado: ${t}`,
    rechazado:               rol === 'autor' ? `Tu documento fue rechazado: ${t}` : `Documento rechazado: ${t}`,
    recordatorio_revision:   `Recordatorio: ${t} espera tu revisión`,
    recordatorio_aprobacion: `Recordatorio: ${t} espera tu aprobación`,
  };
  return `${S[evento] ?? `Actualización de documento: ${t}`} · Ribeiro 360`;
}

export function buildCircuitoHtml(fullName: string | null, evento: EventoCircuito, rol: Rol, d: DocEmail): string {
  const t = `"${escapeHtml(d.titulo)}"`;
  const rev = d.versionNumero ? ` (Rev. ${escapeHtml(d.versionNumero)})` : '';
  const area = escapeHtml(d.area || 'el área revisora');
  const dias = d.dias ?? 0;
  const diasTxt = `${dias} día${dias === 1 ? '' : 's'}`;

  const MENSAJE: Record<string, string> = {
    revision_pendiente:      `${t}${rev} tiene una versión nueva para revisar`,
    pendiente_aprobacion:    `${t}${rev} fue revisado por ${area} y espera tu aprobación`,
    aprobado:                rol === 'autor' ? `Tu documento ${t}${rev} fue aprobado y ya está vigente` : `La versión${rev} de ${t} fue aprobada y está vigente`,
    rechazado:               rol === 'autor' ? `Tu documento ${t}${rev} fue rechazado` : `La versión${rev} de ${t} fue rechazada`,
    recordatorio_revision:   `${t}${rev} lleva ${diasTxt} esperando tu revisión`,
    recordatorio_aprobacion: `${t}${rev} lleva ${diasTxt} esperando tu aprobación`,
  };
  const ESTADO: Record<string, string> = {
    revision_pendiente:      'Revisión pendiente',
    pendiente_aprobacion:    'Pendiente de aprobación',
    aprobado:                'Aprobado ✓',
    rechazado:               'Rechazado',
    recordatorio_revision:   `Revisión pendiente · ${diasTxt}`,
    recordatorio_aprobacion: `Aprobación pendiente · ${diasTxt}`,
  };

  const extra = evento === 'rechazado'
    ? `<p style="margin:0 0 20px;padding:12px 16px;border-radius:8px;background:#fef2f2;color:#991b1b;font-size:14px;line-height:1.5;"><strong>Motivo:</strong> ${d.comentario?.trim() ? escapeHtml(d.comentario.trim()) : 'sin comentario'}${rol === 'autor' ? '<br />Corregí el documento y volvé a guardarlo para enviarlo de nuevo a revisión.' : ''}</p>`
    : '';

  return emailLayout({
    primerNombre: escapeHtml(fullName?.split(' ')[0] || 'Hola'),
    subtitulo: 'SGI · Circuito de aprobación',
    mensaje: MENSAJE[evento] ?? `Actualización en ${t}`,
    extraHtml: extra,
    badgeLabel: 'Documento',
    badgeValue: d.codigo ? `${escapeHtml(d.codigo)} · ${escapeHtml(d.titulo)}` : escapeHtml(d.titulo),
    badgeLabel2: 'Estado',
    badgeValue2: ESTADO[evento] ?? evento,
    link: `${APP_URL}/sgi/documento/${encodeURIComponent(d.documentoId)}`,
    linkLabel: evento === 'aprobado' || evento === 'rechazado' ? 'Ver documento →' : 'Revisar documento →',
    footer: 'Este email fue generado automáticamente por el circuito de aprobación SGI de Ribeiro 360.',
  });
}

export async function sendResendEmail(resendKey: string, to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Ribeiro 360 <notificaciones@notificaciones.ribeiro.ar>', to: [to], subject, html }),
  });
  if (!res.ok) console.error('[sgiCircuito] resend error', res.status, await res.text());
  return res.ok;
}
