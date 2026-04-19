import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-icon">
          <AlertCircle size={64} />
          <div className="icon-pulse"></div>
        </div>
        <h1>404</h1>
        <h2>Página no encontrada</h2>
        <p>
          Lo sentimos, la sección que estás buscando no existe o ha sido movida.
          ¿Querés volver al inicio?
        </p>
        <button className="btn-home" onClick={() => navigate('/')}>
          <Home size={18} />
          <span>Volver al Inicio</span>
        </button>
      </div>
    </div>
  );
}
