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
      <div className="adm-pane-head">
        <h3>Visibilidad del menú</h3>
        <p>
          Ocultá temporalmente los módulos que aún no están terminados.
          Los cambios se aplican para todos los usuarios de inmediato.
        </p>
      </div>

      {NAV_ITEMS_CONFIG.map(({ section, items }) => (
        <section key={section}>
          <h4 className="adm-group-label">{section}</h4>
          <ul className="adm-list">
            {items.map(({ key, label }) => {
              const visible = isVisible(key);
              const ocupado = toggling === key;
              return (
                <li key={key} className={`adm-row${visible ? '' : ' muted'}`}>
                  <span className="adm-row-icon">
                    {visible ? <Eye size={18} strokeWidth={1.5} /> : <EyeOff size={18} strokeWidth={1.5} />}
                  </span>
                  <div className="adm-row-info">
                    <div className="adm-row-title">{label}</div>
                    <div className="adm-row-meta">{ocupado ? 'Guardando…' : visible ? 'Visible en el menú' : 'Oculto para todos'}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    aria-label={`Mostrar ${label} en el menú`}
                    className={`adm-switch${visible ? ' on' : ''}`}
                    onClick={() => handleToggle(key)}
                    disabled={ocupado}
                  >
                    <span className="adm-switch-thumb" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="adm-footnote">
        <strong>Inicio</strong> y <strong>Panel Admin</strong> son siempre visibles y no pueden ocultarse.
      </p>
    </div>
  );
};

export default NavTab;
