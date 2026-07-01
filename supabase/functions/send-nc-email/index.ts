import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getAdminClient } from '../_shared/auth.ts';

const APP_URL = 'https://intranet.ribeiro.ar';

// ── Tipos NC ──────────────────────────────────────────────────────────────────

const TIPOS_NC: Record<string, { label: string; subtitulo: (n: string) => string }> = {
  emisor:                { label: 'Emisor del Hallazgo',              subtitulo: (n) => `Fuiste asignado como emisor en ${n}` },
  auditor:               { label: 'Auditor',                          subtitulo: (n) => `Fuiste asignado como auditor en ${n}` },
  responsable_proceso:   { label: 'Responsable del Proceso',          subtitulo: (n) => `Fuiste asignado como responsable del proceso en ${n}` },
  responsable_analisis:  { label: 'Responsable de Análisis',          subtitulo: (n) => `Fuiste asignado como responsable del análisis en ${n}` },
  participante_analisis: { label: 'Participante del Análisis',        subtitulo: (n) => `Fuiste incluido en el equipo de análisis de ${n}` },
  responsable_verif:     { label: 'Verificación de Eficacia',         subtitulo: (n) => `Fuiste asignado para verificar la eficacia de ${n}` },
  responsable_accion:    { label: 'Responsable de Acción Correctiva', subtitulo: (n) => `Se te asignó una acción correctiva en ${n}` },
};

// ── Email layout compartido ───────────────────────────────────────────────────

