import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Monitor, RefreshCw } from 'lucide-react';
import '../Explorar.css';

// ----------------------------------------------------------------------
// PLATAFORMAS
// ----------------------------------------------------------------------
const PLATAFORMAS = [
  {
    label: 'Maquinaria',
    desc: 'Sistema de gestión y seguimiento de maquinaria Ribeiro.',
    url: 'https://maquinaria.ribeiro.ar',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
    emoji: '🏗️',
  },
  {
    label: 'Resultados',
    desc: 'Dashboard de resultados e indicadores de gestión.',
    url: 'https://resultados.ribeiro.ar',
    gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)',
    emoji: '📊',
  },
  {
    label: 'Cantera App',
    desc: 'Plataforma de gestión de cantera y materiales.',
    url: 'https://cantera-app-woad.vercel.app/',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    emoji: '⛏️',
  },
  {
    label: 'Seguimiento de Flota',
    desc: 'Monitoreo y seguimiento en tiempo real de la flota de vehículos.',
    url: 'https://mia-reply-pdt-anne.trycloudflare.com/',
    gradient: 'linear-gradient(135deg, #4a1942 0%, #7c3aed 100%)',
    emoji: '🚛',
  },
];

// ----------------------------------------------------------------------
// PREVIEW CARD — iframe lazy + fallback si el sitio bloquea embedding
// ----------------------------------------------------------------------
function PlatformCard({ label, desc, url, gradient, emoji }) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Carga diferida por IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '300px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Detectar si el iframe fue bloqueado (X-Frame-Options)
  const handleIframeLoad = () => {
    setLoaded(true);
    try {
      // Si se puede acceder al contentDocument, no fue bloqueado
      // Si fue bloqueado, el navegador lo deja vacío pero no lanza error en onLoad
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.body && doc.body.innerHTML === '') {
        setIframeError(true);
      }
    } catch {
      setIframeError(true);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ background: gradient, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '5px 8px', fontSize: '16px' }}>
            {emoji}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '14px' }}>{label}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginTop: '1px' }}>{desc}</div>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            padding: '7px 14px', borderRadius: '8px',
            fontWeight: '700', fontSize: '12px', textDecoration: 'none',
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
        >
          <ExternalLink size={13} /> Abrir
        </a>
      </div>

      {/* Preview area */}
      <div
        ref={containerRef}
        style={{ position: 'relative', height: '340px', background: '#f8faff', overflow: 'hidden' }}
      >
        {!visible && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: '#9ca3af' }}>
            <Monitor size={28} />
            <span style={{ fontSize: '12px' }}>Cargando vista previa…</span>
          </div>
        )}

        {visible && !iframeError && (
          <>
            {!loaded && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: '#9ca3af', zIndex: 1 }}>
                <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '12px' }}>Conectando con {label}…</span>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={url}
              title={label}
              onLoad={handleIframeLoad}
              onError={() => setIframeError(true)}
              style={{
                width: '170%',
                height: '170%',
                border: 'none',
                transformOrigin: 'top left',
                transform: 'scale(0.588)',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.3s',
                pointerEvents: 'none',
              }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </>
        )}

        {visible && iframeError && (
          <FallbackPreview label={label} url={url} emoji={emoji} gradient={gradient} />
        )}
      </div>
    </div>
  );
}

// Fallback cuando el sitio bloquea el iframe
function FallbackPreview({ label, url, emoji, gradient }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ width: 60, height: 60, borderRadius: '16px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
        {emoji}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px' }}>
          Este sitio no permite vista previa embebida.
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--primary-color)', color: '#1a1a1a',
          padding: '10px 20px', borderRadius: '10px',
          fontWeight: '700', fontSize: '13px', textDecoration: 'none',
        }}
      >
        <ExternalLink size={14} /> Abrir en nueva pestaña
      </a>
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------
const PortalCIO = () => (
  <div className="portal-cio">
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '24px', paddingTop: '24px' }}>
        {PLATAFORMAS.map((p, i) => (
          <PlatformCard key={i} {...p} />
        ))}
      </div>
    </div>
  </div>
);

export default PortalCIO;
