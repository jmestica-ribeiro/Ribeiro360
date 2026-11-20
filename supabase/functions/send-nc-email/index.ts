import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getAdminClient, requireAdminRole } from '../_shared/auth.ts';
import { APP_URL, emailLayout, escapeHtml } from '../_shared/emailLayout.ts';
import {
  loadCircuitoConfig, resolveRevisores, resolveAprobadores, getPersona,
  circuitoSubject, buildCircuitoHtml,
  type EventoCircuito, type Rol, type DocEmail, type Persona,
} from '../_shared/sgiCircuito.ts';

// ── Tipos NC ──────────────────────────────────────────────────────────────────

const TIPOS_NC: Record<string, { label: string; subtitulo: (n: string) => string }> = {
  emisor:                { label: 'Emisor del Hallazgo',              subtitulo: (n) => `Se te asignó como emisor/a en ${n}` },
  auditor:               { label: 'Auditor/a',                        subtitulo: (n) => `Se te asignó como auditor/a en ${n}` },
  responsable_proceso:   { label: 'Responsable del Proceso',          subtitulo: (n) => `Se te asignó como responsable del proceso en ${n}` },
  responsable_analisis:  { label: 'Responsable de Análisis',          subtitulo: (n) => `Se te asignó como responsable del análisis en ${n}` },
  participante_analisis: { label: 'Participante del Análisis',        subtitulo: (n) => `Se te incluyó en el equipo de análisis de ${n}` },
  responsable_verif:     { label: 'Verificación de Eficacia',         subtitulo: (n) => `Se te asignó para verificar la eficacia de ${n}` },
  responsable_accion:    { label: 'Responsable de Acción Correctiva', subtitulo: (n) => `Se te asignó una acción correctiva en ${n}` },
};

// ── Builders por tipo ─────────────────────────────────────────────────────────

