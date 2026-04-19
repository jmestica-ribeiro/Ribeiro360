import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Compass, BookOpen, Users, Calendar, Settings, Briefcase, ChevronLeft, ChevronRight, LayoutGrid, MessageCircle, ShieldCheck, ChevronDown, BarChart2, X } from 'lucide-react';
import Logo from '../../assets/Logo.png';
import './Sidebar.css';

const Sidebar = ({ isOpen, onToggle, isCollapsed, onToggleCollapse }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const isSGIActive = location.pathname.startsWith('/sgi');
  const [sgiOpen, setSgiOpen] = useState(isSGIActive);
  const linkClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`;
  const subLinkClass = ({ isActive }) => `nav-subitem${isActive ? ' active' : ''}`;

  const handleLinkClick = () => {
    if (isOpen && onToggle) onToggle();
  };

  const isVisuallyCollapsed = isCollapsed && !isOpen;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isVisuallyCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-group">
          <div className="logo-container">
            <img src={Logo} alt="Ribeiro Logo" className="logo-img" />
          </div>
          {!isVisuallyCollapsed && <h2>Ribeiro<span> 360</span></h2>}
        </div>
        <button className="collapse-btn" onClick={isOpen ? onToggle : onToggleCollapse}>
          {isOpen ? <X size={18} /> : (isVisuallyCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)}
        </button>
      </div>

      <nav className="sidebar-nav">
        {!isVisuallyCollapsed && <p className="nav-label">Principal</p>}
        {isVisuallyCollapsed && <div className="nav-label-dot" />}
        <NavLink to="/" end className={linkClass} title="Inicio" onClick={handleLinkClick}>
          <Home size={20} />
          {!isVisuallyCollapsed && <span>Inicio</span>}
        </NavLink>
        <NavLink to="/explorar" className={linkClass} title="Explorar" onClick={handleLinkClick}>
          <Compass size={20} />
          {!isVisuallyCollapsed && <span>Explorar</span>}
        </NavLink>
        <NavLink to="/cursos" className={linkClass} title="Capacitaciones" onClick={handleLinkClick}>
          <BookOpen size={20} />
          {!isVisuallyCollapsed && <span>Mis Cursos</span>}
        </NavLink>
        <NavLink to="/onboarding" className={linkClass} title="Onboarding" onClick={handleLinkClick}>
          <Briefcase size={20} />
          {!isVisuallyCollapsed && <span>Onboarding</span>}
        </NavLink>

        {!isVisuallyCollapsed && <p className="nav-label mt-4">Comunidad</p>}
        {isVisuallyCollapsed && <div className="nav-label-dot mt-4" />}
        <NavLink to="/directorio" className={linkClass} title="Directorio" onClick={handleLinkClick}>
          <Users size={20} />
          {!isVisuallyCollapsed && <span>Agenda</span>}
        </NavLink>
        <NavLink to="/eventos" className={linkClass} title="Eventos" onClick={handleLinkClick}>
          <Calendar size={20} />
          {!isVisuallyCollapsed && <span>Eventos</span>}
        </NavLink>
        <NavLink to="/organigrama" className={linkClass} title="Organigrama" onClick={handleLinkClick}>
          <LayoutGrid size={20} />
          {!isVisuallyCollapsed && <span>Organigrama</span>}
        </NavLink>
        <NavLink to="/faq" className={linkClass} title="Preguntas Frecuentes" onClick={handleLinkClick}>
          <MessageCircle size={20} />
          {!isVisuallyCollapsed && <span>Preguntas Frecuentes</span>}
        </NavLink>

        {/* SGI Section */}
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
