import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PageTransition from './components/layout/PageTransition';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { PageLoader } from './components/common';
import './App.css';

// Siempre cargados — parte del shell principal
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Lazy — se cargan solo cuando el usuario navega a esa ruta
const Dashboard       = lazy(() => import('./features/dashboard/Dashboard'));
const Explorar        = lazy(() => import('./features/capacitaciones/Explorar'));
const Onboarding      = lazy(() => import('./features/onboarding/Onboarding'));
const AdminPanel      = lazy(() => import('./features/admin/AdminPanel'));
const Organigrama     = lazy(() => import('./features/organigrama/Organigrama'));
const Directorio      = lazy(() => import('./features/directorio/Directorio'));
const MisCursos       = lazy(() => import('./features/capacitaciones/MisCursos'));
const Eventos         = lazy(() => import('./features/eventos/Eventos'));
const FAQ             = lazy(() => import('./features/faq/FAQ'));
const SGI             = lazy(() => import('./features/sgi/SGI'));
const SGIDocument     = lazy(() => import('./features/sgi/SGIDocument'));
const NoConformidades = lazy(() => import('./features/sgi/nc/NoConformidades'));
const NCDetalle       = lazy(() => import('./features/sgi/nc/NCDetalle'));
const SGIEstadisticas = lazy(() => import('./features/sgi/SGIEstadisticas'));
const CertEquipos         = lazy(() => import('./features/sgi/cert-equipos/CertEquipos'));
const ChecklistEquipos    = lazy(() => import('./features/sgi/checklists-equipo/ChecklistEquipos'));
const Incidentes       = lazy(() => import('./features/sgi/incidentes/Incidentes'));
const IncidenteNuevo    = lazy(() => import('./features/sgi/incidentes/IncidenteNuevo'));
const IncidenteDetalle  = lazy(() => import('./features/sgi/incidentes/IncidenteDetalle'));
const IncidenteEventoWIP = lazy(() => import('./features/sgi/incidentes/IncidenteEventoWIP'));
const Multimedia      = lazy(() => import('./features/multimedia/Multimedia'));
const Herramientas    = lazy(() => import('./features/herramientas/HerramientasHub'));
const Perfil          = lazy(() => import('./features/perfil/Perfil'));
const Login           = lazy(() => import('./pages/Login'));
const NotFound        = lazy(() => import('./pages/NotFound'));

const RETURN_KEY = 'ribeiro360_returnTo';

const ProtectedRoute = ({ children, requireAdmin = false, requireSgiWrite = false }) => {
  const { session, isAdmin, isSgiWriter, isLoading } = useAuth();
  if (isLoading) return <div className="app-loading"><span>Cargando...</span></div>;
  if (!session) {
    const dest = window.location.pathname + window.location.search;
    if (dest !== '/' && dest !== '/login') sessionStorage.setItem(RETURN_KEY, dest);
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (requireSgiWrite && !isSgiWriter) return <Navigate to="/sgi" replace />;
  return children;
};

const LoginRoute = () => {
  const { session, isLoading } = useAuth();
  if (isLoading) return <div className="app-loading"><span>Cargando...</span></div>;
  if (session) {
    const returnTo = sessionStorage.getItem(RETURN_KEY);
    if (returnTo) { sessionStorage.removeItem(RETURN_KEY); return <Navigate to={returnTo} replace />; }
    return <Navigate to="/" replace />;
  }
  return <Login />;
};

function AnimatedRoutes() {
  const location = useLocation();
  const W = ({ children }) => <PageTransition key={location.pathname}>{children}</PageTransition>;
  return (
    <Routes location={location}>
      <Route path="/"                      element={<W><Dashboard /></W>} />
      <Route path="/explorar"              element={<W><Explorar /></W>} />
      <Route path="/onboarding"            element={<W><Onboarding /></W>} />
      <Route path="/organigrama"           element={<W><Organigrama /></W>} />
      <Route path="/directorio"            element={<W><Directorio /></W>} />
      <Route path="/cursos"                element={<W><MisCursos /></W>} />
      <Route path="/cursos/:id"            element={<W><MisCursos /></W>} />
      <Route path="/eventos"               element={<W><Eventos /></W>} />
      <Route path="/faq"                   element={<W><FAQ /></W>} />
      <Route path="/sgi"                   element={<W><SGI /></W>} />
      <Route path="/sgi/documento/:docId"  element={<W><SGIDocument /></W>} />
      <Route path="/sgi/estadisticas"      element={<W><SGIEstadisticas /></W>} />
      <Route path="/sgi/nc"                element={<W><NoConformidades /></W>} />
      <Route path="/sgi/nc/nuevo"          element={<ProtectedRoute requireSgiWrite><W><NCDetalle /></W></ProtectedRoute>} />
      <Route path="/sgi/nc/:id"            element={<ProtectedRoute requireSgiWrite><W><NCDetalle /></W></ProtectedRoute>} />
      <Route path="/sgi/cert-equipos"          element={<W><CertEquipos /></W>} />
      <Route path="/sgi/checklists-equipo"     element={<W><ChecklistEquipos /></W>} />
      <Route path="/sgi/checklists-equipo/:id" element={<W><ChecklistEquipos /></W>} />
      <Route path="/sgi/incidentes"             element={<W><Incidentes /></W>} />
      <Route path="/sgi/incidentes/nuevo"        element={<ProtectedRoute requireSgiWrite><W><IncidenteNuevo /></W></ProtectedRoute>} />
      <Route path="/sgi/incidentes/nuevo/form"  element={<ProtectedRoute requireSgiWrite><W><IncidenteDetalle /></W></ProtectedRoute>} />
      <Route path="/sgi/incidentes/nuevo/evento" element={<ProtectedRoute requireSgiWrite><W><IncidenteEventoWIP /></W></ProtectedRoute>} />
      <Route path="/sgi/incidentes/:id"         element={<ProtectedRoute requireSgiWrite><W><IncidenteDetalle /></W></ProtectedRoute>} />
      <Route path="/sgi/:categoria"        element={<W><SGI /></W>} />
      <Route path="/multimedia"            element={<W><Multimedia /></W>} />
      <Route path="/herramientas"          element={<W><Herramientas /></W>} />
      <Route path="/perfil"                element={<W><Perfil /></W>} />
      <Route path="/admin"                 element={
        <ProtectedRoute requireAdmin>
          <W><AdminPanel /></W>
        </ProtectedRoute>
      } />
      <Route path="*" element={<W><NotFound /></W>} />
    </Routes>
  );
}

function AppLayout() {
  const isMobile = window.innerWidth < 768;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);

  return (
    <div className={`layout ${isSidebarOpen ? 'sidebar-open' : ''} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="main-content">
        <Header onToggleMenu={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="dashboard-container">
          <Suspense fallback={<PageLoader />}>
            <AnimatedRoutes />
          </Suspense>
        </main>
      </div>
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </ToastProvider>
  );
}

export default App;
