import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, LogOut, User, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = ({ onToggleMenu }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const jobTitle = profile?.job_title || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

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

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-trigger" onClick={onToggleMenu}>
          <Menu size={24} />
        </button>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="notification-btn" title="Activar modo oscuro" onClick={toggleTheme}>
          {isDarkMode ? <Sun size={20} className="text-muted" /> : <Moon size={20} className="text-muted" />}
        </button>

        <button className="notification-btn">
          <Bell size={22} className="text-muted" />
          <span className="badge">3</span>
        </button>

        <div className="user-profile" ref={menuRef} onClick={() => setMenuOpen(o => !o)}>
          <div className="user-info">
            <span className="user-name">Hola, {firstName}</span>
            {jobTitle && <span className="user-role">{jobTitle}</span>}
          </div>
          {avatarUrl
            ? <img src={avatarUrl} alt={firstName} className="avatar" />
            : <div className="avatar avatar-fallback"><User size={20} /></div>
          }

          {menuOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown-info">
                <span className="user-dropdown-name">{profile?.full_name}</span>
                <span className="user-dropdown-email">{profile?.email || user?.email}</span>
                {profile?.department && <span className="user-dropdown-email">{profile.department}</span>}
              </div>
              <button className="user-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/perfil'); }}>
                <User size={15} /> Mi perfil
              </button>
              <button className="user-dropdown-item" onClick={signOut}>
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
