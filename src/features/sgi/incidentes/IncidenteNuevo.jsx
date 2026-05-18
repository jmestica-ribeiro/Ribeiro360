import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Zap, ChevronRight } from 'lucide-react';
import './IncidenteNuevo.css';

const OPCIONES = [
  {
    tipo: 'Incidente',
    icon: AlertTriangle,
    color: '#E71D36',
    colorRgb: '231,29,54',
    titulo: 'Incidente',
    tag: 'Investigación requerida',
    descripcion: 'Análisis de causa raíz, acciones correctivas y seguimiento de eficacia.',
    ejemplos: ['Accidente de trabajo', 'Exposición a agente de riesgo', 'Incidente ambiental grave'],
  },
  {
    tipo: 'Evento',
    icon: Zap,
    color: '#F59E0B',
    colorRgb: '245,158,11',
    titulo: 'Evento',
    tag: 'Registro para trazabilidad',
    descripcion: 'Situación puntual sin pipeline completo de investigación.',
    ejemplos: ['Rotura vehicular', 'Robo o hurto', 'Piquete de parabrisas'],
  },
];

export default function IncidenteNuevo() {
  const navigate = useNavigate();

  function handleSeleccion(tipo) {
    if (tipo === 'Incidente') {
      navigate('/sgi/incidentes/nuevo/form?tipo=Incidente');
    } else {
      navigate('/sgi/incidentes/nuevo/evento');
    }
  }

  return (
    <div className="inc-nuevo-wrapper">
      <div className="inc-nuevo-topbar">
        <button className="inc-nuevo-back" onClick={() => navigate('/sgi/incidentes')}>
          <ArrowLeft size={16} />
          Volver al listado
        </button>
        <div>
          <h1 className="inc-nuevo-title">¿Qué querés registrar?</h1>
          <p className="inc-nuevo-subtitle">Elegí el tipo para acceder al formulario correspondiente.</p>
        </div>
      </div>

      <div className="inc-nuevo-cards">
        {OPCIONES.map(({ tipo, icon: Icon, color, colorRgb, titulo, tag, descripcion, ejemplos }) => (
          <button
            key={tipo}
            className="inc-nuevo-card"
            style={{ '--card-color': color, '--card-color-rgb': colorRgb }}
            onClick={() => handleSeleccion(tipo)}
          >
            <div className="inc-nuevo-card-top">
              <div className="inc-nuevo-card-icon">
                <Icon size={34} strokeWidth={1.6} />
              </div>
              <span className="inc-nuevo-card-tag">{tag}</span>
            </div>
            <div className="inc-nuevo-card-body">
              <span className="inc-nuevo-card-titulo">{titulo}</span>
              <span className="inc-nuevo-card-desc">{descripcion}</span>
              <span className="inc-nuevo-card-ejemplos-label">Por ejemplo:</span>
              <ul className="inc-nuevo-card-ejemplos">
                {ejemplos.map(e => <li key={e}>{e}</li>)}
              </ul>
            </div>
            <div className="inc-nuevo-card-footer">
              <span>Registrar {titulo}</span>
              <ChevronRight size={16} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
