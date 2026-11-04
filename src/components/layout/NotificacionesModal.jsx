import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, BookOpen, FileText, BellOff, ClipboardList, CheckCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './NotificacionesModal.css';

const TIPO_CONFIG = {
  evento:       { icon: Calendar,      label: 'Evento',         getRoute: ()   => '/eventos' },
  capacitacion: { icon: BookOpen,      label: 'Capacitación',   getRoute: (id) => `/cursos/${id}` },
  documento:    { icon: FileText,      label: 'SGI',            getRoute: (id) => `/sgi/documento/${id}` },
  hallazgo:     { icon: ClipboardList, label: 'No Conformidad', getRoute: (id) => `/sgi/nc/${id}` },
};

const DISMISS_KEY = 'notif-dismissed';
const loadDismissed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]')); } catch { return new Set(); }
};

const toDate = (v) => (typeof v === 'string' && v.length === 10 ? new Date(`${v}T00:00:00`) : new Date(v));
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const relativeTime = (v) => {
  if (!v) return '';
  const d = toDate(v);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24 && startOfDay(d) === startOfDay(new Date())) return `hace ${h} h`;
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

const groupLabel = (v) => {
  const days = Math.round((startOfDay(new Date()) - startOfDay(toDate(v))) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return 'Anteriores';
};

const NotifItem = ({ item, onOpen, onDismiss }) => {
  const config = TIPO_CONFIG[item.tipo];
  const Icon = config?.icon || BellOff;
  const showSub = item.subtitulo && item.subtitulo !== config?.label;

  return (
    <li className={`notif-item${item.leida ? ' notif-item--leida' : ''}`}>
      <button type="button" className="notif-main" onClick={() => onOpen(item)}>
        <span className="notif-icon" style={{ background: `${item.color}22`, color: item.color }}>
          <Icon size={18} />
        </span>
        <span className="notif-info">
          <span className="notif-meta">
            <span className={`notif-tag notif-tag--${item.tipo}`}>{config?.label}</span>
            <span className="notif-date">{relativeTime(item.created_at)}</span>
          </span>
          <span className="notif-title">{item.titulo}</span>
          {showSub && <span className="notif-subtitle">{item.subtitulo}</span>}
        </span>
        {!item.leida && <span className="notif-dot" aria-label="No leída" />}
      </button>
      <button
        type="button"
        className="notif-dismiss"
        aria-label={`Descartar notificación: ${item.titulo}`}
        onClick={() => onDismiss(item.id)}
      >
        <X size={14} />
      </button>
    </li>
  );
};

const NotificacionesModal = ({ notificaciones, isLoading, error, onRetry, onMarkAllRead, anchorRef, onClose }) => {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [dismissed, setDismissed] = useState(loadDismissed);
  const [pos, setPos] = useState(null);

  const items = useMemo(() => notificaciones.filter(n => !dismissed.has(n.id)), [notificaciones, dismissed]);
  const unread = items.filter(n => !n.leida).length;

  const groups = useMemo(() => {
    const order = ['Hoy', 'Ayer', 'Anteriores'];
    const map = { Hoy: [], Ayer: [], Anteriores: [] };
    items.forEach(n => map[groupLabel(n.created_at)].push(n));
    return order.filter(k => map[k].length).map(k => ({ label: k, list: map[k] }));
  }, [items]);

  // Anclar al botón en desktop
  useEffect(() => {
    const place = () => {
      const r = anchorRef?.current?.getBoundingClientRect();
      if (!r || window.innerWidth <= 640) { setPos(null); return; }
      setPos({ top: r.bottom + 8, right: Math.max(16, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchorRef]);

  // Escape + foco inicial + bloqueo de scroll en móvil
  useEffect(() => {
    const prevFocus = document.activeElement;
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const lock = window.innerWidth <= 640;
    if (lock) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      if (lock) document.body.style.overflow = '';
      prevFocus?.focus?.();
    };
  }, [onClose]);

  const dismiss = (id) => {
    setDismissed(prev => {
      const next = new Set(prev).add(id);
      try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch { /* storage no disponible */ }
      return next;
    });
  };

  const open = (item) => {
    const route = TIPO_CONFIG[item.tipo]?.getRoute(item.itemId);
    if (route) { navigate(route); onClose(); }
  };

  return createPortal(
    <div className="notif-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="notif-modal"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notificaciones"
        tabIndex={-1}
        style={pos ? { top: pos.top, right: pos.right } : undefined}
      >
        <div className="notif-grip" />
        <div className="notif-header">
          <h3>Notificaciones{unread > 0 && <span className="notif-count">{unread}</span>}</h3>
          <div className="notif-header-actions">
            {unread > 0 && onMarkAllRead && (
              <button type="button" className="notif-markall" onClick={onMarkAllRead}>
                <CheckCheck size={15} /> Marcar leídas
              </button>
            )}
            <button type="button" className="notif-close" onClick={onClose} aria-label="Cerrar notificaciones">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="notif-body">
          {isLoading && (
            <ul className="notif-list" aria-busy="true" aria-label="Cargando notificaciones">
              {[0, 1, 2].map(i => (
                <li key={i} className="notif-skeleton">
                  <span className="notif-skel-icon" />
                  <span className="notif-skel-lines"><span /><span /></span>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && error && (
            <div className="notif-empty" role="alert">
              <AlertCircle size={36} strokeWidth={1.5} />
              <p>No se pudieron cargar</p>
              <span>Revisá tu conexión e intentá de nuevo.</span>
              {onRetry && <button type="button" className="notif-retry" onClick={onRetry}>Reintentar</button>}
            </div>
          )}

          {!isLoading && !error && items.length === 0 && (
            <div className="notif-empty">
              <BellOff size={36} strokeWidth={1.5} />
              <p>Todo al día</p>
              <span>No hay novedades en los últimos 30 días</span>
            </div>
          )}

          {!isLoading && !error && groups.map(g => (
            <section key={g.label} aria-label={g.label}>
              <h4 className="notif-section-label">{g.label}</h4>
              <ul className="notif-list">
                {g.list.map(item => (
                  <NotifItem key={item.id} item={item} onOpen={open} onDismiss={dismiss} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.getElementById('portal-root')
  );
};

export default NotificacionesModal;
