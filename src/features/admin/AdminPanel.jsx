import React, { useState } from 'react';
import { GraduationCap, Calendar, Rocket, MessageCircle, LayoutGrid, ShieldCheck, Bell, Users, Compass, PanelLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CapacitacionesTab from './tabs/CapacitacionesTab';
import PAFTab from './tabs/PAFTab';
import OnboardingTab from './tabs/OnboardingTab';
import EventosTab from './tabs/EventosTab';
import FAQTab from './tabs/FAQTab';
import OrganigramaTab from './tabs/OrganigramaTab';
import SGITab from './tabs/SGITab';
import NovedadesTab from './tabs/NovedadesTab';
import UsuariosTab from './tabs/UsuariosTab';
import PortalesTab from './tabs/PortalesTab';
import NavTab from './tabs/NavTab';
import './AdminPanel.css';

const ALL_TABS = ['capacitaciones', 'paf', 'onboarding', 'eventos', 'faq', 'organigrama', 'sgi', 'novedades'];

const TAB_CONFIG = [
  { key: 'capacitaciones', label: 'Capacitaciones', icon: <GraduationCap size={18} /> },
  { key: 'paf',            label: 'Plan PAF',        icon: <Calendar size={18} /> },
  { key: 'onboarding',     label: 'Onboarding',      icon: <Rocket size={18} /> },
  { key: 'eventos',        label: 'Eventos',          icon: <Calendar size={18} /> },
  { key: 'faq',            label: 'FAQ',              icon: <MessageCircle size={18} /> },
  { key: 'organigrama',    label: 'Organigrama',      icon: <LayoutGrid size={18} /> },
  { key: 'sgi',            label: 'SGI',              icon: <ShieldCheck size={18} /> },
  { key: 'novedades',      label: 'Novedades',        icon: <Bell size={18} /> },
];

const AdminPanel = () => {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'superadmin';
  const allowedTabs = isSuperAdmin ? ALL_TABS : (profile?.admin_tabs ?? ALL_TABS);

  const visibleTabs = TAB_CONFIG.filter(t => allowedTabs.includes(t.key));
  const [activeTab, setActiveTab] = useState(() => visibleTabs[0]?.key ?? 'onboarding');

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h2>Panel Admin</h2>
          <p>{isSuperAdmin ? 'Super Administrador' : 'Administrador'} · Gestiona Ribeiro 360</p>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-sidebar" style={{ minHeight: '80vh' }}>
          {visibleTabs.map(t => (
            <button
              key={t.key}
              className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
          {isSuperAdmin && (
            <>
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />
              <button
                className={`admin-tab ${activeTab === 'portales' ? 'active' : ''}`}
                onClick={() => setActiveTab('portales')}
              >
                <Compass size={18} /> Portales
              </button>
              <button
                className={`admin-tab ${activeTab === 'nav' ? 'active' : ''}`}
                onClick={() => setActiveTab('nav')}
              >
                <PanelLeft size={18} /> Menú
              </button>
              <button
                className={`admin-tab ${activeTab === 'usuarios' ? 'active' : ''}`}
                onClick={() => setActiveTab('usuarios')}
              >
                <Users size={18} /> Usuarios
              </button>
            </>
          )}
        </div>

        <div className="admin-workarea">
          {activeTab === 'capacitaciones' && <CapacitacionesTab />}
          {activeTab === 'paf'            && <PAFTab />}
          {activeTab === 'onboarding'     && <OnboardingTab />}
          {activeTab === 'eventos'        && <EventosTab />}
          {activeTab === 'faq'            && <FAQTab />}
          {activeTab === 'organigrama'    && <OrganigramaTab />}
          {activeTab === 'sgi'            && <SGITab />}
          {activeTab === 'novedades'      && <NovedadesTab />}
          {activeTab === 'portales' && isSuperAdmin && <PortalesTab />}
          {activeTab === 'nav'      && isSuperAdmin && <NavTab />}
          {activeTab === 'usuarios' && isSuperAdmin && <UsuariosTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
