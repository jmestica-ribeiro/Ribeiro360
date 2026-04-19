import React from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import './CommonComponents.css';

/**
 * Header estándar para formularios de edición en el admin.
 * Incluye botón de volver, título y botón de guardar.
 *
 * @param {string} title - título del formulario
 * @param {function} onBack - callback al presionar Volver
 * @param {function} onSave - callback al presionar Guardar
 * @param {string} [saveLabel] - texto del botón guardar
 * @param {boolean} [isSaving] - muestra spinner si true
 * @param {boolean} [saveDisabled] - deshabilita el botón guardar
 */
export function FormBackHeader({ title, onBack, onSave, saveLabel = 'Guardar', isSaving = false, saveDisabled = false }) {
  return (
    <div className="form-header">
      <button className="btn-back" onClick={onBack}>
        <ChevronLeft size={18} /> Volver
      </button>
      <h3>{title}</h3>
      {onSave && (
        <button
          className="btn-primary"
          onClick={onSave}
          disabled={isSaving || saveDisabled}
        >
          {isSaving ? <LoadingSpinner size={16} /> : <Save size={16} />}
          {saveLabel}
        </button>
      )}
    </div>
  );
}
