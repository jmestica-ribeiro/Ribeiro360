import React from 'react';
import { ExternalLink } from 'lucide-react';
import '../Explorar.css';

const PLATAFORMAS = [
  {
    label: 'Maquinaria',
    desc: 'Sistema de gestión y seguimiento de maquinaria Ribeiro.',
    url: 'https://maquinaria.ribeiro.ar',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
    emoji: '🏗️',
    tag: 'Gestión',
  },
  {
    label: 'Resultados',
    desc: 'Dashboard de resultados e indicadores de gestión.',
    url: 'https://resultados.ribeiro.ar',
    gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)',
    emoji: '📊',
    tag: 'Reportes',
  },
  {
    label: 'Cantera App',
    desc: 'Plataforma de gestión de cantera y materiales.',
    url: 'https://cantera-app-woad.vercel.app/',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    emoji: '⛏️',
    tag: 'Operaciones',
  },
  {
    label: 'Seguimiento de Flota',
    desc: 'Monitoreo y seguimiento en tiempo real de la flota de vehículos.',
    url: 'https://mia-reply-pdt-anne.trycloudflare.com/',
    gradient: 'linear-gradient(135deg, #4a1942 0%, #7c3aed 100%)',
    emoji: '🚛',
    tag: 'Flota',
  },
];

function PlatformCard({ label, desc, url, gradient, emoji, tag }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      >
        {/* Banner de color */}
        <div style={{ background: gradient, height: '150px', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '0 28px 18px' }}>
          <div style={{ fontSize: '64px', lineHeight: 1 }}>{emoji}</div>
          <span style={{
            position: 'absolute', top: '12px', right: '14px',
            background: 'rgba(255,255,255,0.2)', color: '#fff',
            fontSize: '12px', fontWeight: '700', padding: '4px 12px',
            borderRadius: '20px', letterSpacing: '0.5px',
          }}>{tag}</span>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: '800', fontSize: '20px', color: 'var(--text-main)' }}>{label}</span>
            <ExternalLink size={14} color="var(--text-muted)" />
          </div>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{desc}</p>
        </div>
      </div>
    </a>
  );
}

const PortalCIO = () => (
  <div className="portal-cio">
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
        {PLATAFORMAS.map((p, i) => (
          <PlatformCard key={i} {...p} />
        ))}
      </div>
    </div>
  </div>
);

export default PortalCIO;
