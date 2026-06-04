import { supabase } from '../lib/supabase';

const CHUNK_SIZE = 200;

export async function upsertVehiculos(rows) {
  let inserted = 0, updated = 0, errors = 0;

  // Traer los Codigos existentes para saber cuáles son update vs insert
  const { data: existing } = await supabase
    .from('vehiculos')
    .select('"Codigo"');
  const existingCodes = new Set((existing ?? []).map(r => r['Codigo']));

  // Partir en chunks para no superar el límite de payload de Supabase
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabase
      .from('vehiculos')
      .upsert(chunk, { onConflict: '"Codigo"', ignoreDuplicates: false })
      .select('"Codigo"');

    if (error) {
      console.error('[vehiculosService] upsert chunk error:', error.message);
      errors += chunk.length;
      continue;
    }

    for (const row of chunk) {
      if (existingCodes.has(row['Codigo'])) updated++;
      else inserted++;
    }
  }

  return { inserted, updated, errors };
}

export async function fetchVehiculos() {
  const [{ data: vehiculos, error }, { data: familias }] = await Promise.all([
    supabase
      .from('vehiculos')
      .select('id, "Codigo", "Nombre", "Marca", "Patente", "Activo", "Estado_Codigo", "Modelo_Codigo"')
      .order('"Codigo"', { ascending: true }),
    supabase.from('cheq_familias').select('modelo_codigo, tipo_equipo'),
  ]);

  if (error) console.error('[vehiculosService] fetchVehiculos:', error.message);

  const familiaMap = Object.fromEntries(
    (familias ?? []).map(f => [f.modelo_codigo, f.tipo_equipo])
  );

  const enriched = (vehiculos ?? [])
    .filter(v => /^(AS|ER)/i.test(v['Codigo'] ?? ''))
    .map(v => ({
      ...v,
      tipo_equipo: familiaMap[v['Modelo_Codigo']] ?? null,
    }));

  return { data: enriched, error };
}

// ── Familias (Modelo_Codigo → tipo_equipo) ────────────────────────────────────

export async function fetchFamilias() {
  const { data, error } = await supabase
    .from('cheq_familias')
    .select('*')
    .order('modelo_codigo', { ascending: true });
  if (error) console.error('[vehiculosService] fetchFamilias:', error.message);
  return { data: data ?? [], error };
}

export async function saveFamilia(payload) {
  const { id, ...fields } = payload;
  const query = id
    ? supabase.from('cheq_familias').update(fields).eq('id', id).select()
    : supabase.from('cheq_familias').insert(fields).select();
  const { data, error } = await query;
  if (error) console.error('[vehiculosService] saveFamilia:', error.message);
  return { data, error };
}

export async function deleteFamilia(id) {
  const { error } = await supabase.from('cheq_familias').delete().eq('id', id);
  if (error) console.error('[vehiculosService] deleteFamilia:', error.message);
  return { error };
}

export async function fetchModelosCodigos() {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('"Modelo_Codigo"')
    .not('"Modelo_Codigo"', 'is', null);
  if (error) console.error('[vehiculosService] fetchModelosCodigos:', error.message);
  const unique = [...new Set((data ?? []).map(r => r['Modelo_Codigo']).filter(Boolean))].sort();
  return { data: unique, error };
}
