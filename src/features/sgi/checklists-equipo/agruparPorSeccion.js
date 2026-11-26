// Agrupa una lista (ya ordenada por `orden`) según la sección de cada elemento.
// Las secciones aparecen en el orden de su primer elemento, así un ítem agregado
// después a una sección existente se muestra dentro de ella y no al final.
// `num` es la numeración corrida (1, 2, 3...) en el orden en que se muestra.
// Si ningún elemento tiene sección, devuelve un único grupo con `seccion: null`
// y la lista se ve igual que antes.
export function agruparPorSeccion(lista, getSeccion) {
  const grupos = new Map();
  for (const elemento of lista) {
    const seccion = getSeccion(elemento)?.trim() || null;
    if (!grupos.has(seccion)) grupos.set(seccion, []);
    grupos.get(seccion).push(elemento);
  }
  let num = 0;
  return [...grupos].map(([seccion, elementos]) => ({
    seccion,
    elementos: elementos.map(elemento => ({ elemento, num: ++num })),
  }));
}
