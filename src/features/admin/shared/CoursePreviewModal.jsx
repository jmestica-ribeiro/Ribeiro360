import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, BookOpen, ChevronDown } from 'lucide-react';
import { parseBlocks } from '../../../lib/blockUtils';
import '../../capacitaciones/CoursePlayer.css';

const toEmbedUrl = (url) => {
  if (!url) return url;
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com')) return url;
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = url.match(/youtube\.com\/watch\?.*v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
};

const renderBlocks = (contenido) => {
  const blocks = parseBlocks(contenido);
  return blocks.map((block, i) => {
    switch (block.tipo) {
      case 'texto':
        return <div key={i} className="player-text-block" dangerouslySetInnerHTML={{ __html: block.contenido }} />;
      case 'banner':
        return (
          <div key={i} className="player-banner-block" style={{ backgroundColor: block.metadata?.bg_color, color: block.metadata?.text_color }}>
            {block.contenido}
          </div>
        );
      case 'imagen':
        return block.contenido ? <img key={i} src={block.contenido} className="player-img-block" alt="" /> : null;
      case 'video':
        return block.contenido ? (
          <div key={i} className="player-video-block">
            <iframe src={toEmbedUrl(block.contenido)} frameBorder="0" allowFullScreen title="video" />
          </div>
        ) : null;
      case 'separador': {
        const titulo = block.contenido?.trim();
        return (
          <div key={i} className="player-separator-block">
            {titulo && <span className="player-separator-label">{titulo}</span>}
          </div>
        );
      }
      case 'callout': {
        const nivel = block.metadata?.nivel || 'info';
        return <div key={i} className={`player-callout-block player-callout-${nivel}`}>{block.contenido}</div>;
      }
      case 'acordeon': {
        return <AcordeonPreview key={i} items={JSON.parse(block.contenido || '[]')} />;
      }
      case 'cards': {
        const items = JSON.parse(block.contenido || '[]');
        return (
          <div key={i} className="player-cards-grid">
            {items.map((item, idx) => (
              <div key={idx} className="player-item-card">
                <h4>{item.label}</h4>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        );
      }
      case 'archivo': {
        const url = block.contenido;
        if (!url) return null;
        const nombre = block.metadata?.nombre || 'Archivo';
        const ext = (block.metadata?.ext || url.split('.').pop()).toLowerCase();
        const officeExts = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'];
        if (ext === 'pdf') {
          return (
            <div key={i} className="player-file-embed-wrapper">
              <div className="player-file-embed-label"><FileText size={16} /> {nombre}</div>
              <iframe src={url} className="player-file-embed" title={nombre} />
            </div>
          );
        }
        if (officeExts.includes(ext)) {
          return (
            <div key={i} className="player-file-embed-wrapper">
              <div className="player-file-embed-label"><FileText size={16} /> {nombre}</div>
              <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} className="player-file-embed" title={nombre} frameBorder="0" />
            </div>
          );
        }
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="player-file-download">
            <FileText size={18} /> {nombre}
          </a>
        );
      }
      default:
        return null;
    }
  });
};

const AcordeonPreview = ({ items }) => {
  const [open, setOpen] = useState(null);
  return (
    <div className="player-acordeon-block">
      {items.map((item, idx) => (
        <div key={idx} className={`acordeon-item ${open === idx ? 'open' : ''}`}>
          <button className="acordeon-header" onClick={() => setOpen(open === idx ? null : idx)}>
            <span>{item.pregunta}</span>
            <ChevronDown size={16} style={{ transform: open === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
          </button>
          {open === idx && <div className="acordeon-body">{item.respuesta}</div>}
        </div>
      ))}
    </div>
  );
};

const CoursePreviewModal = ({ course, modules, onClose }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.history.pushState({ preview: true }, '');
    const handlePop = () => onClose();
    window.addEventListener('keydown', handleKey);
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('popstate', handlePop);
    };
  }, [onClose]);
  const activeModule = modules[activeIdx];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'stretch',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', width: '100%',
        background: '#fcfcfc', overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', background: '#fff',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={18} style={{ color: 'var(--primary-color)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{course.titulo || 'Sin título'}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, background: '#fff3cd', color: '#92400e',
              border: '1px solid #fde68a', borderRadius: 20, padding: '2px 10px',
            }}>VISTA PREVIA</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}
          >
            <X size={18} /> Cerrar preview
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <aside style={{
            width: 240, flexShrink: 0, borderRight: '1px solid var(--border-color)',
            background: '#fff', overflowY: 'auto', padding: '16px 0',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', padding: '0 20px 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Módulos
            </div>
            {modules.length === 0 ? (
              <p style={{ fontSize: 13, color: '#bbb', padding: '0 20px' }}>Sin módulos</p>
            ) : modules.map((mod, idx) => (
              <button
                key={mod.id}
                onClick={() => setActiveIdx(idx)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 20px',
                  background: activeIdx === idx ? 'var(--primary-color)' : 'none',
                  color: activeIdx === idx ? '#000' : 'var(--text-main)',
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeIdx === idx ? 700 : 500,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.6, display: 'block' }}>Módulo {idx + 1}</span>
                <span style={{ display: 'block' }}>{mod.titulo}</span>
                {mod.descripcion && <span style={{ fontSize: 11, opacity: 0.7, display: 'block', fontWeight: 400, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mod.descripcion}</span>}
              </button>
            ))}
          </aside>

          {/* Content */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '32px 48px', maxWidth: 860 }}>
            {activeModule ? (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, color: 'var(--text-main)' }}>
                  {activeModule.titulo}
                </h2>
                <div className="module-render-area">
                  {renderBlocks(activeModule.contenido)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                    disabled={activeIdx === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: activeIdx === 0 ? 'not-allowed' : 'pointer', opacity: activeIdx === 0 ? 0.4 : 1 }}
                  >
                    <ChevronLeft size={16} /> Anterior
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>
                    {activeIdx + 1} / {modules.length}
                  </span>
                  <button
                    onClick={() => setActiveIdx(i => Math.min(modules.length - 1, i + 1))}
                    disabled={activeIdx === modules.length - 1}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary-color)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: activeIdx === modules.length - 1 ? 'not-allowed' : 'pointer', opacity: activeIdx === modules.length - 1 ? 0.4 : 1 }}
                  >
                    Siguiente <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#bbb', paddingTop: 80 }}>
                <BookOpen size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p style={{ fontSize: 15 }}>Este curso no tiene módulos aún.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CoursePreviewModal;
