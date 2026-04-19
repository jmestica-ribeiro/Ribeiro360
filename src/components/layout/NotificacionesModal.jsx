import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, BookOpen, FileText, BellOff, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './NotificacionesModal.css';

const TIPO_CONFIG = {
  evento:      { icon: Calendar,      label: 'Evento',        tagColor: '#F59E0B', getRoute: ()   => '/eventos'              },
  capacitacion:{ icon: BookOpen,      label: 'Capacitación',  tagColor: '#10B981', getRoute: (id) => `/cursos/${id}`          },
  documento:   { icon: FileText,      label: 'SGI',           tagColor: '#3B82F6', getRoute: (id) => `/sgi/documento/${id}`   },
  hallazgo:    { icon: ClipboardList, label: 'No Conformidad',tagColor: '#E71D36', getRoute: (id) => `/sgi/nc/${id}`          },
};

const NotifItem = ({ item, onClick }) => {
  const config = TIPO_CONFIG[item.tipo];
  const Icon = config?.icon || BellOff;

  return (
    <li
      className={`notif-item${item.leida ? ' notif-item--leida' : ''}`}
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(item)}
    >
      {!item.leida && <span className="notif-dot" />}
      <div className="notif-icon" style={{ background: `${item.color}22`, color: item.color }}>
        <Icon size={18} />
      </div>
      <div className="notif-info">
        <div className="notif-meta">
          <span
            className="notif-tag"
            style={{ background: `${config.tagColor}20`, color: config.tagColor }}
          >
            {config.label}
          </span>
          {item.fecha && (
            <span className="notif-date">
              {new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
            </span>
          )}
        </div>
        <span className="notif-title">{item.titulo}</span>
        {item.subtitulo && item.subtitulo !== config.label && (
          <span className="notif-subtitle">{item.subtitulo}</span>
        )}
      </div>
    </li>
  );
};

const NotificacionesModal = ({ notificaciones, isLoading, onClose }) => {
  const ref = useRef(null);
  const navigate = useNavigate();

  const nuevas = notificaciones.filter(n => !n.leida);
  const leidas = notificaciones.filter(n => n.leida);

  // Bloquear scroll de fondo mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleItemClick = (item) => {
    const config = TIPO_CONFIG[item.tipo];
    const route = config?.getRoute(item.itemId);
    if (route) { navigate(route); onClose(); }
  };

  return createPortal(
    <div className="notif-overlay">
      <div className="notif-modal" ref={ref} style={{ position: 'fixed', top: 72, right: 48 }}>
        <div className="notif-header">
          <h3>Notificaciones</h3>
          <button className="notif-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="notif-body">
          {isLoading && (
            <div className="notif-empty"><div className="notif-spinner" /></div>
          )}

          {!isLoading && notificaciones.length === 0 && (
            <div className="notif-empty">
              <BellOff size={36} strokeWidth={1.5} />
              <p>Todo al día</p>
              <span>No hay novedades en los últimos 30 días</span>
            </div>
          )}

          {!isLoading && notificaciones.length > 0 && (
            <ul className="notif-list">
              {nuevas.length > 0 && (
                <>
                  <li className="notif-section-label">Nuevas</li>
                  {nuevas.map(item => (
                    <NotifItem key={item.id} item={item} onClick={handleItemClick} />
                  ))}
                </>
              )}
              {leidas.length > 0 && (
                <>
                  <li className="notif-section-label">{nuevas.length > 0 ? 'Anteriores' : 'Últimos 30 días'}</li>
                  {leidas.map(item => (
                    <NotifItem key={item.id} item={item} onClick={handleItemClick} />
                  ))}
                </>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.getElementById('portal-root')
  );
};

export default NotificacionesModal;
