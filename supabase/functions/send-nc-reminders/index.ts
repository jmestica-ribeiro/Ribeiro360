import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAdminClient } from '../_shared/auth.ts';
import {
  loadCircuitoConfig, resolveRevisores, resolveAprobadores,
  circuitoSubject, buildCircuitoHtml, sendResendEmail, type Persona,
} from '../_shared/sgiCircuito.ts';

const APP_URL = 'https://intranet.ribeiro.ar';

// Imagen hosteada: los clientes de correo (Gmail, Outlook) bloquean los logos embebidos en base64.
const LOGO_URL = 'https://i.ibb.co/k2twLzyj/logo3.png';
const DIAS_AVISO = 3; // enviar aviso cuando quedan ≤ 3 días para el vencimiento

// ── HTML de recordatorio ───────────────────────────────────────────────────────

function buildReminderHtml(
  fullName: string,
  hallazgoNumero: string,
  accionDescripcion: string,
  fechaVencimiento: string,
  hallazgoId: string,
  diasRestantes: number,
): string {
  const urgencia = diasRestantes <= 0
    ? { color: '#dc2626', label: 'VENCIDA', texto: 'Esta acción está vencida.' }
    : diasRestantes === 1
    ? { color: '#ea580c', label: 'VENCE HOY', texto: 'Esta acción vence hoy.' }
    : { color: '#d97706', label: `${diasRestantes} días`, texto: `Esta acción vence en ${diasRestantes} días.` };

  const primerNombre = fullName?.split(' ')[0] ?? 'Hola';
  const desc = accionDescripcion.length > 80 ? accionDescripcion.slice(0, 77) + '…' : accionDescripcion;

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
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${LOGO_URL}" alt="Ribeiro" height="36" style="display:block;height:36px;width:auto;" />
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <span style="color:#999;font-size:12px;">SGI Hallazgos</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Hola, <strong style="color:#111827;">${primerNombre}</strong></p>
              <h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                Recordatorio: acción correctiva próxima a vencer
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Hallazgo</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${hallazgoNumero}</p>
                  </td>
                  <td style="padding:16px 20px;border-left:1px solid #e5e7eb;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Vencimiento</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:${urgencia.color};">${urgencia.label}</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border:1px solid #fde68a;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#92400e;">Acción</p>
                    <p style="margin:0;font-size:13px;color:#451a03;">${desc}</p>
                    <p style="margin:6px 0 0;font-size:12px;color:#78350f;">Fecha límite: ${fechaVencimiento}</p>
                  </td>
                </tr>
              </table>
              <a href="${APP_URL}/sgi/nc/${hallazgoId}" style="display:inline-block;background-color:#f5c518;color:#1a1a1a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;">
                Ver hallazgo →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                Este email fue generado automáticamente por Ribeiro 360.<br />
                Recibís este aviso porque sos el responsable de esta acción correctiva.
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

// ── Handler principal ──────────────────────────────────────────────────────────

serve(async () => {
  try {
    const admin = getAdminClient();
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY no configurado');

    // Independientes: si falla una, la otra se ejecuta igual.
    const [nc, sgi] = await Promise.allSettled([
      runNcReminders(admin, resendKey),
      runSgiReminders(admin, resendKey),
    ]);
    if (nc.status === 'rejected') console.error('[reminders] NC:', nc.reason);
    if (sgi.status === 'rejected') console.error('[reminders] SGI:', sgi.reason);

    return new Response(JSON.stringify({
      nc: nc.status === 'fulfilled' ? nc.value : { error: String(nc.reason) },
      sgi: sgi.status === 'fulfilled' ? sgi.value : { error: String(sgi.reason) },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[reminders] error fatal:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// ── SGI: versiones trabadas en revisión / aprobación ──────────────────────────
// Recuerda a quien tiene el pendiente cada `recordatorio_dias` días (config de Admin › SGI).
async function runSgiReminders(admin: ReturnType<typeof getAdminClient>, resendKey: string) {
  const cfg = await loadCircuitoConfig(admin);
  const dias = cfg.recordatorio_dias;
  if (!cfg.enabled || dias <= 0) return { enviados: 0, skipped: 'deshabilitado' };

  const { data: versiones, error } = await admin
    .from('sgi_versiones')
    .select('id, numero_version, estado_aprobacion, estado_desde, recordatorio_at, documento:sgi_documentos(id, titulo, codigo, activo, created_by, aprobador_id)')
    .in('estado_aprobacion', ['en_revision', 'pendiente_aprobacion']);
  if (error) throw error;

  const DIA = 86_400_000;
  const ahora = Date.now();
  let revisores: Persona[] | null = null; // se resuelven una sola vez
  let enviados = 0, errores = 0;

  for (const v of versiones ?? []) {
    const doc = v.documento as unknown as { id: string; titulo: string; codigo: string | null; activo: boolean; created_by: string | null; aprobador_id: string | null } | null;
    if (!doc || doc.activo === false || !v.estado_desde) continue;

    const desde = new Date(v.estado_desde).getTime();
    const ultimo = v.recordatorio_at ? new Date(v.recordatorio_at).getTime() : desde;
    if (ahora - ultimo < dias * DIA) continue;

    const enRevision = v.estado_aprobacion === 'en_revision';
    const evento = enRevision ? 'recordatorio_revision' : 'recordatorio_aprobacion';
    const rol = enRevision ? 'revisor' : 'aprobador';
    if (enRevision && !revisores) revisores = await resolveRevisores(admin, cfg);
    const personas = enRevision ? (revisores ?? []) : await resolveAprobadores(admin, doc);
    if (personas.length === 0) continue;

    const datos = {
      documentoId: doc.id, titulo: doc.titulo, codigo: doc.codigo, versionNumero: v.numero_version,
      dias: Math.floor((ahora - desde) / DIA), area: cfg.revisor_departamento,
    };
    let algunoOk = false;
    for (const p of personas) {
      const ok = await sendResendEmail(resendKey, p.email, circuitoSubject(evento, rol, datos), buildCircuitoHtml(p.full_name, evento, rol, datos));
      if (ok) { enviados++; algunoOk = true; } else errores++;
      await new Promise(r => setTimeout(r, 550)); // rate limit de Resend (~2 req/s)
    }
    // Marca aunque falle alguno, para no reintentar en bucle el mismo día.
    if (algunoOk) await admin.from('sgi_versiones').update({ recordatorio_at: new Date().toISOString() }).eq('id', v.id);
  }
  return { enviados, errores };
}

// ── NC: acciones vencidas o por vencer ────────────────────────────────────────
async function runNcReminders(admin: ReturnType<typeof getAdminClient>, resendKey: string) {
  {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Fecha límite: dentro de DIAS_AVISO días
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + DIAS_AVISO);
    const limiteStr = limite.toISOString().split('T')[0];

    // Acciones vencidas o por vencer que todavía no están completadas
    const { data: acciones, error } = await admin
      .from('nc_acciones')
      .select(`
        id,
        descripcion,
        fecha_vencimiento,
        responsable_id,
        hallazgo_id,
        nc_hallazgos ( numero )
      `)
      .lte('fecha_vencimiento', limiteStr)
      .not('estado', 'in', '("completada","cerrada")')
      .is('verif_eficaz', null)
      .not('responsable_id', 'is', null);

    if (error) throw error;
    if (!acciones || acciones.length === 0) {
      return { enviados: 0 };
    }

    // Filtrar acciones ya avisadas esta semana (dedup anti-reintento)
    const hoyStr = hoy.toISOString().split('T')[0];
    const accionIds = acciones.map(a => a.id);
    const { data: yaAvisadas } = await admin
      .from('nc_reminders_log')
      .select('accion_id')
      .in('accion_id', accionIds)
      .eq('enviado_en', hoyStr);

    const yaAvisadasSet = new Set((yaAvisadas ?? []).map((r: { accion_id: string }) => r.accion_id));
    const accionesPendientes = acciones.filter(a => !yaAvisadasSet.has(a.id));

    if (accionesPendientes.length === 0) {
      return { enviados: 0, omitidos: acciones.length };
    }

    // Obtener perfiles únicos de responsables
    const responsableIds = [...new Set(accionesPendientes.map(a => a.responsable_id))];
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', responsableIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

    let enviados = 0;
    let errores = 0;

    for (const accion of accionesPendientes) {
      const perfil = profileMap.get(accion.responsable_id);
      if (!perfil?.email) continue;

      const fechaVenc = accion.fecha_vencimiento;
      const vencDate = new Date(fechaVenc + 'T00:00:00');
      const diasRestantes = Math.round((vencDate.getTime() - hoy.getTime()) / 86_400_000);

      // Omitir acciones vencidas hace más de 30 días (ya irrelevantes)
      if (diasRestantes < -30) continue;

      const hallazgoNumero = (accion.nc_hallazgos as { numero?: string } | null)?.numero ?? accion.hallazgo_id;

      const html = buildReminderHtml(
        perfil.full_name ?? perfil.email,
        hallazgoNumero,
        accion.descripcion ?? '',
        fechaVenc,
        accion.hallazgo_id,
        diasRestantes,
      );

      const subject = diasRestantes <= 0
        ? `⚠️ Acción vencida en ${hallazgoNumero}`
        : `Recordatorio: acción en ${hallazgoNumero} vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Ribeiro 360 <notificaciones@notificaciones.ribeiro.ar>',
          to: [perfil.email],
          subject,
          html,
        }),
      });

      if (res.ok) {
        enviados++;
        // Registrar en el log para evitar duplicados en reintentos del día
        await admin.from('nc_reminders_log').insert({ accion_id: accion.id, enviado_en: hoyStr });
      } else {
        errores++;
        console.error(`[reminders] error enviando a ${perfil.email}:`, await res.text());
      }
    }

    return { enviados, errores, total: acciones.length };
  }
}
