import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Toast.css';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const DURATIONS = { success: 4000, info: 4000, warning: 6000, error: 7000, loading: Infinity };
const MAX_VISIBLE = 3;
let seq = 0;

function ToastItem({ toast, index, expanded, onDismiss, onPause, onResume }) {
  const Icon = ICONS[toast.type] || Info;
  const depth = index; // 0 = más nuevo (frente)
  return (
    <motion.li
      layout
      className={`toast toast-${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{
        opacity: expanded || depth === 0 ? 1 : Math.max(0.5, 1 - depth * 0.25),
        y: 0,
        scale: expanded ? 1 : 1 - depth * 0.04,
      }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500) onDismiss(toast.id);
      }}
      onPointerDown={onPause}
      onPointerUp={onResume}
      style={{ zIndex: 100 - depth }}
    >
      <span className="toast-icon">
        <Icon size={18} className={toast.type === 'loading' ? 'toast-spin' : undefined} />
      </span>
      <div className="toast-body">
        {toast.title && <p className="toast-title">{toast.title}</p>}
        {toast.description && <p className="toast-desc">{toast.description}</p>}
        {toast.action && (
          <button
            type="button"
            className="toast-action"
            onClick={() => { toast.action.onClick?.(); onDismiss(toast.id); }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button type="button" className="toast-close" aria-label="Cerrar notificación" onClick={() => onDismiss(toast.id)}>
        <X size={14} />
      </button>
    </motion.li>
  );
}

export const ToastProvider = ({ children, position = 'auto' }) => {
  const [toasts, setToasts] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const timers = useRef(new Map()); // id -> { timeout, remaining, startedAt }

  const clear = (id) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t.timeout);
    timers.current.delete(id);
  };

  const dismiss = useCallback((id) => {
    clear(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const schedule = useCallback((id, ms) => {
    if (!Number.isFinite(ms)) return;
    clear(id);
    timers.current.set(id, { timeout: setTimeout(() => dismiss(id), ms), remaining: ms, startedAt: Date.now() });
  }, [dismiss]);

  const pauseAll = useCallback(() => {
    timers.current.forEach((t, id) => {
      clearTimeout(t.timeout);
      t.remaining -= Date.now() - t.startedAt;
      timers.current.set(id, t);
    });
  }, []);

  const resumeAll = useCallback(() => {
    timers.current.forEach((t, id) => {
      if (t.remaining > 0) schedule(id, t.remaining);
    });
  }, [schedule]);

  // Pausar cuando la pestaña no está visible
  useEffect(() => {
    const onVis = () => (document.hidden ? pauseAll() : resumeAll());
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pauseAll, resumeAll]);

  useEffect(() => () => timers.current.forEach(t => clearTimeout(t.timeout)), []);

  const push = useCallback((type, input, opts = {}) => {
    const base = typeof input === 'string' ? { title: input } : (input || {});
    const id = opts.id ?? `t${++seq}`;
    const duration = opts.duration ?? base.duration ?? (base.action ? Math.max(DURATIONS[type], 8000) : DURATIONS[type]);
    const next = { ...base, ...opts, id, type };
    setToasts(prev => {
      const exists = prev.some(t => t.id === id);
      return exists ? prev.map(t => (t.id === id ? next : t)) : [next, ...prev];
    });
    schedule(id, duration);
    return id;
  }, [schedule]);

  const toast = useMemo(() => {
    const api = {
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      warning: (m, o) => push('warning', m, o),
      info: (m, o) => push('info', m, o),
      loading: (m, o) => push('loading', m, o),
      dismiss,
      promise: (promise, { loading, success, error }) => {
        const id = push('loading', loading);
        const resolve = (v, tpl, type) => {
          const content = typeof tpl === 'function' ? tpl(v) : tpl;
          push(type, content, { id });
        };
        promise.then(v => resolve(v, success, 'success'), e => resolve(e, error, 'error'));
        return promise;
      },
    };
    return api;
  }, [push, dismiss]);

  // Compatibilidad con la API previa: showToast(mensaje, tipo)
  const showToast = useCallback((message, type = 'error') => push(type, message), [push]);

  const value = useMemo(() => ({ toast, showToast }), [toast, showToast]);
  const visible = toasts.slice(0, MAX_VISIBLE);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={`toast-region toast-pos-${position}`}
        onMouseEnter={() => { setExpanded(true); pauseAll(); }}
        onMouseLeave={() => { setExpanded(false); resumeAll(); }}
        onFocus={pauseAll}
        onBlur={resumeAll}
      >
        <ul className={`toast-stack${expanded ? ' expanded' : ''}`} aria-live="polite" aria-relevant="additions">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((t, i) => (
              <ToastItem
                key={t.id}
                toast={t}
                index={i}
                expanded={expanded}
                onDismiss={dismiss}
                onPause={pauseAll}
                onResume={resumeAll}
              />
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
};
