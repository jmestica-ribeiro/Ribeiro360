import React from 'react';
import { ExternalLink, KeyRound } from 'lucide-react';
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
  {
    label: 'Avances MIE · Saneamiento',
    desc: 'Página online de seguimiento de avances del MIE en Saneamiento.',
    url: 'https://infectious-demand-mood-generations.trycloudflare.com',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    emoji: '💧',
    tag: 'Obras',
    aviso: 'Solicitá tu código de acceso',
  },
  {
    label: 'Análisis de Flota + Combustible',
    desc: 'Análisis de la flota y consumo de combustible.',
    url: 'https://studied-nelson-relatively-following.trycloudflare.com/',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
    emoji: '⛽',
    tag: 'Flota',
    aviso: 'Solicitá tu código de acceso',
  },
  {
    label: 'Cámaras',
    desc: 'Visualización de cámaras.',
    url: 'https://landscape-headquarters-trend-directed.trycloudflare.com/',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
    emoji: '📹',
    tag: 'Seguridad',
    aviso: 'Solicitá tu código de acceso',
  },
];

const TABLEROS_PYMO = [
  {
    label: 'Tablero KPIs',
    desc: 'Indicadores clave de desempeño del CIO.',
    url: 'https://kpi-cio.muletdamian.workers.dev/',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
    emoji: '📈',
    tag: 'KPIs',
  },
  {
    label: 'Tablero Historial de tareas',
    desc: 'Historial y seguimiento de tareas del CIO.',
    url: 'https://tareas-cio.muletdamian.workers.dev/',
    gradient: 'linear-gradient(135deg, #3f3f46 0%, #52525b 100%)',
    emoji: '🗂️',
    tag: 'Tareas',
  },
];

// Cada sección es una "carpeta" con subtítulo. Para sumar otra, agregar un objeto acá.
const SECCIONES = [
  { titulo: 'Plataformas', items: PLATAFORMAS },
  { titulo: 'Tableros Pymo', items: TABLEROS_PYMO },
];

function PlatformCard({ label, desc, url, gradient, emoji, tag, aviso }) {
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
          {aviso && (
            <div role="note" style={{
              marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', borderRadius: '10px',
              background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
              color: 'var(--warning)', fontSize: '13px', fontWeight: '600',
            }}>
              <KeyRound size={14} aria-hidden="true" /> {aviso}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

const PortalCIO = () => (
  <div className="portal-cio">
    {SECCIONES.map(sec => (
      <section key={sec.titulo} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>{sec.titulo}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
          {sec.items.map(p => (
            <PlatformCard key={p.url} {...p} />
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default PortalCIO;