function buildNcHtml(fullName: string, hallazgoNumero: string, tipo: string, hallazgoId: string): string {
  const config = TIPOS_NC[tipo];
  return emailLayout({
    primerNombre: fullName?.split(' ')[0] ?? 'Hola',
    subtitulo: 'SGI Hallazgos',
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


type SgiPublicado = { documentoId: string; titulo: string; codigo?: string | null; versionNumero?: string | null; esNuevo: boolean; mensajeExtra?: string | null };

function sgiPublicadoSubject(d: SgiPublicado): string {
  return d.esNuevo
    ? `Nuevo documento SGI: ${d.titulo} · Ribeiro 360`
    : `Documento SGI actualizado: ${d.titulo} · Ribeiro 360`;
}

function buildSgiPublicadoHtml(fullName: string, d: SgiPublicado): string {
  const titulo = escapeHtml(d.titulo);
  const extra = d.mensajeExtra?.trim()
    ? `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;white-space:pre-line;">${escapeHtml(d.mensajeExtra.trim())}</p>`
    : '';
  return emailLayout({
    primerNombre: escapeHtml(fullName?.split(' ')[0] || 'Hola'),
    subtitulo: 'SGI · Documentos',
    mensaje: d.esNuevo
      ? `Se publicó un nuevo documento: "${titulo}"`
      : `Hay una nueva revisión vigente de "${titulo}"`,
    extraHtml: extra,
    badgeLabel: 'Documento',
    badgeValue: d.codigo ? `${escapeHtml(d.codigo)} · ${titulo}` : titulo,
    badgeLabel2: 'Revisión',
    badgeValue2: d.versionNumero ? `Rev. ${escapeHtml(d.versionNumero)}` : '—',
    link: `${APP_URL}/sgi/documento/${encodeURIComponent(d.documentoId)}`,
    linkLabel: 'Ver documento →',
    footer: 'Este email fue generado automáticamente por Ribeiro 360 al publicarse un documento del SGI.',
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

function buildPublicacionHtml(fullName: string, titulo: string, tipo: string): string {
  const esAnuncio = tipo === 'anuncio';
  const nombre = fullName?.split(' ')[0] ?? 'Hola';
  const emoji = esAnuncio ? '📢' : '📸';
  const tipoLabel = esAnuncio ? 'un nuevo anuncio' : 'una nueva foto';
  const accion = esAnuncio ? 'publicó un anuncio' : 'subió una foto';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Novedades en Ribeiro 360</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:20px;text-align:center;">
              <img src="https://i.ibb.co/k2twLzyj/logo3.png" alt="Ribeiro" height="32" style="display:inline-block;height:32px;width:auto;" />
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

              <!-- Banner con emoji grande -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:36px 32px 28px;text-align:center;">
                    <div style="font-size:48px;line-height:1;margin-bottom:16px;">${emoji}</div>
                    <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#f5c518;">Ribeiro Social</p>
                  </td>
                </tr>
              </table>

              <!-- Cuerpo -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 32px 28px;">
                    <p style="margin:0 0 6px;font-size:14px;color:#9ca3af;">Hola, <strong style="color:#374151;">${nombre}</strong> 👋</p>
                    <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#111827;line-height:1.25;">
                      ¡Hay ${tipoLabel} en el feed!
                    </h2>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Alguien ${accion} en la intranet:
                    </p>

                    <!-- Cita del título -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:#fafafa;border-left:4px solid #f5c518;border-radius:0 8px 8px 0;padding:14px 18px;">
                          <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">"${titulo}"</p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:10px;overflow:hidden;">
                          <a href="${APP_URL}/social"
                             style="display:inline-block;background:#f5c518;color:#1a1a1a;text-decoration:none;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                            Ver en Social &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 8px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Recibís esto porque sos parte del equipo Ribeiro 🙌
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
  if (!rules || rules.length === 0) return false;
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
    avance:          `El hallazgo ${hallazgoNumero} avanzó a ${pasoLabel}`,
    cerrado:         `El hallazgo ${hallazgoNumero} fue cerrado`,
    verif_aprobada:  `La verificación de eficacia de ${hallazgoNumero} fue aprobada`,
    verif_rechazada: `La verificación de ${hallazgoNumero} no fue eficaz — se creó una acción rectificativa`,
  };
  const BADGES: Record<string, string> = {
    avance:          pasoLabel || 'En proceso',
    cerrado:         'Cerrado ✓',
    verif_aprobada:  'Verificación aprobada ✓',
    verif_rechazada: 'Requiere acción rectificativa',
  };
  return emailLayout({
    primerNombre: fullName?.split(' ')[0] ?? 'Hola',
    subtitulo: 'SGI Hallazgos',
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
    body: JSON.stringify({ from: 'Ribeiro 360 <notificaciones@notificaciones.ribeiro.ar>', to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

// ── Helper: envío masivo por lotes (Resend batch, máx. 100 por request) ─────
// Evita el rate limit de Resend (~2 req/s), que hace fallar un Promise.all con cientos de emails.

async function sendBatch(resendKey: string, emails: { to: string; subject: string; html: string }[]): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map(e => ({ from: 'Ribeiro 360 <notificaciones@notificaciones.ribeiro.ar>', to: [e.to], subject: e.subject, html: e.html }))),
    });
    if (res.ok) sent += chunk.length;
    else { failed += chunk.length; console.error('[send-nc-email] batch error', res.status, await res.text()); }
    if (i + 100 < emails.length) await new Promise(r => setTimeout(r, 600));
  }
  return { sent, failed };
}

// ── Serve ─────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const authUser = await getAuthenticatedUser(req);
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
    const json = (obj: unknown, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // ── SGI circuito de aprobación ────────────────────────────────────────
    // mode 'send'    → { versionId, evento }. Destinatarios y datos se resuelven en el servidor,
    //                  según la config de Admin › SGI. El evento debe coincidir con el estado real.
    // mode 'preview' → (admin) { evento, rol, ...muestra } → asunto + HTML, sin enviar.
    // mode 'test'    → (admin) envía la muestra solo al admin que lo pide.
    if (notifType === 'sgi_circuito') {
      const mode: string = body.mode ?? 'send';
      const cfg = await loadCircuitoConfig(adminClient);

      if (mode === 'preview' || mode === 'test') {
        await requireAdminRole(adminClient, authUser.id);
        const evento = body.evento as EventoCircuito;
        const rol = (body.rol ?? 'revisor') as Rol;
        const sample: DocEmail = {
          documentoId: body.documentoId ?? 'preview',
          titulo: String(body.titulo || 'Procedimiento de ejemplo'),
          codigo: body.codigo ?? null,
          versionNumero: body.versionNumero ?? null,
          comentario: body.comentario ?? 'Falta actualizar el punto 4 según la norma vigente.',
          dias: Number(body.dias ?? cfg.recordatorio_dias) || 3,
          area: body.area ?? cfg.revisor_departamento,
        };
        const { data: me } = await adminClient.from('profiles').select('full_name, email').eq('id', authUser.id).single();
        const subject = circuitoSubject(evento, rol, sample);
        const html = buildCircuitoHtml(me?.full_name ?? 'Nombre', evento, rol, sample);
        if (mode === 'preview') return json({ ok: true, subject, html });
        const to = me?.email ?? authUser.email;
        if (!to) return json({ error: 'Tu usuario no tiene email' }, 400);
        await sendEmail(resendKey, to, `[PRUEBA] ${subject}`, html);
        return json({ ok: true, sent: 1, to });
      }

      const { versionId, evento } = body as { versionId?: string; evento?: EventoCircuito };
      const ESTADO_ESPERADO: Record<string, string> = {
        revision_pendiente: 'en_revision',
        pendiente_aprobacion: 'pendiente_aprobacion',
        aprobado: 'aprobado',
        rechazado: 'rechazado',
      };
      if (!versionId || !evento || !ESTADO_ESPERADO[evento]) return json({ error: 'Faltan parámetros SGI_CIRCUITO' }, 400);
      if (!cfg.enabled) return json({ ok: true, sent: 0, skipped: 'deshabilitado' });

      const { data: ver, error: vErr } = await adminClient
        .from('sgi_versiones')
        .select('id, numero_version, estado_aprobacion, revisor_id, comentario_revision, documento:sgi_documentos(id, titulo, codigo, activo, created_by, aprobador_id)')
        .eq('id', versionId)
        .single();
      if (vErr || !ver) return json({ error: 'Versión no encontrada' }, 404);
      const doc = ver.documento as unknown as { id: string; titulo: string; codigo: string | null; activo: boolean; created_by: string | null; aprobador_id: string | null } | null;
      if (!doc || doc.activo === false) return json({ ok: true, sent: 0, skipped: 'inactivo' });
      if (ver.estado_aprobacion !== ESTADO_ESPERADO[evento]) return json({ ok: true, sent: 0, skipped: 'estado_no_coincide' });

      const a = cfg.alertas;
      const destinatarios: { persona: Persona; rol: Rol }[] = [];
      const push = (personas: (Persona | null)[], rol: Rol) =>
        personas.forEach(p => { if (p && !destinatarios.some(d => d.persona.id === p.id)) destinatarios.push({ persona: p, rol }); });

      if (evento === 'revision_pendiente' && a.revision_pendiente) push(await resolveRevisores(adminClient, cfg), 'revisor');
      if (evento === 'pendiente_aprobacion' && a.pendiente_aprobacion) push(await resolveAprobadores(adminClient, doc), 'aprobador');
      if (evento === 'aprobado' || evento === 'rechazado') {
        // El autor primero: si además fue el revisor, recibe el mensaje dirigido al autor.
        if (evento === 'aprobado' ? a.aprobado_autor : a.rechazado_autor) push([await getPersona(adminClient, doc.created_by)], 'autor');
        if (evento === 'aprobado' ? a.aprobado_revisor : a.rechazado_revisor) push([await getPersona(adminClient, ver.revisor_id)], 'revisor');
      }

      // Quien hizo la acción no se notifica a sí mismo.
      const finales = destinatarios.filter(d => d.persona.id !== authUser.id);
      if (finales.length === 0) return json({ ok: true, sent: 0, skipped: 'sin_destinatarios' });

      const datos: DocEmail = {
        documentoId: doc.id, titulo: doc.titulo, codigo: doc.codigo, versionNumero: ver.numero_version,
        comentario: ver.comentario_revision, area: cfg.revisor_departamento,
      };
      const result = await sendBatch(resendKey, finales.map(({ persona, rol }) => ({
        to: persona.email,
        subject: circuitoSubject(evento, rol, datos),
        html: buildCircuitoHtml(persona.full_name, evento, rol, datos),
      })));
      return json({ ok: true, ...result });
    }

    // ── SGI documento publicado: todos los usuarios ───────────────────────
    // mode 'send'    → envío real. Los datos se leen de la DB (no se confía en el cliente),
    //                  se respeta notif_config y se marca la versión para no reenviar.
    // mode 'preview' → (admin) devuelve asunto + HTML + cantidad de destinatarios, sin enviar.
    // mode 'test'    → (admin) envía el email de muestra solo al admin que lo pide.
    if (notifType === 'sgi_publicado') {
      const mode: string = body.mode ?? 'send';

      if (mode === 'preview' || mode === 'test') {
        await requireAdminRole(adminClient, authUser.id);
        const sample: SgiPublicado = {
          documentoId: body.documentoId ?? 'preview',
          titulo: String(body.titulo || 'Procedimiento de ejemplo'),
          codigo: body.codigo ?? null,
          versionNumero: body.versionNumero ?? null,
          esNuevo: body.esNuevo !== false,
          mensajeExtra: body.mensajeExtra ?? null,
        };
        const { data: me } = await adminClient.from('profiles').select('full_name, email').eq('id', authUser.id).single();
        if (mode === 'preview') {
          const { count } = await adminClient.from('profiles').select('id', { count: 'exact', head: true }).not('email', 'is', null);
          return json({ ok: true, subject: sgiPublicadoSubject(sample), html: buildSgiPublicadoHtml(me?.full_name ?? 'Nombre', sample), recipients: count ?? 0 });
        }
        const to = me?.email ?? authUser.email;
        if (!to) return json({ error: 'Tu usuario no tiene email' }, 400);
        await sendEmail(resendKey, to, `[PRUEBA] ${sgiPublicadoSubject(sample)}`, buildSgiPublicadoHtml(me?.full_name ?? '', sample));
        return json({ ok: true, sent: 1, to });
      }

      const { versionId } = body;
      if (!versionId) return json({ error: 'Falta versionId' }, 400);

      const { data: cfg } = await adminClient.from('notif_config').select('enabled, opciones').eq('key', 'sgi_documento_publicado').maybeSingle();
      const op = (cfg?.opciones ?? {}) as Record<string, unknown>;
      if (!cfg?.enabled || !op.email) return json({ ok: true, sent: 0, skipped: 'deshabilitado' });

      const { data: ver, error: vErr } = await adminClient
        .from('sgi_versiones')
        .select('id, documento_id, numero_version, vigente, estado_aprobacion, notificado_at, documento:sgi_documentos(id, titulo, codigo, acceso, activo)')
        .eq('id', versionId)
        .single();
      if (vErr || !ver) return json({ error: 'Versión no encontrada' }, 404);
      const doc = ver.documento as unknown as { id: string; titulo: string; codigo: string | null; acceso: string | null; activo: boolean } | null;

      if (!ver.vigente || !doc || doc.activo === false) return json({ ok: true, sent: 0, skipped: 'no_vigente' });
      if (['en_revision', 'pendiente_aprobacion', 'rechazado'].includes(ver.estado_aprobacion)) return json({ ok: true, sent: 0, skipped: 'no_aprobado' });
      if (ver.notificado_at) return json({ ok: true, sent: 0, skipped: 'ya_notificado' });
      if (op.excluir_confidenciales && doc.acceso && doc.acceso !== 'No Confidencial') return json({ ok: true, sent: 0, skipped: 'confidencial' });

      // ¿Primer publicación del documento o revisión de uno existente?
      const { count: previas } = await adminClient
        .from('sgi_versiones')
        .select('id', { count: 'exact', head: true })
        .eq('documento_id', ver.documento_id)
        .neq('id', ver.id)
        .or('estado_aprobacion.eq.aprobado,estado_aprobacion.is.null');
      const esNuevo = (previas ?? 0) === 0;
      if (esNuevo && op.nuevos === false) return json({ ok: true, sent: 0, skipped: 'nuevos_off' });
      if (!esNuevo && op.revisiones === false) return json({ ok: true, sent: 0, skipped: 'revisiones_off' });

      // Marca condicional antes de enviar: dos llamadas simultáneas no pueden enviar dos veces.
      const { data: claimed } = await adminClient
        .from('sgi_versiones')
        .update({ notificado_at: new Date().toISOString() })
        .eq('id', ver.id)
        .is('notificado_at', null)
        .select('id');
      if (!claimed?.length) return json({ ok: true, sent: 0, skipped: 'ya_notificado' });

      const { data: allProfiles, error: pErr } = await adminClient.from('profiles').select('full_name, email').not('email', 'is', null);
      if (pErr) throw pErr;

      const data: SgiPublicado = {
        documentoId: doc.id, titulo: doc.titulo, codigo: doc.codigo, versionNumero: ver.numero_version,
        esNuevo, mensajeExtra: (op.mensaje_extra as string) || null,
      };
      const subject = sgiPublicadoSubject(data);
      const result = await sendBatch(resendKey, (allProfiles ?? []).map((p: { full_name: string; email: string }) => ({
        to: p.email, subject, html: buildSgiPublicadoHtml(p.full_name, data),
      })));
      if (result.failed) console.error('[send-nc-email] sgi_publicado fallos:', result.failed);
      return json({ ok: true, ...result });
    }

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

    // ── Publicacion Social: todos los usuarios ─────────────────────────────
    if (notifType === 'publicacion') {
      const { titulo, tipo, id, testEmail } = body;
      if (!titulo) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros PUBLICACION' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let targets: { full_name: string; email: string }[];
      if (testEmail) {
        targets = [{ full_name: 'Juan', email: testEmail }];
      } else {
        const { data: allProfiles, error: pErr } = await adminClient.from('profiles').select('id, full_name, email').not('email', 'is', null);
        if (pErr) throw pErr;
        targets = allProfiles ?? [];
      }

      const subject = tipo === 'foto'
        ? `Nueva foto publicada: "${titulo}" · Ribeiro 360`
        : `Nuevo anuncio: "${titulo}" · Ribeiro 360`;

      const results = await Promise.allSettled(
        targets.map((p: { full_name: string; email: string }) =>
          sendEmail(resendKey, p.email, subject, buildPublicacionHtml(p.full_name, titulo, tipo ?? 'anuncio'))
        )
      );
      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason?.message);
      if (failed.length) console.error('[send-nc-email] publicacion fallos:', failed);
      return new Response(JSON.stringify({ ok: true, sent, failed: failed.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `notifType desconocido: ${notifType}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    if (message === 'FORBIDDEN') {
      return new Response(JSON.stringify({ error: 'Requiere rol admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.error('[send-nc-email]', message);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
