import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getAdminClient, requireAdminRole } from '../_shared/auth.ts';

// ── Microsoft Graph: obtener token de aplicación (client_credentials) ─────────

async function getGraphToken(): Promise<string> {
  const tenantId     = Deno.env.get('AZURE_TENANT_ID');
  const clientId     = Deno.env.get('AZURE_CLIENT_ID');
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Faltan variables de entorno de Azure (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)');
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error obteniendo token de Azure: ${body}`);
  }

  const json = await res.json();
  return json.access_token as string;
}

// ── Microsoft Graph: listar todos los usuarios (paginado) ─────────────────────

interface GraphUser {
  displayName:        string;
  userPrincipalName:  string;
  userType:           string | null;
  accountEnabled:     boolean;
  jobTitle:           string | null;
  department:         string | null;
  officeLocation:     string | null;
}

async function fetchAllGraphUsers(token: string): Promise<GraphUser[]> {
  const select = 'displayName,userPrincipalName,userType,accountEnabled,jobTitle,department,officeLocation';
  let url: string | null = `https://graph.microsoft.com/v1.0/users?$filter=accountEnabled eq true&$select=${select}&$top=999`;
  const users: GraphUser[] = [];

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Error llamando a Graph API: ${body}`);
    }

    const json = await res.json();
    users.push(...(json.value ?? []));
    url = json['@odata.nextLink'] ?? null;
  }

  return users;
}

// ── Handler principal ─────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const user = await getAuthenticatedUser(req);
    const adminClient = getAdminClient();
    await requireAdminRole(adminClient, user.id);

    // 1. Obtener token y usuarios desde Graph API
    console.log('[sync] Obteniendo token de Azure...');
    const token   = await getGraphToken();
    console.log('[sync] Token obtenido. Consultando Graph API...');
    const allUsers = await fetchAllGraphUsers(token);
    console.log(`[sync] Graph devolvió ${allUsers.length} usuarios.`);

    // 2. Solo members (excluye guests/service accounts)
    const activeUsers = allUsers.filter(u => (u.userType ?? '').toLowerCase() === 'member');
    const activeEmails = new Set(activeUsers.map(u => (u.userPrincipalName ?? '').toLowerCase()));
    console.log(`[sync] Members activos a procesar: ${activeUsers.length}`);

    // Guardia: si Graph devuelve muy pocos usuarios, algo salió mal — no inactivar en masa
    if (activeUsers.length < 10) {
      return new Response(JSON.stringify({
        error: `Graph API devolvió solo ${activeUsers.length} usuarios activos. Sync abortado para evitar inactivaciones masivas incorrectas.`,
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const summary = { created: 0, existing: 0, skipped: 0, inactivated: 0, errors: [] as string[] };

    // ── 3. Cargar todos los perfiles existentes en una sola query ───────────────
    console.log('[sync] Cargando perfiles existentes...');
    const { data: existingProfiles } = await adminClient
      .from('profiles')
      .select('id, email');
    const emailToId = new Map<string, string>(
      (existingProfiles ?? []).map((p: { id: string; email: string }) => [p.email.toLowerCase(), p.id])
    );
    console.log(`[sync] Perfiles existentes en Supabase: ${emailToId.size}`);

    // ── 4. Crear en auth solo los usuarios nuevos; recolectar todos los IDs ─────
    console.log('[sync] Creando usuarios nuevos en auth...');
    const profilesToUpsert: object[] = [];

    for (const u of activeUsers) {
      const email          = (u.userPrincipalName ?? '').toLowerCase();
      const fullName       = u.displayName ?? '';
      const jobTitle       = u.jobTitle       ?? null;
      const department     = u.department     ?? null;
      const officeLocation = u.officeLocation ?? null;

      if (!email || !fullName) { summary.skipped++; continue; }

      let supabaseUserId = emailToId.get(email) ?? null;

      if (supabaseUserId) {
        summary.existing++;
      } else {
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (createError) {
          summary.errors.push(`${email}: ${createError.message}`);
          continue;
        }
        supabaseUserId = created.user.id;
        summary.created++;
      }

      profilesToUpsert.push({ id: supabaseUserId, email, full_name: fullName, job_title: jobTitle, department, office_location: officeLocation, is_active: true });
    }

    // ── 5. Upsert batch de todos los perfiles en una sola llamada ───────────────
    console.log(`[sync] Upsert batch de ${profilesToUpsert.length} perfiles...`);
    if (profilesToUpsert.length > 0) {
      const { error: batchError } = await adminClient
        .from('profiles')
        .upsert(profilesToUpsert, { onConflict: 'id', ignoreDuplicates: false });
      if (batchError) summary.errors.push(`upsert batch: ${batchError.message}`);
    }

    console.log(`[sync] Batch completado. Creados: ${summary.created}, ya existían: ${summary.existing}, omitidos: ${summary.skipped}, errores: ${summary.errors.length}`);

    // ── 6. Inactivar en batch quienes ya no aparecen en Azure ──────────────────
    console.log('[sync] Calculando usuarios a inactivar...');
    const { data: supabaseProfiles } = await adminClient
      .from('profiles')
      .select('id, email')
      .or('is_active.eq.true,is_active.is.null');

    const idsToInactivate = (supabaseProfiles ?? [])
      .filter((p: { id: string; email: string }) => {
        const email = (p.email ?? '').toLowerCase();
        return email && !activeEmails.has(email);
      })
      .map((p: { id: string; email: string }) => p.id);

    console.log(`[sync] Usuarios a inactivar: ${idsToInactivate.length}`);

    if (idsToInactivate.length > 0) {
      const { error: inactivateError } = await adminClient
        .from('profiles')
        .update({ is_active: false })
        .in('id', idsToInactivate);

      if (inactivateError) {
        summary.errors.push(`inactivar batch: ${inactivateError.message}`);
      } else {
        summary.inactivated = idsToInactivate.length;
      }
    }

    console.log(`[sync] Inactivados: ${summary.inactivated}. Sync finalizado.`);

    return new Response(JSON.stringify({
      ok: true,
      total_en_directorio: allUsers.length,
      total_procesados: activeUsers.length,
      creados: summary.created,
      ya_existian: summary.existing,
      omitidos: summary.skipped,
      inactivados: summary.inactivated,
      errores: summary.errors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    if (message === 'UNAUTHORIZED') return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (message === 'FORBIDDEN')    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    console.error('[sync-ms-users]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
