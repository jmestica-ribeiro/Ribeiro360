import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Home, Compass, BookOpen, Users, Calendar, Settings, Briefcase, ChevronLeft, ChevronRight, LayoutGrid, MessageCircle, ShieldCheck, ChevronDown } from 'lucide-react';
import Logo from '../assets/Logo.png';
import './Sidebar.css';

const Sidebar = ({ isOpen, onToggle, isCollapsed, onToggleCollapse }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const isSGIActive = location.pathname.startsWith('/sgi');
  const [sgiOpen, setSgiOpen] = useState(isSGIActive);
  const linkClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`;
  const subLinkClass = ({ isActive }) => `nav-subitem${isActive ? ' active' : ''}`;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-group">
          <div className="logo-container">
            <img src={Logo} alt="Ribeiro Logo" className="logo-img" />
          </div>
          {!isCollapsed && <h2>Ribeiro<span> 360</span></h2>}
        </div>
        {!isOpen && (
          <button className="collapse-btn" onClick={onToggleCollapse}>
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {!isCollapsed && <p className="nav-label">Principal</p>}
        {isCollapsed && <div className="nav-label-dot" />}
        <NavLink to="/" end className={linkClass} title="Inicio">
          <Home size={20} />
          {!isCollapsed && <span>Inicio</span>}
        </NavLink>
        <NavLink to="/explorar" className={linkClass} title="Explorar">
          <Compass size={20} />
          {!isCollapsed && <span>Explorar</span>}
        </NavLink>
        <NavLink to="/cursos" className={linkClass} title="Capacitaciones">
          <BookOpen size={20} />
          {!isCollapsed && <span>Mis Cursos</span>}
        </NavLink>
        <NavLink to="/onboarding" className={linkClass} title="Onboarding">
          <Briefcase size={20} />
          {!isCollapsed && <span>Onboarding</span>}
        </NavLink>

        {!isCollapsed && <p className="nav-label mt-4">Comunidad</p>}
        {isCollapsed && <div className="nav-label-dot mt-4" />}
        <NavLink to="/directorio" className={linkClass} title="Directorio">
          <Users size={20} />
          {!isCollapsed && <span>Directorio</span>}
        </NavLink>
        <NavLink to="/eventos" className={linkClass} title="Eventos">
          <Calendar size={20} />
          {!isCollapsed && <span>Eventos</span>}
        </NavLink>
        <NavLink to="/organigrama" className={linkClass} title="Organigrama">
          <LayoutGrid size={20} />
          {!isCollapsed && <span>Organigrama</span>}
        </NavLink>
        <NavLink to="/faq" className={linkClass} title="Preguntas Frecuentes">
          <MessageCircle size={20} />
          {!isCollapsed && <span>Preguntas Frecuentes</span>}
        </NavLink>

        {/* SGI Section */}
        {!isCollapsed && <p className="nav-label mt-4">Gestión</p>}
        {isCollapsed && <div className="nav-label-dot mt-4" />}

        {isCollapsed ? (
          <NavLink to="/sgi" className={linkClass} title="SGI">
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
                  <NavLink to="/sgi" end className={subLinkClass} title="Documentos">
                    <span className="nav-sub-dot" />
                    <span>Documentos</span>
                  </NavLink>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {isAdmin && (
          <>
            {!isCollapsed && <p className="nav-label mt-4">Administración</p>}
            {isCollapsed && <div className="nav-label-dot mt-4" />}
            <NavLink to="/admin" className={linkClass} title="Panel Admin">
              <Settings size={20} />
              {!isCollapsed && <span>Panel Admin</span>}
            </NavLink>
          </>
        )}
      </nav>

    </aside>
  );
};

export default Sidebar;
