import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── JWKS cache (en memoria, por instancia de Edge Function) ───────────────────
const jwksCache = new Map<string, { key: CryptoKey; expiresAt: number }>();

function b64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function getPublicKey(kid: string): Promise<CryptoKey> {
  const cached = jwksCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) return cached.key;

  const url = `${Deno.env.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo obtener JWKS');

  const { keys } = await res.json() as { keys: JsonWebKey[] & { kid: string; alg: string }[] };
  const jwk = (keys as (JsonWebKey & { kid: string; alg: string })[]).find(k => k.kid === kid);
  if (!jwk) throw new Error('kid no encontrado en JWKS');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );

  // Cache por 1 hora
  jwksCache.set(kid, { key, expiresAt: Date.now() + 3_600_000 });
  return key;
}

async function verifyES256JWT(jwt: string): Promise<{ sub: string; exp: number; role: string }> {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('JWT malformado');

  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(new TextDecoder().decode(b64urlDecode(headerB64)));
  if (header.alg !== 'ES256') throw new Error('Algoritmo no soportado: ' + header.alg);

  const publicKey = await getPublicKey(header.kid);

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = b64urlDecode(signatureB64);

  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    data
  );
  if (!valid) throw new Error('Firma inválida');

  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  if (!payload.sub) throw new Error('JWT sin sub');
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('JWT expirado');

  return payload;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Verifica el JWT ES256 con la clave pública real de Supabase Auth (JWKS).
 * No confía en el payload sin antes validar la firma criptográfica.
 */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');

  const jwt = authHeader.replace('Bearer ', '');

  let payload: { sub: string; exp: number; role: string };
  try {
    payload = await verifyES256JWT(jwt);
  } catch {
    throw new Error('UNAUTHORIZED');
  }

  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.admin.getUserById(payload.sub);
  if (error || !user) throw new Error('UNAUTHORIZED');

  return user;
}

/**
 * Devuelve un cliente con service_role para operaciones privilegiadas.
 * NUNCA exponer este cliente al frontend.
 */
export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Verifica que el usuario tenga rol admin o superadmin.
 * Lanza un error si no tiene permisos.
 */
export async function requireAdminRole(
  adminClient: SupabaseClient,
  userId: string
): Promise<{ role: string; admin_tabs: string[] | null }> {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role, admin_tabs')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('FORBIDDEN');
  }

  if (!['admin', 'superadmin'].includes(profile.role)) {
    throw new Error('FORBIDDEN');
  }

  return profile;
}
