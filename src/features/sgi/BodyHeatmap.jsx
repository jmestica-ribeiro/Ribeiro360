import React, { useState } from 'react';

function getHeat(value, max) {
  if (!value || !max) return { fill: 'var(--bg-hover)', stroke: 'var(--border-color)' };
  const r = value / max;
  if (r < 0.2) return { fill: '#FEE2E2', stroke: '#FECACA' };
  if (r < 0.4) return { fill: '#FCA5A5', stroke: '#F87171' };
  if (r < 0.6) return { fill: '#F87171', stroke: '#EF4444' };
  if (r < 0.8) return { fill: '#DC2626', stroke: '#B91C1C' };
  return { fill: '#7F1D1D', stroke: '#450A0A' };
}

const LEGEND = [
  { label: 'Sin casos', fill: 'var(--bg-hover)', stroke: 'var(--border-color)' },
  { label: 'Bajo',      fill: '#FEE2E2',         stroke: '#FECACA' },
  { label: 'Medio',     fill: '#FCA5A5',         stroke: '#F87171' },
  { label: 'Alto',      fill: '#DC2626',         stroke: '#B91C1C' },
  { label: 'Crítico',   fill: '#7F1D1D',         stroke: '#450A0A' },
];

export default function BodyHeatmap({ data = {} }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...Object.values(data).filter(v => typeof v === 'number'), 1);

  const z = (name) => {
    const { fill, stroke } = getHeat(data[name] || 0, max);
    return {
      fill,
      stroke,
      strokeWidth: 1.5,
      strokeLinejoin: 'round',
      style: {
        cursor: data[name] ? 'pointer' : 'default',
        transition: 'filter 0.15s, opacity 0.15s',
        filter:  hovered === name ? 'brightness(0.82)' : undefined,
        opacity: hovered && hovered !== name ? 0.55 : 1,
      },
      onMouseEnter: () => setHovered(name),
      onMouseLeave: () => setHovered(null),
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

      {/* Tooltip */}
      <div style={{ minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
        {hovered ? (
          <span>
            <strong style={{ color: (data[hovered] || 0) > 0 ? '#dc2626' : 'var(--text-muted)' }}>{hovered}</strong>
            {' — '}
            {(data[hovered] || 0) > 0
              ? <><strong>{data[hovered]}</strong> caso{data[hovered] !== 1 ? 's' : ''}</>
              : <span style={{ color: 'var(--text-muted)' }}>sin casos</span>
            }
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Pasá el cursor sobre una zona</span>
        )}
      </div>

      {/* ── SVG Body — silueta compacta, brazos al costado ── */}
      <svg viewBox="0 0 160 430" width={220} style={{ display: 'block', overflow: 'visible' }}>

        {/* HEAD */}
        <ellipse cx="80" cy="28" rx="22" ry="24" {...z('Cabeza')} />

        {/* EYES / FACE — overlay dentro de la cabeza */}
        <ellipse cx="80" cy="23" rx="15" ry="13" {...z('Ojos / Cara')} strokeWidth={1} />

        {/* NECK */}
        <rect x="72" y="50" width="16" height="18" rx="5" {...z('Cuello')} />

        {/* LEFT SHOULDER cap */}
        <ellipse cx="42" cy="74" rx="14" ry="10" {...z('Hombro')} />
        {/* RIGHT SHOULDER cap */}
        <ellipse cx="118" cy="74" rx="14" ry="10" {...z('Hombro')} />

        {/* CHEST — torso superior */}
        <rect x="52" y="66" width="56" height="56" rx="10" {...z('Tórax / Pecho')} />

        {/* SPINE stripe — solapada sobre tórax + abdomen */}
        <rect x="70" y="66" width="20" height="106" rx="6" {...z('Espalda / Columna')} strokeWidth={1} />

        {/* ABDOMEN */}
        <rect x="52" y="122" width="56" height="52" rx="10" {...z('Abdomen')} />

        {/* LEFT HIP */}
        <path d="M 52 174 L 44 184 L 46 208 L 70 208 L 70 174 Z" rx="8" {...z('Cadera')} />
        {/* RIGHT HIP */}
        <path d="M 108 174 L 116 184 L 114 208 L 90 208 L 90 174 Z" rx="8" {...z('Cadera')} />

        {/* LEFT UPPER ARM */}
        <rect x="20" y="72" width="18" height="60" rx="9" {...z('Brazo')} />
        {/* RIGHT UPPER ARM */}
        <rect x="122" y="72" width="18" height="60" rx="9" {...z('Brazo')} />

        {/* LEFT ELBOW */}
        <ellipse cx="29" cy="135" rx="10" ry="9" {...z('Codo')} />
        {/* RIGHT ELBOW */}
        <ellipse cx="131" cy="135" rx="10" ry="9" {...z('Codo')} />

        {/* LEFT FOREARM */}
        <rect x="20" y="144" width="18" height="52" rx="9" {...z('Antebrazo')} />
        {/* RIGHT FOREARM */}
        <rect x="122" y="144" width="18" height="52" rx="9" {...z('Antebrazo')} />

        {/* LEFT WRIST */}
        <ellipse cx="29" cy="199" rx="10" ry="7" {...z('Muñeca')} />
        {/* RIGHT WRIST */}
        <ellipse cx="131" cy="199" rx="10" ry="7" {...z('Muñeca')} />

        {/* LEFT HAND */}
        <rect x="20" y="206" width="18" height="28" rx="7" {...z('Mano / Dedos')} />
        {/* RIGHT HAND */}
        <rect x="122" y="206" width="18" height="28" rx="7" {...z('Mano / Dedos')} />

        {/* LEFT THIGH */}
        <rect x="52" y="208" width="24" height="72" rx="11" {...z('Muslo / Pierna')} />
        {/* RIGHT THIGH */}
        <rect x="84" y="208" width="24" height="72" rx="11" {...z('Muslo / Pierna')} />

        {/* LEFT KNEE */}
        <ellipse cx="64" cy="283" rx="13" ry="11" {...z('Rodilla')} />
        {/* RIGHT KNEE */}
        <ellipse cx="96" cy="283" rx="13" ry="11" {...z('Rodilla')} />

        {/* LEFT LOWER LEG */}
        <rect x="52" y="294" width="24" height="72" rx="11" {...z('Muslo / Pierna')} />
        {/* RIGHT LOWER LEG */}
        <rect x="84" y="294" width="24" height="72" rx="11" {...z('Muslo / Pierna')} />

        {/* LEFT ANKLE */}
        <ellipse cx="64" cy="369" rx="12" ry="9" {...z('Tobillo')} />
        {/* RIGHT ANKLE */}
        <ellipse cx="96" cy="369" rx="12" ry="9" {...z('Tobillo')} />

        {/* LEFT FOOT */}
        <rect x="50" y="378" width="30" height="18" rx="8" {...z('Pie / Dedos')} />
        {/* RIGHT FOOT */}
        <rect x="80" y="378" width="30" height="18" rx="8" {...z('Pie / Dedos')} />

      </svg>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ width: 13, height: 13, borderRadius: 3, display: 'inline-block', background: l.fill, border: `1.5px solid ${l.stroke}`, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>

      {(data['Múltiples'] || 0) > 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          <strong style={{ color: 'var(--text-main)' }}>{data['Múltiples']}</strong> incidente{data['Múltiples'] !== 1 ? 's' : ''} con <em>múltiples zonas</em>
        </p>
      )}
    </div>
  );
}
