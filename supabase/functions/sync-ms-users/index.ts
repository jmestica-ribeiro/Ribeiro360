import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getAdminClient, requireAdminRole } from '../_shared/auth.ts';

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headerLine = lines[0].replace(/^\uFEFF/, ''); // strip BOM
  const headers = parseCSVLine(headerLine).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
    return row;
  });
}

// ── Helpers para nombres de columna flexibles (EN / ES / con espacios) ────────

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const val = row[k] ?? row[k.toLowerCase()] ?? '';
    if (val) return val;
  }
  return '';
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

    const body = await req.json();
    const csvText: string = body?.csv ?? '';
    if (!csvText.trim()) {
      return new Response(JSON.stringify({ error: 'No se recibió contenido CSV' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const rows = parseCSV(csvText);

    // Solo Member + accountEnabled = true
    const eligible = rows.filter(row => {
      const type    = getField(row, 'userType', 'User type', 'usertype').toLowerCase();
      const enabled = getField(row, 'accountEnabled', 'Account enabled', 'accountenabled').toLowerCase();
      return type === 'member' && (enabled === 'true' || enabled === '1' || enabled === 'yes');
    });

    const summary = { created: 0, existing: 0, skipped: 0, errors: [] as string[] };

    for (const row of eligible) {
      const email        = getField(row, 'userPrincipalName', 'User principal name').toLowerCase();
      const fullName     = getField(row, 'displayName', 'Display name');
      const jobTitle     = getField(row, 'jobTitle', 'Job title') || null;
      const department   = getField(row, 'department', 'Department') || null;
      const officeLocation = getField(row, 'officeLocation', 'Office location') || null;

      if (!email || !fullName) { summary.skipped++; continue; }

      // 1. Intentar crear el usuario en auth
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      let supabaseUserId: string | null = null;

      if (createError) {
        const msg = createError.message.toLowerCase();
        if (msg.includes('already been registered') || msg.includes('already exists') || msg.includes('duplicate')) {
          // Buscar el UUID del usuario existente via RPC
          const { data: existingId, error: rpcError } = await adminClient
            .rpc('get_user_id_by_email', { user_email: email });
          if (rpcError || !existingId) {
            summary.errors.push(`${email}: no se pudo obtener ID existente`);
            continue;
          }
          supabaseUserId = existingId as string;
          summary.existing++;
        } else {
          summary.errors.push(`${email}: ${createError.message}`);
          continue;
        }
      } else {
        supabaseUserId = created.user.id;
        summary.created++;
      }

      // 2. Upsert del perfil (no sobreescribe role/admin_tabs)
      if (supabaseUserId) {
        const { error: upsertError } = await adminClient.from('profiles').upsert(
          { id: supabaseUserId, email, full_name: fullName, job_title: jobTitle, department, office_location: officeLocation },
          { onConflict: 'id', ignoreDuplicates: false }
        );
        if (upsertError) summary.errors.push(`${email} (perfil): ${upsertError.message}`);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      total_en_csv: rows.length,
      total_procesados: eligible.length,
      creados: summary.created,
      ya_existian: summary.existing,
      omitidos: summary.skipped,
      errores: summary.errors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    if (message === 'UNAUTHORIZED') return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (message === 'FORBIDDEN')    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    console.error('[sync-ms-users]', message);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