function emailLayout(params: {
  primerNombre: string;
  subtitulo: string;
  mensaje: string;
  badgeLabel: string;
  badgeValue: string;
  badgeLabel2?: string;
  badgeValue2?: string;
  link: string;
  linkLabel: string;
  footer?: string;
}): string {
  const { primerNombre, subtitulo, mensaje, badgeLabel, badgeValue, badgeLabel2, badgeValue2, link, linkLabel, footer } = params;

  const badge2Html = badgeLabel2 ? `
                  <td style="padding:16px 20px;border-left:1px solid #e5e7eb;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">${badgeLabel2}</p>
                    <p style="margin:0;font-size:14px;color:#374151;">${badgeValue2}</p>
                  </td>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ribeiro 360</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1a1a1a;padding:24px 32px;">
              <span style="color:#f5c518;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Ribeiro 360</span>
              <span style="color:#999;font-size:13px;margin-left:10px;">${subtitulo}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Hola, <strong style="color:#111827;">${primerNombre}</strong></p>
              <h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${mensaje}</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">${badgeLabel}</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${badgeValue}</p>
                  </td>${badge2Html}
                </tr>
              </table>
              <a href="${link}" style="display:inline-block;background-color:#f5c518;color:#1a1a1a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;">
                ${linkLabel}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                ${footer ?? 'Este email fue generado automáticamente por Ribeiro 360.<br />Si creés que fue un error, contactá al área de Calidad.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Builders por tipo ─────────────────────────────────────────────────────────

function buildNcHtml(fullName: string, hallazgoNumero: string, tipo: string, hallazgoId: string): string {
  const config = TIPOS_NC[tipo];
  return emailLayout({
    primerNombre: fullName?.split(' ')[0] ?? 'Hola',
    subtitulo: 'SGI · No Conformidades',
    mensaje: config?.subtitulo(hallazgoNumero) ?? `Nueva asignación en ${hallazgoNumero}`,
    badgeLabel: 'Hallazgo',
    badgeValue: hallazgoNumero,
    badgeLabel2: 'Tu rol',
    badgeValue2: config?.label ?? 'Asignación',
    link: `${APP_URL}/sgi/nc/${hallazgoId}`,
    linkLabel: 'Ver hallazgo →',
  });
}

function buildSgiHtml(fullName: string, documentoTitulo: string, versionNumero: string, evento: string, documentoId: string): string {
  const EVENTOS: Record<string, string> = {
    pendiente_aprobacion: `El documento "${documentoTitulo}" tiene una versión pendiente de tu aprobación`,
    aprobado:             `La versión ${versionNumero} de "${documentoTitulo}" fue aprobada y está vigente`,
    rechazado:            `La versión ${versionNumero} de "${documentoTitulo}" fue rechazada`,
  };
  const EVENTO_BADGE: Record<string, string> = {
    pendiente_aprobacion: 'Pendiente de aprobación',
    aprobado:             'Aprobado ✓',
    rechazado:            'Rechazado',
  };
  return emailLayout({
    primerNombre: fullName?.split(' ')[0] ?? 'Hola',
    subtitulo: 'SGI · Documentos',
    mensaje: EVENTOS[evento] ?? `Actualización en "${documentoTitulo}"`,
    badgeLabel: 'Documento',
    badgeValue: documentoTitulo,
    badgeLabel2: 'Estado',
    badgeValue2: EVENTO_BADGE[evento] ?? evento,
    link: `${APP_URL}/sgi/documento/${documentoId}`,
    linkLabel: 'Ver documento →',
    footer: 'Este email fue generado automáticamente por Ribeiro 360.<br />Si creés que fue un error, contactá al área de SGI.',
  });
}

function buildIncHtml(fullName: string, incidenteNumero: string, accionDescripcion: string, incidenteId: string): string {
  return emailLayout({
    primerNombre: fullName?.split(' ')[0] ?? 'Hola',
    subtitulo: 'SGI · Incidentes',
    mensaje: `Se te asignó una acción correctiva en ${incidenteNumero}`,
    badgeLabel: 'Incidente',
    badgeValue: incidenteNumero,
    badgeLabel2: 'Acción',
    badgeValue2: accionDescripcion.length > 60 ? accionDescripcion.slice(0, 57) + '…' : accionDescripcion,
    link: `${APP_URL}/sgi/incidentes/${incidenteId}`,
    linkLabel: 'Ver incidente →',
    footer: 'Este email fue generado automáticamente por Ribeiro 360.<br />Si creés que fue un error, contactá al área de Seguridad.',
  });
}

function buildCursoHtml(fullName: string, cursoTitulo: string, cursoId: string): string {
  return emailLayout({
    primerNombre: fullName?.split(' ')[0] ?? 'Hola',
    subtitulo: 'Capacitaciones',
    mensaje: `Hay un nuevo curso disponible para vos: "${cursoTitulo}"`,
    badgeLabel: 'Curso',
    badgeValue: cursoTitulo,
    link: `${APP_URL}/cursos/${cursoId}`,
    linkLabel: 'Ver curso →',
    footer: 'Este email fue generado automáticamente por Ribeiro 360.',
  });
}

function buildEventoHtml(fullName: string, eventoTitulo: string, eventoFecha: string, eventoId: string): string {
  return emailLayout({
    primerNombre: fullName?.split(' ')[0] ?? 'Hola',
    subtitulo: 'Eventos',
    mensaje: `Hay un nuevo evento: "${eventoTitulo}"`,
    badgeLabel: 'Evento',
    badgeValue: eventoTitulo,
    badgeLabel2: 'Fecha',
    badgeValue2: eventoFecha,
    link: `${APP_URL}/eventos`,
    linkLabel: 'Ver eventos →',
    footer: 'Este email fue generado automáticamente por Ribeiro 360.',
  });
}

// ── Visibilidad server-side ───────────────────────────────────────────────────

function matchesVisibilidad(rules: { campo: string; valor: string }[], profile: Record<string, string>): boolean {
  if (!rules || rules.length === 0) return true;
  return rules.every(r => {
    const v = profile[r.campo];
    return v && v.toLowerCase() === r.valor.toLowerCase();
  });
}

const PASOS_NC: Record<number, string> = {
  1: 'Paso 1 — Registro del Hallazgo',
  2: 'Paso 2 — Análisis de Causa Raíz',
  3: 'Paso 3 — Acciones Correctivas',
  4: 'Paso 4 — Verificación de Eficacia',
  5: 'Paso 5 — Cierre',
};

function buildNcEstadoHtml(fullName: string, hallazgoNumero: string, evento: string, hallazgoId: string, nuevoPaso?: number): string {
  const pasoLabel = nuevoPaso ? (PASOS_NC[nuevoPaso] ?? `Paso ${nuevoPaso}`) : '';
  const MENSAJES: Record<string, string> = {
    avance:  `El hallazgo ${hallazgoNumero} avanzó a ${pasoLabel}`,
    cerrado: `El hallazgo ${hallazgoNumero} fue cerrado`,
  };
  const BADGES: Record<string, string> = {
    avance:  pasoLabel || 'En proceso',
    cerrado: 'Cerrado ✓',
  };
  return emailLayout({
    primerNombre: fullName?.split(' ')[0] ?? 'Hola',
    subtitulo: 'SGI · No Conformidades',
    mensaje: MENSAJES[evento] ?? `Actualización en ${hallazgoNumero}`,
    badgeLabel: 'Hallazgo',
    badgeValue: hallazgoNumero,
    badgeLabel2: 'Nuevo paso',
    badgeValue2: BADGES[evento] ?? evento,
    link: `${APP_URL}/sgi/nc/${hallazgoId}`,
    linkLabel: 'Ver hallazgo →',
  });
}

// ── Helper: enviar un email via Resend ────────────────────────────────────────

async function sendEmail(resendKey: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Ribeiro 360 <onboarding@resend.dev>', to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

// ── Serve ─────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    await getAuthenticatedUser(req);
    const adminClient = getAdminClient();

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('[send-nc-email] RESEND_API_KEY no configurada — emails omitidos');
      return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 'no_api_key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const notifType: string = body.notifType ?? 'nc';

    // ── NC: múltiples usuarios ─────────────────────────────────────────────
    if (notifType === 'nc') {
      const { userIds, hallazgoNumero, tipo, hallazgoId } = body;
      if (!Array.isArray(userIds) || userIds.length === 0 || !hallazgoNumero || !tipo || !hallazgoId) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros NC' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: profiles, error: pErr } = await adminClient.from('profiles').select('id, full_name, email').in('id', userIds).not('email', 'is', null);
      if (pErr) throw pErr;

      const results = await Promise.allSettled(
        (profiles ?? []).map((p: { id: string; full_name: string; email: string }) =>
          sendEmail(resendKey, p.email, `Nueva asignación en ${hallazgoNumero} · Ribeiro 360`, buildNcHtml(p.full_name, hallazgoNumero, tipo, hallazgoId))
        )
      );
      const sent   = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason?.message);
      if (failed.length) console.error('[send-nc-email] nc fallos:', failed);
      return new Response(JSON.stringify({ ok: true, sent, failed: failed.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── NC estado: múltiples usuarios ─────────────────────────────────────
    if (notifType === 'nc_estado') {
      const { userIds, hallazgoNumero, evento, hallazgoId, nuevoPaso } = body;
      if (!Array.isArray(userIds) || userIds.length === 0 || !hallazgoNumero || !evento || !hallazgoId) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros NC_ESTADO' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: profiles, error: pErr } = await adminClient.from('profiles').select('id, full_name, email').in('id', userIds).not('email', 'is', null);
      if (pErr) throw pErr;

      const pasoLabel = nuevoPaso ? (PASOS_NC[nuevoPaso] ?? `Paso ${nuevoPaso}`) : '';
      const SUBJECTS: Record<string, string> = {
        avance:  `Hallazgo ${hallazgoNumero} avanzó a ${pasoLabel} · Ribeiro 360`,
        cerrado: `Hallazgo ${hallazgoNumero} cerrado · Ribeiro 360`,
      };

      const results = await Promise.allSettled(
        (profiles ?? []).map((p: { id: string; full_name: string; email: string }) =>
          sendEmail(resendKey, p.email, SUBJECTS[evento] ?? `Actualización en ${hallazgoNumero} · Ribeiro 360`, buildNcEstadoHtml(p.full_name, hallazgoNumero, evento, hallazgoId, nuevoPaso))
        )
      );
      const sent   = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason?.message);
      if (failed.length) console.error('[send-nc-email] nc_estado fallos:', failed);
      return new Response(JSON.stringify({ ok: true, sent, failed: failed.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── SGI: un usuario ────────────────────────────────────────────────────
    if (notifType === 'sgi') {
      const { userId, documentoTitulo, versionNumero, evento, documentoId } = body;
      if (!userId || !documentoTitulo || !evento || !documentoId) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros SGI' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: profile, error: pErr } = await adminClient.from('profiles').select('full_name, email').eq('id', userId).single();
      if (pErr || !profile?.email) {
        console.warn('[send-nc-email] SGI: usuario sin email o no encontrado', userId);
        return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const SUBJECTS: Record<string, string> = {
        pendiente_aprobacion: `Documento pendiente de aprobación · Ribeiro 360`,
        aprobado:             `Documento aprobado · Ribeiro 360`,
        rechazado:            `Documento rechazado · Ribeiro 360`,
      };

      await sendEmail(resendKey, profile.email, SUBJECTS[evento] ?? `Actualización de documento · Ribeiro 360`, buildSgiHtml(profile.full_name, documentoTitulo, versionNumero ?? '', evento, documentoId));
      return new Response(JSON.stringify({ ok: true, sent: 1 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Incidentes: un usuario ─────────────────────────────────────────────
    if (notifType === 'inc') {
      const { userId, incidenteNumero, accionDescripcion, incidenteId } = body;
      if (!userId || !incidenteNumero || !incidenteId) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros INC' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: profile, error: pErr } = await adminClient.from('profiles').select('full_name, email').eq('id', userId).single();
      if (pErr || !profile?.email) {
        console.warn('[send-nc-email] INC: usuario sin email o no encontrado', userId);
        return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await sendEmail(resendKey, profile.email, `Nueva acción correctiva en ${incidenteNumero} · Ribeiro 360`, buildIncHtml(profile.full_name, incidenteNumero, accionDescripcion ?? '', incidenteId));
      return new Response(JSON.stringify({ ok: true, sent: 1 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Cursos: matching por visibilidad ──────────────────────────────────
    if (notifType === 'curso') {
      const { cursoTitulo, cursoId, visRules, destinatariosIds } = body;
      if (!cursoTitulo || !cursoId) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros CURSO' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: allProfiles, error: pErr } = await adminClient.from('profiles').select('id, full_name, email, job_title, department, office_location').not('email', 'is', null);
      if (pErr) throw pErr;

      const destSet = new Set<string>(destinatariosIds ?? []);
      const targets = (allProfiles ?? []).filter((p: Record<string, string>) =>
        destSet.has(p.id) || matchesVisibilidad(visRules ?? [], p)
      );

      const results = await Promise.allSettled(
        targets.map((p: Record<string, string>) =>
          sendEmail(resendKey, p.email, `Nuevo curso disponible: ${cursoTitulo} · Ribeiro 360`, buildCursoHtml(p.full_name, cursoTitulo, cursoId))
        )
      );
      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason?.message);
      if (failed.length) console.error('[send-nc-email] curso fallos:', failed);
      return new Response(JSON.stringify({ ok: true, sent, failed: failed.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Eventos: matching por visibilidad ─────────────────────────────────
    if (notifType === 'evento') {
      const { eventoTitulo, eventoId, eventoFecha, visRules } = body;
      if (!eventoTitulo || !eventoId) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros EVENTO' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: allProfiles, error: pErr } = await adminClient.from('profiles').select('id, full_name, email, job_title, department, office_location').not('email', 'is', null);
      if (pErr) throw pErr;

      const targets = (allProfiles ?? []).filter((p: Record<string, string>) =>
        matchesVisibilidad(visRules ?? [], p)
      );

      const results = await Promise.allSettled(
        targets.map((p: Record<string, string>) =>
          sendEmail(resendKey, p.email, `Nuevo evento: ${eventoTitulo} · Ribeiro 360`, buildEventoHtml(p.full_name, eventoTitulo, eventoFecha ?? '', eventoId))
        )
      );
      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason?.message);
      if (failed.length) console.error('[send-nc-email] evento fallos:', failed);
      return new Response(JSON.stringify({ ok: true, sent, failed: failed.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `notifType desconocido: ${notifType}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    if (message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.error('[send-nc-email]', message);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
