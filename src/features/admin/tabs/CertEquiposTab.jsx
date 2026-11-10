import React from 'react';
import { ClipboardCheck } from 'lucide-react';

const CertEquiposTab = () => {
  return (
    <div className="adm-panel">
      <div className="admin-list-header">
        <h3>Cert. Equipos</h3>
      </div>
      <div className="adm-card adm-placeholder">
        <span className="adm-row-icon adm-placeholder-icon"><ClipboardCheck size={22} strokeWidth={1.5} /></span>
        <span className="adm-badge neutral">En desarrollo</span>
        <p>Aquí se gestionarán los vencimientos de certificaciones de equipos y sus responsables.</p>
      </div>
    </div>
  );
};

export default CertEquiposTab;
