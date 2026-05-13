import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Compass, BookOpen, Users, Calendar, Settings, Briefcase, ChevronLeft, ChevronRight, LayoutGrid, MessageCircle, ShieldCheck, ChevronDown, X, Images, Wrench } from 'lucide-react';
import Logo from '../../assets/Logo.png';
import './Sidebar.css';

// Ítems configurables (pueden ocultarse desde el admin).
// "required: true" = siempre visible, no se puede ocultar.
const NAV_ITEMS = {
  principal: [
    { key: 'inicio',      label: 'Inicio',      to: '/',           icon: Home,          end: true,  required: true },
    { key: 'explorar',    label: 'Explorar',    to: '/explorar',   icon: Compass },
    { key: 'cursos',      label: 'Mis Cursos',  to: '/cursos',     icon: BookOpen },
    { key: 'onboarding',  label: 'Onboarding',  to: '/onboarding', icon: Briefcase },
  ],
  comunidad: [
    { key: 'directorio',  label: 'Agenda',               to: '/directorio',  icon: Users },
    { key: 'eventos',     label: 'Eventos',              to: '/eventos',     icon: Calendar },
    { key: 'organigrama', label: 'Organigrama',          to: '/organigrama', icon: LayoutGrid },
    { key: 'faq',         label: 'Preguntas Frecuentes', to: '/faq',         icon: MessageCircle },
    { key: 'multimedia',    label: 'Multimedia',           to: '/multimedia',    icon: Images },
    { key: 'herramientas', label: 'Herramientas por Sector', to: '/herramientas', icon: Wrench },
  ],
};

const Sidebar = ({ isOpen, onToggle, isCollapsed, onToggleCollapse }) => {
  const { profile, navConfig } = useAuth();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const isSGIActive = location.pathname.startsWith('/sgi');
  const [sgiOpen, setSgiOpen] = useState(isSGIActive);

  const linkClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`;
  const subLinkClass = ({ isActive }) => `nav-subitem${isActive ? ' active' : ''}`;
  const handleLinkClick = () => { if (isOpen && onToggle) onToggle(); };
  const isVisuallyCollapsed = isCollapsed && !isOpen;

  // Un ítem es visible si no hay entrada en navConfig (default: visible)
  // o si su entrada es explícitamente true. Los required siempre se muestran.
  const isVisible = (key, required = false) => required || (navConfig[key] !== false);

  const renderNavItem = ({ key, label, to, icon: Icon, end, required }) => {
    if (!isVisible(key, required)) return null;
    return (
      <NavLink key={key} to={to} end={end} className={linkClass} title={label} onClick={handleLinkClick}>
        <Icon size={20} />
        {!isVisuallyCollapsed && <span>{label}</span>}
      </NavLink>
    );
  };

  const sgiVisible = isVisible('sgi');

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isVisuallyCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-group">
          <div className="logo-container">
            <img src={Logo} alt="Ribeiro Logo" className="logo-img" />
          </div>
          {!isVisuallyCollapsed && <h2>Ribeiro<span> 360</span></h2>}
        </div>
        <button
          className={`collapse-btn${isOpen ? ' collapse-btn--mobile' : ''}`}
          onClick={isOpen ? onToggle : onToggleCollapse}
        >
          {isOpen ? <X size={14} /> : (isVisuallyCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}
        </button>
      </div>

      <nav className="sidebar-nav">
        {!isVisuallyCollapsed && <p className="nav-label">Principal</p>}
        {isVisuallyCollapsed && <div className="nav-label-dot" />}
        {NAV_ITEMS.principal.map(renderNavItem)}

        {!isVisuallyCollapsed && <p className="nav-label mt-4">Comunidad</p>}
        {isVisuallyCollapsed && <div className="nav-label-dot mt-4" />}
        {NAV_ITEMS.comunidad.map(renderNavItem)}

        {/* SGI — ocultar sección entera si está deshabilitado */}
        {sgiVisible && (
          <>
            {!isVisuallyCollapsed && <p className="nav-label mt-4">Gestión</p>}
            {isVisuallyCollapsed && <div className="nav-label-dot mt-4" />}

            {isVisuallyCollapsed ? (
              <NavLink to="/sgi" className={linkClass} title="SGI" onClick={handleLinkClick}>
                <ShieldCheck size={20} />
              </NavLink>
            ) : (
              <div className="nav-group">
                <button
                  className={`nav-item nav-group-toggle${isSGIActive ? ' group-active' : ''}`}
                  onClick={() => setSgiOpen(o => !o)}
                >
                  <ShieldCheck size={20} />
                  <span>SGI</span>
                  <ChevronDown size={14} className={`nav-chevron${sgiOpen ? ' open' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {sgiOpen && (
                    <motion.div
                      className="nav-subitems"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <NavLink to="/sgi" end className={subLinkClass} title="Documentos" onClick={handleLinkClick}>
                        <span className="nav-sub-dot" />
                        <span>Documentos</span>
                      </NavLink>
                      <NavLink to="/sgi/nc" className={subLinkClass} title="No Conformidades" onClick={handleLinkClick}>
                        <span className="nav-sub-dot" />
                        <span>No Conformidades</span>
                      </NavLink>
                      <NavLink to="/sgi/incidentes" className={subLinkClass} title="Incidentes" onClick={handleLinkClick}>
                        <span className="nav-sub-dot" />
                        <span>Incidentes</span>
                      </NavLink>
                      <NavLink to="/sgi/estadisticas" className={subLinkClass} title="Estadísticas SGI" onClick={handleLinkClick}>
                        <span className="nav-sub-dot" />
                        <span>Estadísticas</span>
                      </NavLink>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {isAdmin && (
          <>
            {!isVisuallyCollapsed && <p className="nav-label mt-4">Administración</p>}
            {isVisuallyCollapsed && <div className="nav-label-dot mt-4" />}
            <NavLink to="/admin" className={linkClass} title="Panel Admin" onClick={handleLinkClick}>
              <Settings size={20} />
              {!isVisuallyCollapsed && <span>Panel Admin</span>}
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
