const norm = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Devuelve la opción de gerencia que corresponde al departamento del usuario, o '' si no hay coincidencia clara.
export function matchGerencia(department, options) {
  const d = norm(department);
  if (!d) return '';
  const exact = options.find(o => norm(o) === d);
  if (exact) return exact;
  const partial = options.filter(o => {
    const n = norm(o);
    return n.includes(d) || d.includes(n);
  });
  return partial.length === 1 ? partial[0] : '';
}
