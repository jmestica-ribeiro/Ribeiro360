import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, Compass, BookOpen, Users, Calendar, Settings, Briefcase, LayoutGrid, MessageCircle,
  ShieldCheck, ChevronDown, ChevronsUpDown, X, Rss, Wrench, PanelLeftClose, PanelLeftOpen, User, LogOut,
} from 'lucide-react';
import Logo from '../../assets/Logo.png';
import './Sidebar.css';

const ICON = { size: 18, strokeWidth: 1.5 };

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
    { key: 'social',        label: 'Social',               to: '/social',        icon: Rss },
    { key: 'herramientas', label: 'Herramientas por Sector', to: '/herramientas', icon: Wrench },
  ],
};

const SGI_SUBITEMS = [
  { to: '/sgi', end: true, label: 'Documentos' },
  { to: '/sgi/nc', label: 'Hallazgos' },
  { to: '/sgi/incidentes', label: 'Incidentes' },
  { to: '/sgi/estadisticas', label: 'Estadísticas' },
  { to: '/sgi/cert-equipos', label: 'Cert. Equipos' },
  { to: '/sgi/checklists-equipo', label: 'Checklists Equipo' },
];

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';

const Sidebar = ({ isOpen, onToggle, isCollapsed, onToggleCollapse }) => {
  const { profile, navConfig, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const isSGIActive = location.pathname.startsWith('/sgi');
  const [sgiOpen, setSgiOpen] = useState(isSGIActive);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onDown = (e) => { if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [userMenuOpen]);

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
        <Icon {...ICON} />
        {!isVisuallyCollapsed && <span>{label}</span>}
      </NavLink>
    );
  };

  const renderGroup = (label, children) => (
    <div className="nav-section">
      {isVisuallyCollapsed ? <div className="nav-label-dot" aria-hidden="true" /> : <p className="nav-label">{label}</p>}
      {children}
    </div>
  );

  const sgiVisible = isVisible('sgi');
  const fullName = profile?.full_name || 'Usuario';
  const avatarUrl = profile?.avatar_url;

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
          type="button"
          className="collapse-btn"
          onClick={isOpen ? onToggle : onToggleCollapse}
          aria-label={isOpen ? 'Cerrar menú' : isVisuallyCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={isOpen ? 'Cerrar menú' : isVisuallyCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {isOpen
            ? <X {...ICON} />
            : isVisuallyCollapsed ? <PanelLeftOpen {...ICON} /> : <PanelLeftClose {...ICON} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {renderGroup('Principal', NAV_ITEMS.principal.map(renderNavItem))}
        {renderGroup('Comunidad', NAV_ITEMS.comunidad.map(renderNavItem))}

        {/* SGI — ocultar sección entera si está deshabilitado */}
        {sgiVisible && renderGroup('Gestión', isVisuallyCollapsed ? (
          <NavLink to="/sgi" className={linkClass} title="SGI" onClick={handleLinkClick}>
            <ShieldCheck {...ICON} />
          </NavLink>
        ) : (
          <div className="nav-group">
            <button
              type="button"
              className={`nav-item nav-group-toggle${isSGIActive ? ' group-active' : ''}`}
              onClick={() => setSgiOpen(o => !o)}
              aria-expanded={sgiOpen}
            >
              <ShieldCheck {...ICON} />
              <span>SGI</span>
              <ChevronDown size={16} strokeWidth={1.5} className={`nav-chevron${sgiOpen ? ' open' : ''}`} />
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
                  {SGI_SUBITEMS.map(s => (
                    <NavLink key={s.to} to={s.to} end={s.end} className={subLinkClass} title={s.label} onClick={handleLinkClick}>
                      <span>{s.label}</span>
                    </NavLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {isAdmin && renderGroup('Administración', (
          <NavLink to="/admin" className={linkClass} title="Panel Admin" onClick={handleLinkClick}>
            <Settings {...ICON} />
            {!isVisuallyCollapsed && <span>Panel Admin</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user" ref={userRef}>
        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              className="sidebar-user-menu"
              role="menu"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.14 }}
            >
              <div className="sidebar-user-menu-info">
                <span className="sidebar-user-menu-name">{fullName}</span>
                {profile?.email && <span className="sidebar-user-menu-email">{profile.email}</span>}
              </div>
              <button
                type="button"
                role="menuitem"
                className="sidebar-user-menu-item"
                onClick={() => { setUserMenuOpen(false); handleLinkClick(); navigate('/perfil'); }}
              >
                <User size={16} strokeWidth={1.5} /> Mi perfil
              </button>
              <button type="button" role="menuitem" className="sidebar-user-menu-item danger" onClick={signOut}>
                <LogOut size={16} strokeWidth={1.5} /> Cerrar sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          className="sidebar-user-card"
          onClick={() => setUserMenuOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
          title={isVisuallyCollapsed ? fullName : undefined}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="sidebar-user-avatar" />
            : <span className="sidebar-user-avatar" aria-hidden="true">{getInitials(fullName)}</span>}
          {!isVisuallyCollapsed && (
            <>
              <span className="sidebar-user-text">
                <span className="sidebar-user-name">{fullName}</span>
                {profile?.job_title && <span className="sidebar-user-role">{profile.job_title}</span>}
              </span>
              <ChevronsUpDown size={16} strokeWidth={1.5} className="sidebar-user-chevron" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
