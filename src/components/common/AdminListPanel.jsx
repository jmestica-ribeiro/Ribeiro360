import React from 'react';
import { Plus } from 'lucide-react';
import './CommonComponents.css';

/**
 * Panel de lista estándar del admin con header y botón de agregar.
 *
 * @param {string} title - título de la sección
 * @param {number} [count] - cantidad de ítems (se muestra como badge)
 * @param {string} [addLabel] - texto del botón de agregar
 * @param {function} [onAdd] - callback al presionar el botón agregar
 * @param {React.ReactNode} children - contenido del panel
 */
export function AdminListPanel({ title, count, addLabel = 'Nuevo', onAdd, children }) {
  return (
    <div className="admin-list-panel">
      <div className="admin-list-header">
        <h3>
          {title}
          {count !== undefined && (
            <span className="admin-count">{count}</span>
          )}
        </h3>
        {onAdd && (
          <button className="btn-add-admin" onClick={onAdd}>
            <Plus size={16} /> {addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
