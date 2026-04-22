import React from 'react';
import { Construction } from 'lucide-react';

const PortalOperaciones = () => (
  <div style={{
    padding: '100px 20px',
    textAlign: 'center',
    background: 'var(--bg-hover)',
    borderRadius: 'var(--border-radius)',
    border: '1px dashed var(--border-color)',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  }}>
    <Construction size={48} color="var(--text-muted)" />
    <h3 style={{ color: 'var(--text-main)', fontSize: 20 }}>Portal en construcción</h3>
    <p style={{ maxWidth: 400 }}>
      El portal de Operaciones &amp; Servicios está siendo desarrollado.
      Pronto vas a encontrar acá los recursos y herramientas de tu área.
    </p>
  </div>
);

export default PortalOperaciones;
