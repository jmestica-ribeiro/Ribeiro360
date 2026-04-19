import { supabase } from '../lib/supabase';

export async function fetchFaqPreguntas() {
  const { data, error } = await supabase
    .from('faq_preguntas')
    .select('*, sector:faq_sectores(nombre, color)')
    .order('sector_id')
    .order('numero_orden');
  if (error) console.error('[faqService] fetchFaqPreguntas:', error.message);
  return { data: data ?? [], error };
}

export async function fetchFaqSectores() {
  const { data, error } = await supabase
    .from('faq_sectores')
    .select('*')
    .order('nombre');
  if (error) console.error('[faqService] fetchFaqSectores:', error.message);
  return { data: data ?? [], error };
}

/**
 * Crea o actualiza una pregunta FAQ.
 * Si el payload incluye `id`, hace update; si no, hace insert.
 */
export async function saveFaqPregunta(payload) {
  const { id, sector, ...fields } = payload;
  const query = id
    ? supabase.from('faq_preguntas').update(fields).eq('id', id).select()
    : supabase.from('faq_preguntas').insert(fields).select();

  const { data, error } = await query;
  if (error) console.error('[faqService] saveFaqPregunta:', error.message);
  return { data, error };
}

export async function deleteFaqPregunta(id) {
  const { error } = await supabase.from('faq_preguntas').delete().eq('id', id);
  if (error) console.error('[faqService] deleteFaqPregunta:', error.message);
  return { error };
}

export async function saveFaqSector(payload) {
  const { id, ...fields } = payload;
  const query = id
    ? supabase.from('faq_sectores').update(fields).eq('id', id).select()
    : supabase.from('faq_sectores').insert(fields).select();

  const { data, error } = await query;
  if (error) console.error('[faqService] saveFaqSector:', error.message);
  return { data, error };
}

export async function deleteFaqSector(id) {
  const { error } = await supabase.from('faq_sectores').delete().eq('id', id);
  if (error) console.error('[faqService] deleteFaqSector:', error.message);
  return { error };
}

export async function fetchFaqPreguntasActivas() {
  const { data, error } = await supabase
    .from('faq_preguntas')
    .select('*, sector:faq_sectores(nombre, color, icono)')
    .eq('activo', true)
    .order('sector_id')
    .order('numero_orden');
  if (error) console.error('[faqService] fetchFaqPreguntasActivas:', error.message);
  return { data: data ?? [], error };
}
