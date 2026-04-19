/**
 * Parsea el contenido JSON de un bloque. Si no es JSON válido y hay contenido,
 * lo envuelve en un bloque de tipo 'texto' para preservar compatibilidad con datos legacy.
 *
 * @param {string|null} content
 * @returns {Array}
 */
export function parseBlocks(content) {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return content
      ? [{ id: 'legacy-' + Date.now(), tipo: 'texto', contenido: content, metadata: {} }]
      : [];
  }
}

/**
 * Actualiza un campo de un bloque específico dentro de una lista.
 *
 * @param {Array} blocks
 * @param {string} id - ID del bloque a actualizar
 * @param {string} field - nombre del campo
 * @param {*} value - nuevo valor
 * @returns {Array}
 */
export function updateBlockInList(blocks, id, field, value) {
  return blocks.map(b => (b.id === id ? { ...b, [field]: value } : b));
}

/**
 * Actualiza una clave dentro del objeto metadata de un bloque específico.
 *
 * @param {Array} blocks
 * @param {string} id - ID del bloque a actualizar
 * @param {string} key - clave dentro de metadata
 * @param {*} value - nuevo valor
 * @returns {Array}
 */
export function updateBlockMetaInList(blocks, id, key, value) {
  return blocks.map(b => {
    if (b.id !== id) return b;
    return { ...b, metadata: { ...b.metadata, [key]: value } };
  });
}
