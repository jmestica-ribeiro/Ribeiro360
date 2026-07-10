import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAdminClient } from '../_shared/auth.ts';

const APP_URL = 'https://intranet.ribeiro.ar';

const LOGO_B64 = 'data:image/png;base64,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';
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
                    <img src="${LOGO_B64}" alt="Ribeiro" height="36" style="display:block;height:36px;width:auto;" />
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
      return new Response(JSON.stringify({ enviados: 0 }), { status: 200 });
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
      return new Response(JSON.stringify({ enviados: 0, omitidos: acciones.length }), { status: 200 });
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

    return new Response(
      JSON.stringify({ enviados, errores, total: acciones.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[reminders] error fatal:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
