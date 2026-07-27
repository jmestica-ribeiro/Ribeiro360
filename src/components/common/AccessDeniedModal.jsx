import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert } from 'lucide-react';
import './CommonComponents.css';

/**
 * Modal de advertencia para cuando un usuario intenta acceder a un registro
 * (hallazgo, incidente) al que las reglas de visibilidad no le dan acceso.
 *
 * @param {string} entityLabel - ej. "este incidente" / "este hallazgo"
 * @param {() => void} onClose - se llama al cerrar; quien lo use debe redirigir
 */
export function AccessDeniedModal({ entityLabel = 'este registro', onClose }) {
  return createPortal(
    <div className="access-denied-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="access-denied-modal">
        <div className="access-denied-icon"><ShieldAlert size={28} /></div>
        <h4>Acceso restringido</h4>
        <p>
          No podés acceder a {entityLabel} porque las reglas de visibilidad lo limitan a sus participantes.
          Comunicate con el emisor para que te dé acceso.
        </p>
        <button className="access-denied-btn" onClick={onClose}>Entendido</button>
      </div>
    </div>,
    document.getElementById('portal-root')
  );
}
