import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

export default function IncidenteEventoWIP() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: 'calc(100vh - 80px)',
      gap: 20,
      textAlign: 'center',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'rgba(245,158,11,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#F59E0B',
      }}>
        <Construction size={34} strokeWidth={1.6} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Sección en desarrollo
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 340 }}>
          El registro de Eventos estará disponible próximamente.
        </p>
      </div>
      <button
        onClick={() => navigate('/sgi/incidentes/nuevo')}
        style={{
          marginTop: 8,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '0.875rem',
        }}
      >
        <ArrowLeft size={15} />
        Volver
      </button>
    </div>
  );
}
