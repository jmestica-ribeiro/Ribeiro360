import React from 'react';
import { Monitor, Shield, Database, Cpu, ExternalLink, Wrench } from 'lucide-react';
import '../Explorar.css';

// ----------------------------------------------------------------------
// ACCESOS RÁPIDOS TI
// ----------------------------------------------------------------------
const ACCESOS = [
  {
    label: 'Mesa de Ayuda',
    desc: 'Reportá incidentes técnicos y hacé seguimiento de tus tickets.',
    emoji: '🎫',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
    url: null,
  },
  {
    label: 'Portal de TI',
    desc: 'Accedé al portal interno de Tecnología e Infraestructura.',
    emoji: '🖥️',
    gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)',
    url: null,
  },
  {
    label: 'Gestión de Accesos',
    desc: 'Solicitudes de altas, bajas y modificaciones de usuarios.',
    emoji: '🔑',
    gradient: 'linear-gradient(135deg, #4a1942 0%, #7c3aed 100%)',
    url: null,
  },
  {
    label: 'Inventario de Equipos',
    desc: 'Consulta y seguimiento del inventario de hardware de la empresa.',
    emoji: '💻',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    url: null,
  },
];

// ----------------------------------------------------------------------
// INDICADORES / ÁREAS
// ----------------------------------------------------------------------
const AREAS = [
  {
    icon: <Monitor size={22} color="#3b82f6" />,
    bg: 'rgba(59,130,246,0.1)',
    titulo: 'Infraestructura',
    desc: 'Servidores, redes, conectividad y disponibilidad de sistemas.',
  },
  {
    icon: <Shield size={22} color="#10b981" />,
    bg: 'rgba(16,185,129,0.1)',
    titulo: 'Ciberseguridad',
    desc: 'Gestión de riesgos digitales, accesos y políticas de seguridad.',
  },
  {
    icon: <Database size={22} color="#f59e0b" />,
    bg: 'rgba(245,158,11,0.1)',
    titulo: 'Datos & Analytics',
    desc: 'Gobierno del dato, reportería y herramientas de inteligencia de negocio.',
  },
  {
    icon: <Cpu size={22} color="#8b5cf6" />,
    bg: 'rgba(139,92,246,0.1)',
    titulo: 'Desarrollo & Software',
    desc: 'Proyectos de desarrollo interno, integraciones y mantenimiento de sistemas.',
  },
];

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------
const PortalCIO = () => (
  <div className="portal-cio">

    {/* ÁREAS DE TI */}
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', marginBottom: '24px' }}>
        <Cpu size={22} color="var(--primary-color)" />
        <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Áreas de Tecnología</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {AREAS.map((area, i) => (
          <div key={i} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: area.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {area.icon}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>{area.titulo}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{area.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ACCESOS RÁPIDOS */}
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Wrench size={22} color="var(--primary-color)" />
        <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Herramientas y Servicios</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {ACCESOS.map((item, i) => (
          <div key={i} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ background: item.gradient, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
                <Monitor size={16} color="#fff" />
              </div>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>{item.label}</div>
            </div>
            <div style={{ flex: 1, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 26 }}>{item.emoji}</span>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 220 }}>{item.desc}</div>
              </div>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-color)', color: '#1a1a1a', padding: '11px 22px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <ExternalLink size={15} /> Abrir
                </a>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-hover)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '13px' }}>
                  Próximamente
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>

  </div>
);

export default PortalCIO;
