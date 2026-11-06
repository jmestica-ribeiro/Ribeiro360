import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import './Confirm.css';

const ConfirmContext = createContext(null);

/**
 * const confirm = useConfirm();
 * if (!(await confirm({ message: '¿Eliminar este curso?', destructive: true }))) return;
 * Opciones: title, message, confirmLabel, cancelLabel, destructive
 */
export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const confirmBtn = useRef(null);
  const lastFocus = useRef(null);
  const titleId = useId();
  const descId = useId();

  const confirm = useCallback((opts = {}) => {
    lastFocus.current = document.activeElement;
    return new Promise(resolve => {
      resolver.current = resolve;
      setState({
        title: opts.title ?? '¿Confirmar acción?',
        message: opts.message ?? '',
        confirmLabel: opts.confirmLabel ?? (/elimin|borrar/i.test(opts.message ?? '') ? 'Eliminar' : opts.destructive ? 'Confirmar' : 'Aceptar'),
        cancelLabel: opts.cancelLabel ?? 'Cancelar',
        destructive: opts.destructive ?? /elimin|borrar|no se puede deshacer/i.test(opts.message ?? ''),
      });
    });
  }, []);

  const close = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!state) return;
    confirmBtn.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Tab') {
        const nodes = document.querySelectorAll('.confirm-sheet button');
        if (!nodes.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {createPortal(
        <AnimatePresence>
          {state && (
            <motion.div
              className="confirm-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}
            >
              <motion.div
                className="confirm-sheet"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                initial={{ opacity: 0, y: 32, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 32, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <div className={`confirm-icon${state.destructive ? ' destructive' : ''}`}>
                  <AlertTriangle size={22} />
                </div>
                <h2 id={titleId} className="confirm-title">{state.title}</h2>
                {state.message && <p id={descId} className="confirm-message">{state.message}</p>}
                <div className="confirm-actions">
                  <button type="button" className="confirm-btn" onClick={() => close(false)}>
                    {state.cancelLabel}
                  </button>
                  <button
                    ref={confirmBtn}
                    type="button"
                    className={`confirm-btn primary${state.destructive ? ' destructive' : ''}`}
                    onClick={() => close(true)}
                  >
                    {state.confirmLabel}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
};
