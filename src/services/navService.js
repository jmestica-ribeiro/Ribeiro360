import { supabase } from '../lib/supabase';

export async function fetchNavConfig() {
  const { data, error } = await supabase
    .from('nav_config')
    .select('key, visible');
  if (error) console.error('[navService] fetchNavConfig:', error.message);
  return { data: data ?? [], error };
}

export async function updateNavItem(key, visible) {
  const { data, error } = await supabase
    .from('nav_config')
    .upsert([{ key, visible }], { onConflict: 'key' })
    .select();
  if (error) console.error('[navService] updateNavItem:', error.message);
  return { data: data?.[0] ?? null, error };
}
