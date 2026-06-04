import React from 'react';
import { ClipboardCheck } from 'lucide-react';

const CertEquiposTab = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <ClipboardCheck size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
      <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Cert. Equipos</h3>
      <p>Módulo en desarrollo. Aquí se gestionarán los vencimientos de certificaciones de equipos y sus responsables.</p>
    </div>
  );
};

export default CertEquiposTab;
