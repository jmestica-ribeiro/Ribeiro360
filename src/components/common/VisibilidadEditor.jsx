import React from 'react';
import { Trash2 } from 'lucide-react';
import { Select } from './Select';
import './CommonComponents.css';

const CAMPOS_OPCIONES = [
  { value: 'department', label: 'Área / Departamento' },
  { value: 'job_title', label: 'Puesto' },
  { value: 'office_location', label: 'Ubicación' },
];

/**
 * Editor de reglas de visibilidad reutilizable para eventos y cursos.
 *
 * @param {Array<{id, campo, valor}>} rules - reglas actuales
 * @param {function} onChange - (newRules) => void
 * @param {{ job_title: string[], department: string[], office_location: string[] }} profileValues
 */
export function VisibilidadEditor({ rules, onChange, profileValues = {} }) {
  const handleCampoChange = (idx, campo) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], campo, valor: '' };
    onChange(updated);
  };

  const handleValorChange = (idx, valor) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], valor };
    onChange(updated);
  };

  const handleRemove = (idx) => {
    onChange(rules.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    onChange([...rules, { id: 'temp-' + Date.now(), campo: 'department', valor: '' }]);
  };

  return (
    <div className="visibilidad-editor">
      <h4 className="visibilidad-editor-title">Visibilidad</h4>
      <p className="visibilidad-editor-hint">
        Sin reglas, el contenido es visible para todos. Con reglas, solo lo ven quienes coincidan.
      </p>
      <div className="destinatarios-list">
        {rules.map((r, idx) => (
          <div key={r.id || idx} className="dest-row" style={{ marginBottom: 12, gridTemplateColumns: '180px 1fr 40px' }}>
            <Select
              aria-label="Campo"
              value={r.campo}
              onChange={v => handleCampoChange(idx, v)}
              options={CAMPOS_OPCIONES}
            />
            <Select
              aria-label="Valor"
              value={r.valor}
              onChange={v => handleValorChange(idx, v)}
              placeholder="— Seleccionar —"
              options={[...new Set([...(profileValues[r.campo] || []), ...(r.valor ? [r.valor] : [])])].sort()}
            />
            <button className="action-btn delete" onClick={() => handleRemove(idx)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          className="btn-add-dest"
          style={{ width: 'auto', padding: '10px 24px' }}
          onClick={handleAdd}
        >
          + Agregar Regla
        </button>
      </div>
    </div>
  );
}
