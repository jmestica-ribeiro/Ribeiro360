// Layout HTML compartido por los emails de Ribeiro 360 (send-nc-email, send-nc-reminders).

export const APP_URL = 'https://intranet.ribeiro.ar';

// Imagen hosteada: los clientes de correo (Gmail, Outlook) bloquean los logos embebidos en base64.
export const LOGO_URL = 'https://i.ibb.co/k2twLzyj/logo3.png';

export function escapeHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s ?? '').replace(/[&<>"']/g, c => map[c]);
}

// ── Email layout compartido ───────────────────────────────────────────────────

export function emailLayout(params: {
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
  extraHtml?: string;
}): string {
  const { primerNombre, subtitulo, mensaje, badgeLabel, badgeValue, badgeLabel2, badgeValue2, link, linkLabel, footer, extraHtml } = params;

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
            <td style="background-color:#1a1a1a;padding:20px 32px;">
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${LOGO_URL}" alt="Ribeiro" height="36" style="display:block;height:36px;width:auto;" />
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <span style="color:#999;font-size:12px;">${subtitulo}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Hola, <strong style="color:#111827;">${primerNombre}</strong></p>
              <h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${mensaje}</h2>
              ${extraHtml ?? ''}
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
