import { useState, useCallback, useMemo } from 'react';

/**
 * Validación de campos requeridos con feedback inline.
 *
 * const v = useRequiredFields([
 *   { id: 'docm-titulo', label: 'Título', valid: !!form.titulo.trim() },
 *   { id: 'docm-aprob', label: 'Gerente aprobador', valid: !!form.aprobador_id, when: form.controlado },
 * ]);
 * <input id="docm-titulo" {...v.fieldProps('docm-titulo')} />
 * <FieldError show={v.isInvalid('docm-titulo')}>Ingresá un título</FieldError>
 * <SubmitButton missing={v.missing} onMissing={v.revealAll} onClick={save}>Guardar</SubmitButton>
 *
 * `id` debe ser el id del elemento enfocable (input, o el trigger del Select).
 * Un campo se marca inválido recién después de salir de él (blur) o de intentar guardar.
 */
export function useRequiredFields(fields) {
  const [touched, setTouched] = useState(() => new Set());
  const [revealed, setRevealed] = useState(false);

  const active = useMemo(() => fields.filter(f => f.when === undefined || f.when), [fields]);
  const missingFields = useMemo(() => active.filter(f => !f.valid), [active]);
  const missing = useMemo(() => missingFields.map(f => f.label), [missingFields]);

  const touch = useCallback((id) => {
    setTouched(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const isInvalid = useCallback(
    (id) => missingFields.some(f => f.id === id) && (revealed || touched.has(id)),
    [missingFields, revealed, touched],
  );

  const fieldProps = useCallback((id) => ({
    onBlur: () => touch(id),
    'aria-invalid': isInvalid(id) || undefined,
  }), [touch, isInvalid]);

  // Marca todos los faltantes y lleva el foco al primero
  const revealAll = useCallback(() => {
    setRevealed(true);
    const first = missingFields[0];
    if (!first) return;
    const el = document.getElementById(first.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }
  }, [missingFields]);

  const reset = useCallback(() => { setTouched(new Set()); setRevealed(false); }, []);

  return { missing, isValid: missing.length === 0, isInvalid, fieldProps, touch, revealAll, reset };
}
