import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getAdminClient, requireAdminRole } from '../_shared/auth.ts';

async function getGraphToken(): Promise<string> {
  const tenantId     = Deno.env.get('AZURE_TENANT_ID');
  const clientId     = Deno.env.get('AZURE_CLIENT_ID');
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Faltan variables de entorno de Azure');
  }

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
      scope:         'https://graph.microsoft.com/.default',
    }),
  });

  if (!res.ok) throw new Error(`Error obteniendo token: ${await res.text()}`);
  const json = await res.json();
  return json.access_token as string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const user = await getAuthenticatedUser(req);
    const adminClient = getAdminClient();
    await requireAdminRole(adminClient, user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const token = await getGraphToken();

    // Cargar todos los perfiles activos con email
    console.log('[sync-photos] Cargando perfiles...');
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email')
      .neq('is_active', false)
      .not('email', 'is', null);

    if (profilesError) throw new Error(`Error cargando perfiles: ${profilesError.message}`);
    console.log(`[sync-photos] Perfiles a procesar: ${profiles?.length}`);

    const summary = { actualizados: 0, sin_foto: 0, errores: [] as string[] };

    for (const profile of (profiles ?? [])) {
      const email = profile.email.toLowerCase();

      // Obtener foto desde Graph API
      const photoRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${email}/photo/$value`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 404 = usuario sin foto configurada en Azure
      if (photoRes.status === 404) { summary.sin_foto++; continue; }
      if (!photoRes.ok) {
        summary.errores.push(`${email}: HTTP ${photoRes.status}`);
        continue;
      }

      const contentType = photoRes.headers.get('content-type') ?? 'image/jpeg';
      const imageBytes  = await photoRes.arrayBuffer();
      const fileName    = `${profile.id}.jpg`;

      // Subir al bucket avatars
      const { error: uploadError } = await adminClient.storage
        .from('avatars')
        .upload(fileName, imageBytes, { contentType, upsert: true });

      if (uploadError) {
        summary.errores.push(`${email} (upload): ${uploadError.message}`);
        continue;
      }

      // URL pública del bucket
      const avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;

      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (updateError) {
        summary.errores.push(`${email} (update): ${updateError.message}`);
      } else {
        summary.actualizados++;
      }
    }

    console.log(`[sync-photos] Completado. Actualizados: ${summary.actualizados}, sin foto: ${summary.sin_foto}, errores: ${summary.errores.length}`);

    return new Response(JSON.stringify({
      ok: true,
      actualizados: summary.actualizados,
      sin_foto: summary.sin_foto,
      errores: summary.errores,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    if (message === 'UNAUTHORIZED') return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (message === 'FORBIDDEN')    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    console.error('[sync-photos]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
