import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, BookOpen, Calendar, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './MobileTabBar.css';

const TABS = [
  { key: 'inicio',   label: 'Inicio',   to: '/',         icon: Home, end: true, required: true },
  { key: 'explorar', label: 'Explorar', to: '/explorar', icon: Compass },
  { key: 'cursos',   label: 'Cursos',   to: '/cursos',   icon: BookOpen },
  { key: 'eventos',  label: 'Eventos',  to: '/eventos',  icon: Calendar },
];

const MobileTabBar = ({ onOpenMenu }) => {
  const { navConfig } = useAuth();
  const visible = TABS.filter(t => t.required || navConfig?.[t.key] !== false);

  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {visible.map(({ key, label, to, icon: Icon, end }) => (
        <NavLink key={key} to={to} end={end} className={({ isActive }) => `tabbar-item${isActive ? ' active' : ''}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
      <button type="button" className="tabbar-item" onClick={onOpenMenu} aria-label="Abrir menú completo">
        <Menu size={22} />
        <span>Más</span>
      </button>
    </nav>
  );
};

export default MobileTabBar;
