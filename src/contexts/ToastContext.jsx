import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={18} />,
  error:   <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
};

const COLORS = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#15803d' },
  error:   { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#b91c1c' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#b45309' },
};

const DURATION = 4000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), DURATION);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => {
          const c = COLORS[toast.type] || COLORS.error;
          return (
            <div key={toast.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              minWidth: '280px',
              maxWidth: '380px',
              pointerEvents: 'all',
              animation: 'toast-in 0.2s ease',
            }}>
              <span style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>
                {ICONS[toast.type]}
              </span>
              <p style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: c.text, margin: 0, lineHeight: '1.4' }}>
                {toast.message}
              </p>
              <button
                onClick={() => dismiss(toast.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.icon, padding: 0, flexShrink: 0, opacity: 0.7, display: 'flex' }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
