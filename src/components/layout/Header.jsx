import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, LogOut, User, Sun, Moon, QrCode, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import NotificacionesModal from './NotificacionesModal';
import QRModal from '../common/QRModal';
import '../common/QRModal.css';
import './Header.css';

const ICON = { size: 18, strokeWidth: 1.5 };

const SECTIONS = {
  '': ['Inicio'],
  explorar: ['Explorar'],
  cursos: ['Mis Cursos'],
  onboarding: ['Onboarding'],
  directorio: ['Comunidad', 'Agenda'],
  eventos: ['Comunidad', 'Eventos'],
  organigrama: ['Comunidad', 'Organigrama'],
  faq: ['Comunidad', 'Preguntas Frecuentes'],
  social: ['Comunidad', 'Social'],
  multimedia: ['Comunidad', 'Multimedia'],
  herramientas: ['Comunidad', 'Herramientas por Sector'],
  perfil: ['Mi perfil'],
  admin: ['Administración', 'Panel Admin'],
};

const SGI_SECTIONS = {
  nc: 'Hallazgos',
  incidentes: 'Incidentes',
  estadisticas: 'Estadísticas',
  'cert-equipos': 'Cert. Equipos',
  'checklists-equipo': 'Checklists Equipo',
  documento: 'Documento',
};

const humanize = (slug = '') => {
  const s = decodeURIComponent(slug).replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function getBreadcrumb(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const [root = '', sub] = parts;
  if (root === 'sgi') {
    const crumbs = ['Gestión', 'SGI'];
    if (sub) crumbs.push(SGI_SECTIONS[sub] ?? humanize(sub));
    return crumbs;
  }
  if (root === 'cursos' && sub) return ['Mis Cursos', 'Curso'];
  return SECTIONS[root] ?? [humanize(root)];
}

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';

const Header = ({ onToggleMenu }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef(null);
  const bellRef = useRef(null);

  const fullName = profile?.full_name || 'Usuario';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const crumbs = getBreadcrumb(location.pathname);

  const { notificaciones, count, isLoading, markAsRead } = useNotificaciones(profile);

  const [isDarkMode, setIsDarkMode] = useState(() => document.body.classList.contains('dark-theme'));

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-theme');
      setIsDarkMode(true);
    }

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleBellClick = () => setNotifOpen(o => !o);

  const handleCloseNotif = () => {
    markAsRead();
    setNotifOpen(false);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-trigger" onClick={onToggleMenu} aria-label="Abrir menú">
          <Menu size={22} strokeWidth={1.5} />
        </button>
        <nav className="header-crumbs" aria-label="Ubicación">
          <ol>
            {crumbs.map((c, i) => (
              <li key={`${c}-${i}`} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>
                {i > 0 && <ChevronRight size={13} strokeWidth={1.5} aria-hidden="true" />}
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="header-right">
        <button className="header-icon-btn" title="Cambiar tema" aria-label="Cambiar tema" onClick={toggleTheme}>
          {isDarkMode ? <Sun {...ICON} /> : <Moon {...ICON} />}
        </button>

        <button className="header-icon-btn" title="Generar QR de esta página" aria-label="Generar QR de esta página" onClick={() => setQrOpen(true)}>
          <QrCode {...ICON} />
        </button>

        {qrOpen && (
          <QRModal
            url={window.location.href}
            onClose={() => setQrOpen(false)}
          />
        )}

        <button
          ref={bellRef}
          className="header-icon-btn"
          onClick={handleBellClick}
          title="Notificaciones"
          aria-label={count > 0 ? `Notificaciones, ${count} sin leer` : 'Notificaciones'}
          aria-haspopup="dialog"
          aria-expanded={notifOpen}
        >
          <Bell {...ICON} />
          {count > 0 && <span className="header-dot" aria-hidden="true" />}
        </button>

        {notifOpen && (
          <NotificacionesModal
            notificaciones={notificaciones}
            isLoading={isLoading}
            onMarkAllRead={markAsRead}
            anchorRef={bellRef}
            onClose={handleCloseNotif}
          />
        )}

        {/* Solo móvil: el usuario vive en el sidebar, que en móvil es un drawer */}
        <div className="header-user" ref={menuRef}>
          <button
            type="button"
            className="header-avatar-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menú de usuario"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="header-avatar" />
              : <span className="header-avatar" aria-hidden="true">{getInitials(fullName)}</span>}
          </button>

          {menuOpen && (
            <div className="user-dropdown" role="menu">
              <div className="user-dropdown-info">
                <span className="user-dropdown-name">{profile?.full_name}</span>
                <span className="user-dropdown-email">{profile?.email || user?.email}</span>
                {profile?.department && <span className="user-dropdown-email">{profile.department}</span>}
              </div>
              <button className="user-dropdown-item" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/perfil'); }}>
                <User size={16} strokeWidth={1.5} /> Mi perfil
              </button>
              <button className="user-dropdown-item danger" role="menuitem" onClick={signOut}>
                <LogOut size={16} strokeWidth={1.5} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
