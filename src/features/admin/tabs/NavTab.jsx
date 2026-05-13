import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { updateNavItem } from '../../../services/navService';

// Todos los ítems configurables del sidebar (los "required" no aparecen acá)
const NAV_ITEMS_CONFIG = [
  { section: 'Principal', items: [
    { key: 'explorar',    label: 'Explorar' },
    { key: 'cursos',      label: 'Mis Cursos' },
    { key: 'onboarding',  label: 'Onboarding' },
  ]},
  { section: 'Comunidad', items: [
    { key: 'directorio',  label: 'Agenda / Directorio' },
    { key: 'eventos',     label: 'Eventos' },
    { key: 'organigrama', label: 'Organigrama' },
    { key: 'faq',         label: 'Preguntas Frecuentes' },
    { key: 'multimedia',  label: 'Contenido Multimedia' },
  ]},
  { section: 'Gestión', items: [
    { key: 'sgi', label: 'SGI (módulo completo)' },
  ]},
];

const NavTab = () => {
  const { navConfig, refreshNavConfig } = useAuth();
  const [toggling, setToggling] = useState(null);

  const isVisible = (key) => navConfig[key] !== false;

  const handleToggle = async (key) => {
    setToggling(key);
    const { error } = await updateNavItem(key, !isVisible(key));
    if (!error) await refreshNavConfig();
    setToggling(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
          Visibilidad del menú
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Ocultá temporalmente los módulos que aún no están terminados.
          Los cambios se aplican para todos los usuarios de inmediato.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {NAV_ITEMS_CONFIG.map(({ section, items }) => (
          <div key={section}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
              {section}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(({ key, label }) => {
                const visible = isVisible(key);
                const ocupado = toggling === key;
                return (
                  <div key={key} className="portales-tab-row">
                    <div className="portales-tab-info">
                      <span className="portales-tab-titulo">{label}</span>
                    </div>
                    <div className="portales-tab-controls">
                      <span className={`portales-tab-badge ${visible ? 'publico' : 'interno'}`}>
                        {visible ? <><Eye size={12} /> Visible</> : <><EyeOff size={12} /> Oculto</>}
                      </span>
                      <button
                        className={`portales-tab-toggle ${visible ? 'activo' : ''}`}
                        onClick={() => handleToggle(key)}
                        disabled={ocupado}
                      >
                        {ocupado ? 'Guardando...' : visible ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
        <strong>Inicio</strong> y <strong>Panel Admin</strong> son siempre visibles y no pueden ocultarse.
      </p>
    </div>
  );
};

export default NavTab;
