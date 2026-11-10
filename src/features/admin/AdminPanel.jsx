import React, { useState } from 'react';
import { GraduationCap, Calendar, CalendarDays, Rocket, MessageCircle, LayoutGrid, ShieldCheck, Users, Compass, PanelLeft, Rss, Wrench, ClipboardCheck, ClipboardList, Truck, Tag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CapacitacionesTab from './tabs/CapacitacionesTab';
import PAFTab from './tabs/PAFTab';
import OnboardingTab from './tabs/OnboardingTab';
import EventosTab from './tabs/EventosTab';
import FAQTab from './tabs/FAQTab';
import OrganigramaTab from './tabs/OrganigramaTab';
import SGITab from './tabs/SGITab';
import CertEquiposTab from './tabs/CertEquiposTab';
import ChecklistItemsTab from './tabs/ChecklistItemsTab';
import VehiculosTab from './tabs/VehiculosTab';
import FamiliasTab from './tabs/FamiliasTab';
import SocialTab from './tabs/SocialTab';
import UsuariosTab from './tabs/UsuariosTab';
import PortalesTab from './tabs/PortalesTab';
import NavTab from './tabs/NavTab';
import HerramientasTab from './tabs/HerramientasTab';
import './AdminPanel.css';
import './AdminRedesign.css';

const ALL_TABS = ['capacitaciones', 'paf', 'onboarding', 'eventos', 'faq', 'organigrama', 'sgi', 'cert-equipos', 'checklist-items', 'vehiculos', 'familias', 'social', 'herramientas'];

const ICON = { size: 18, strokeWidth: 1.5 };

const TAB_CONFIG = [
  { key: 'capacitaciones', label: 'Capacitaciones',    group: 'Contenido',    icon: <GraduationCap {...ICON} /> },
  { key: 'paf',            label: 'Plan PAF',          group: 'Contenido',    icon: <Calendar {...ICON} /> },
  { key: 'onboarding',     label: 'Onboarding',        group: 'Contenido',    icon: <Rocket {...ICON} /> },
  { key: 'eventos',        label: 'Eventos',           group: 'Contenido',    icon: <CalendarDays {...ICON} /> },
  { key: 'faq',            label: 'FAQ',               group: 'Contenido',    icon: <MessageCircle {...ICON} /> },
  { key: 'organigrama',    label: 'Organigrama',       group: 'Organización', icon: <LayoutGrid {...ICON} /> },
  { key: 'sgi',            label: 'SGI',               group: 'Organización', icon: <ShieldCheck {...ICON} /> },
  { key: 'cert-equipos',   label: 'Cert. Equipos',     group: 'Equipos',      icon: <ClipboardCheck {...ICON} /> },
  { key: 'checklist-items',label: 'Checklists Equipo', group: 'Equipos',      icon: <ClipboardList {...ICON} /> },
  { key: 'vehiculos',      label: 'Vehículos',         group: 'Equipos',      icon: <Truck {...ICON} /> },
  { key: 'familias',       label: 'Familias Equipo',   group: 'Equipos',      icon: <Tag {...ICON} /> },
  { key: 'social',         label: 'Social',            group: 'Comunidad',    icon: <Rss {...ICON} /> },
  { key: 'herramientas',   label: 'Herramientas',      group: 'Comunidad',    icon: <Wrench {...ICON} /> },
];

const SUPER_TABS = [
  { key: 'portales', label: 'Portales', group: 'Sistema', icon: <Compass {...ICON} /> },
  { key: 'nav',      label: 'Menú',     group: 'Sistema', icon: <PanelLeft {...ICON} /> },
  { key: 'usuarios', label: 'Usuarios', group: 'Sistema', icon: <Users {...ICON} /> },
];

const AdminPanel = () => {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'superadmin';
  const allowedTabs = isSuperAdmin ? ALL_TABS : (profile?.admin_tabs ?? ALL_TABS);

  const visibleTabs = TAB_CONFIG.filter(t => allowedTabs.includes(t.key));
  const [activeTab, setActiveTab] = useState(() => visibleTabs[0]?.key ?? 'onboarding');

  const navTabs = isSuperAdmin ? [...visibleTabs, ...SUPER_TABS] : visibleTabs;
  const groups = Object.entries(navTabs.reduce((acc, t) => {
    (acc[t.group] ||= []).push(t);
    return acc;
  }, {}));

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h2>Panel Admin</h2>
        <p>
          <span className="admin-role-badge">{isSuperAdmin ? 'Super Administrador' : 'Administrador'}</span>
          Gestioná Ribeiro 360
        </p>
      </header>

      <div className="admin-content">
        <nav className="admin-sidebar" aria-label="Secciones del panel">
          {groups.map(([group, tabs]) => (
            <div key={group} className="admin-nav-group">
              <span className="admin-nav-label">{group}</span>
              {tabs.map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
                  aria-current={activeTab === t.key ? 'page' : undefined}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.icon} <span>{t.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-workarea">
          {activeTab === 'capacitaciones' && allowedTabs.includes('capacitaciones') && <CapacitacionesTab />}
          {activeTab === 'paf'            && allowedTabs.includes('paf')            && <PAFTab />}
          {activeTab === 'onboarding'     && allowedTabs.includes('onboarding')     && <OnboardingTab />}
          {activeTab === 'eventos'        && allowedTabs.includes('eventos')        && <EventosTab />}
          {activeTab === 'faq'            && allowedTabs.includes('faq')            && <FAQTab />}
          {activeTab === 'organigrama'    && allowedTabs.includes('organigrama')    && <OrganigramaTab />}
          {activeTab === 'sgi'            && allowedTabs.includes('sgi')            && <SGITab />}
          {activeTab === 'cert-equipos'     && allowedTabs.includes('cert-equipos')     && <CertEquiposTab />}
          {activeTab === 'checklist-items' && allowedTabs.includes('checklist-items') && <ChecklistItemsTab />}
          {activeTab === 'vehiculos'       && allowedTabs.includes('vehiculos')       && <VehiculosTab />}
          {activeTab === 'familias'        && allowedTabs.includes('familias')        && <FamiliasTab />}
          {activeTab === 'social'          && allowedTabs.includes('social')          && <SocialTab />}
          {activeTab === 'herramientas'   && allowedTabs.includes('herramientas')   && <HerramientasTab />}
          {activeTab === 'portales' && isSuperAdmin && <PortalesTab />}
          {activeTab === 'nav'      && isSuperAdmin && <NavTab />}
          {activeTab === 'usuarios' && isSuperAdmin && <UsuariosTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
