/**
 * Devuelve true si el perfil del usuario satisface TODAS las reglas de visibilidad.
 * Un array vacío de reglas significa visible para todos.
 *
 * @param {Array<{campo: string, valor: string}>} rules
 * @param {object|null} profile
 */
export function visMatchesProfile(rules, profile) {
  if (!rules || rules.length === 0) return true;
  return rules.every(r => {
    const v = profile?.[r.campo];
    return v && v.toLowerCase() === r.valor.toLowerCase();
  });
}

/**
 * Devuelve true si el usuario puede ver un curso, chequeando tanto
 * destinatarios directos como reglas de visibilidad por perfil.
 *
 * @param {string} courseId
 * @param {Set<string>} destCursoIds - IDs de cursos donde el usuario es destinatario directo
 * @param {Array} visRules - todas las reglas de visibilidad (se filtran por courseId)
 * @param {object|null} profile
 */
export function courseIsVisible(courseId, destCursoIds, visRules, profile) {
  if (destCursoIds.has(courseId)) return true;
  const rules = (visRules || []).filter(r => r.curso_id === courseId);
  return visMatchesProfile(rules, profile);
}

/**
 * Devuelve true si el usuario puede ver un evento según sus reglas de visibilidad.
 *
 * @param {string} eventoId
 * @param {Array} visRules - todas las reglas de visibilidad de eventos
 * @param {object|null} profile
 */
export function eventoIsVisible(eventoId, visRules, profile) {
  const rules = (visRules || []).filter(r => r.evento_id === eventoId);
  return visMatchesProfile(rules, profile);
}
