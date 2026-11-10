import React from 'react';
import { AlertCircle } from 'lucide-react';
import './FormFeedback.css';

const listar = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

/**
 * Botón de guardar que dice qué falta. Si hay faltantes, no envía: llama a onMissing
 * (normalmente v.revealAll) para marcar los campos y llevar el foco al primero.
 */
export function SubmitButton({ missing = [], onMissing, onClick, saving = false, savingLabel = 'Guardando...', className = '', children, ...rest }) {
  const blocked = missing.length > 0;
  return (
    <button
      type="button"
      {...rest}
      className={`${className}${blocked ? ' submit-blocked' : ''}`}
      aria-disabled={blocked || saving || undefined}
      disabled={saving}
      title={blocked ? `Falta completar: ${listar(missing)}` : rest.title}
      onClick={(e) => {
        if (saving) return;
        if (blocked) { onMissing?.(); return; }
        onClick?.(e);
      }}
    >
      {saving ? savingLabel : blocked ? <>Falta: {listar(missing)}</> : children}
    </button>
  );
}

export function FieldError({ show, children }) {
  if (!show) return null;
  return (
    <span className="field-error" role="alert">
      <AlertCircle size={13} strokeWidth={1.75} aria-hidden="true" /> {children}
    </span>
  );
}
