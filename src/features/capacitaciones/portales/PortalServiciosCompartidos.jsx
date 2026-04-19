import React from 'react';
import { Monitor, Server, ExternalLink } from 'lucide-react';
import '../Explorar.css';

const PortalServiciosCompartidos = () => (
  <div className="widgets-grid">
    <div className="widget-card" data-col="1">
      <div className="widget-header">
        <div className="widget-icon"><Monitor size={20} /></div>
        <span className="widget-title">Mesa de Ayuda Integral</span>
      </div>
      <p className="widget-desc">Generar y dar seguimiento a tickets de servicios.</p>
      <a href="#" className="widget-link">
        Ingresar a la Mesa <ExternalLink size={14} />
      </a>
    </div>

    <div className="widget-card" data-col="2">
      <div className="widget-header">
        <div className="widget-icon"><Server size={20} /></div>
        <span className="widget-title">Estado de los Procesos Centralizados</span>
      </div>
      <div className="widget-iframe-container" style={{ height: 250 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
          [Gráfico KPI / Métricas de Tickets Resueltos]
        </div>
      </div>
    </div>
  </div>
);

export default PortalServiciosCompartidos;
