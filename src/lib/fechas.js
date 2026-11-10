const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Las columnas `date` ('2026-11-02') se parsean como UTC y en Argentina caen el día anterior.
export function parseFecha(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const m = DATE_ONLY.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

// 'YYYY-MM-DD' de hoy en hora local (toISOString usa UTC y después de las 21h da mañana)
export function hoyISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatFecha(value, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  const d = parseFecha(value);
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-AR', opts) : '—';
}
