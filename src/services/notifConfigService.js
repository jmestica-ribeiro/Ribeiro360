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
    mensaje_extra: '',
  },
};

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
