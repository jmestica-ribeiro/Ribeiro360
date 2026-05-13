import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, Wrench, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { fetchSectores, fetchAllLinks } from '../../services/herramientasService';
import { LoadingSpinner, EmptyState } from '../../components/common';
import './HerramientasHub.css';

const SECTOR_COLORS = [
  { bg: '#1e3a5f', accent: '#3b82f6' },
  { bg: '#134e4a', accent: '#10b981' },
  { bg: '#4a1942', accent: '#a855f7' },
  { bg: '#78350f', accent: '#f59e0b' },
  { bg: '#1e1b4b', accent: '#6366f1' },
  { bg: '#0c4a6e', accent: '#0ea5e9' },
];

const DynamicIcon = ({ name, size = 16, color }) => {
  const Icon = typeof LucideIcons[name] === 'function' ? LucideIcons[name] : Wrench;
  return <Icon size={size} color={color} />;
};

const HerramientasHub = () => {
  const [sectores, setSectores] = useState([]);
  const [links, setLinks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [activeSector, setActiveSector] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: l }] = await Promise.all([fetchSectores(), fetchAllLinks()]);
      const activeSectores = s.filter(x => x.activo);
      setSectores(activeSectores);
      setLinks(l.filter(x => x.activo));
      if (activeSectores.length > 0) setActiveSector(activeSectores[0].id);
      setLoading(false);
    })();
  }, []);

  const q = search.trim().toLowerCase();

  const visibleSectores = sectores.map(s => ({
    ...s,
    linksFiltered: links
      .filter(l => l.sector_id === s.id)
      .filter(l => !q || l.nombre.toLowerCase().includes(q) || (l.descripcion ?? '').toLowerCase().includes(q)),
  })).filter(s => !q || s.linksFiltered.length > 0 || s.nombre.toLowerCase().includes(q));

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <LoadingSpinner size={32} />
    </div>
  );

  const totalLinks = links.length;
  const totalSectores = sectores.length;

  return (
    <div className="herramientas-hub">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="herramientas-hero">
        <div className="herramientas-hero-bg" />
        <div className="herramientas-hero-content">
          <div className="herramientas-hero-left">
            <div className="herramientas-hero-icon">
              <Wrench size={22} color="#111827" />
            </div>
            <div>
              <h1>Herramientas</h1>
              <p>Accesos rápidos a sistemas y recursos internos</p>
            </div>
          </div>
          <div className="herramientas-hero-right">
            <div className="herramientas-hero-stat">
              <span className="herramientas-hero-stat-val">{totalLinks}</span>
              <span className="herramientas-hero-stat-lbl">recursos</span>
            </div>
            <div className="herramientas-hero-stat-divider" />
            <div className="herramientas-hero-stat">
              <span className="herramientas-hero-stat-val">{totalSectores}</span>
              <span className="herramientas-hero-stat-lbl">sectores</span>
            </div>
            <div className="herramientas-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {visibleSectores.length === 0 ? (
        <EmptyState icon={<Wrench size={32} />} message="Todavía no hay herramientas configuradas." />
      ) : (
        <div className="herramientas-layout">

          {/* ── Sidebar sectores ──────────────────────────────────────────── */}
          <aside className="herramientas-sidebar">
            {visibleSectores.map((sector, i) => {
              const col = SECTOR_COLORS[i % SECTOR_COLORS.length];
              const isActive = !q && activeSector === sector.id;
              return (
                <button
                  key={sector.id}
                  className={`herramientas-sidebar-item${isActive ? ' active' : ''}`}
                  onClick={() => { setActiveSector(sector.id); setSearch(''); }}
                  style={isActive ? { '--sector-accent': col.accent } : {}}
                >
                  <div
                    className="herramientas-sidebar-icon"
                    style={{ background: isActive ? col.accent + '22' : undefined, color: isActive ? col.accent : undefined }}
                  >
                    <DynamicIcon name={sector.icono} size={15} color={isActive ? col.accent : 'var(--text-muted)'} />
                  </div>
                  <span className="herramientas-sidebar-label">{sector.nombre}</span>
                  <span className="herramientas-sidebar-count">
                    {links.filter(l => l.sector_id === sector.id).length}
                  </span>
                  {isActive && <ChevronRight size={13} style={{ marginLeft: 'auto', color: col.accent, flexShrink: 0 }} />}
                </button>
              );
            })}
          </aside>

          {/* ── Panel de links ─────────────────────────────────────────────── */}
          <div className="herramientas-panel">
            {(q ? visibleSectores : visibleSectores.filter(s => s.id === activeSector)).map((sector, sectorIdx) => {
              const col = SECTOR_COLORS[sectores.findIndex(s => s.id === sector.id) % SECTOR_COLORS.length];
              return (
                <div key={sector.id}>
                  {q && (
                    <div className="herramientas-panel-sectorlabel" style={{ color: col.accent }}>
                      <DynamicIcon name={sector.icono} size={13} color={col.accent} />
                      {sector.nombre}
                    </div>
                  )}
                  {sector.linksFiltered.length === 0 ? (
                    <p className="herramientas-panel-empty">Sin herramientas en este sector.</p>
                  ) : (
                    <div className="herramientas-links-grid">
                      {sector.linksFiltered.map((link, linkIdx) => {
                        return (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="herramienta-link-card"
                            style={{ '--card-accent': col.accent, '--card-bg': col.bg }}
                          >
                            <div className="herramienta-link-card-glow" />
                            <div className="herramienta-link-top">
                              <div className="herramienta-link-icon">
                                <DynamicIcon name={link.icono} size={22} color={col.accent} />
                              </div>
                              <div className="herramienta-link-badge">
                                <ExternalLink size={11} />
                                Abrir
                              </div>
                            </div>
                            <div className="herramienta-link-body">
                              <span className="herramienta-link-name">{link.nombre}</span>
                              {link.descripcion && (
                                <span className="herramienta-link-desc">{link.descripcion}</span>
                              )}
                            </div>
                            <div className="herramienta-link-footer">
                              <span className="herramienta-link-sector-tag">{sector.nombre}</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HerramientasHub;
