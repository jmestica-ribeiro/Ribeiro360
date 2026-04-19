import { supabase } from '../lib/supabase';

export async function fetchOnboardingSteps() {
  const { data, error } = await supabase
    .from('onboarding_steps')
    .select('*')
    .order('numero_orden', { ascending: true });
  if (error) console.error('[onboardingService] fetchOnboardingSteps:', error.message);
  return { data: data ?? [], error };
}

export async function fetchOnboardingBloques(stepId) {
  const { data, error } = await supabase
    .from('onboarding_bloques')
    .select('*')
    .eq('step_id', stepId)
    .order('numero_orden', { ascending: true });
  if (error) console.error('[onboardingService] fetchOnboardingBloques:', error.message);
  return { data: data ?? [], error };
}

/**
 * Guarda un step y reemplaza completamente sus bloques.
 * @param {object} stepData - datos del step (puede incluir `id` para update)
 * @param {Array} bloques - lista completa de bloques del step
 */
export async function saveOnboardingStep(stepData, bloques) {
  const { data: stepResult, error: stepError } = await supabase
    .from('onboarding_steps')
    .upsert([stepData])
    .select();
  if (stepError) {
    console.error('[onboardingService] saveOnboardingStep:', stepError.message);
    return { data: null, error: stepError };
  }

  const savedStepId = stepResult[0].id;
  const blocksPayload = bloques.map((b, idx) => ({
    id: b.id && !b.id.toString().startsWith('temp-') ? b.id : self.crypto.randomUUID(),
    step_id: savedStepId,
    numero_orden: idx + 1,
    tipo: b.tipo,
    contenido: b.contenido,
    metadata: b.metadata || {},
  }));

  await supabase.from('onboarding_bloques').delete().eq('step_id', savedStepId);
  if (blocksPayload.length > 0) {
    await supabase.from('onboarding_bloques').insert(blocksPayload);
  }

  return { data: stepResult[0], error: null };
}

export async function deleteOnboardingStep(id) {
  const { error } = await supabase.from('onboarding_steps').delete().eq('id', id);
  if (error) console.error('[onboardingService] deleteOnboardingStep:', error.message);
  return { error };
}

/**
 * Actualiza el numero_orden de todos los steps (usado al reordenar con drag & drop).
 * @param {Array} stepsOrdenados - lista de steps en el nuevo orden
 */
export async function reorderOnboardingSteps(stepsOrdenados) {
  const updates = stepsOrdenados.map((step, idx) => ({ ...step, numero_orden: idx + 1 }));
  const { error } = await supabase.from('onboarding_steps').upsert(updates);
  if (error) console.error('[onboardingService] reorderOnboardingSteps:', error.message);
  return { error };
}

/**
 * Carga los steps activos con sus bloques ya mergeados.
 * Retorna un array de steps, cada uno con una propiedad `blocks`.
 */
export async function fetchOnboardingContenido() {
  const { data: steps, error: stepsError } = await supabase
    .from('onboarding_steps')
    .select('*')
    .eq('activo', true)
    .order('numero_orden', { ascending: true });

  if (stepsError) {
    console.error('[onboardingService] fetchOnboardingContenido - steps:', stepsError.message);
    return { data: [], error: stepsError };
  }

  if (!steps || steps.length === 0) return { data: [], error: null };

  const stepIds = steps.map(s => s.id);
  const { data: bloques, error: bloquesError } = await supabase
    .from('onboarding_bloques')
    .select('*')
    .in('step_id', stepIds)
    .order('numero_orden', { ascending: true });

  if (bloquesError) console.error('[onboardingService] fetchOnboardingContenido - bloques:', bloquesError.message);

  const data = steps.map(step => ({
    ...step,
    blocks: (bloques || []).filter(b => b.step_id === step.id),
  }));

  return { data, error: null };
}
