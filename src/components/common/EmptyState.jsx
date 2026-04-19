import React from 'react';
import './CommonComponents.css';

/**
 * Estado vacío estándar para listas en el panel de admin.
 *
 * @param {React.ReactNode} icon - ícono a mostrar (componente Lucide)
 * @param {string} message - mensaje a mostrar
 * @param {React.ReactNode} [action] - botón o acción opcional
 */
export function EmptyState({ icon, message, action }) {
  return (
    <div className="admin-empty">
      {icon && <span className="admin-empty-icon">{icon}</span>}
      <p>{message}</p>
      {action && <div className="admin-empty-action">{action}</div>}
    </div>
  );
}
