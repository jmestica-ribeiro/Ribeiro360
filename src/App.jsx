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
const Incidentes      = lazy(() => import('./features/sgi/incidentes/Incidentes'));
const IncidenteDetalle = lazy(() => import('./features/sgi/incidentes/IncidenteDetalle'));
const Multimedia      = lazy(() => import('./features/multimedia/Multimedia'));
const Herramientas    = lazy(() => import('./features/herramientas/HerramientasHub'));
const Perfil          = lazy(() => import('./features/perfil/Perfil'));
const Login           = lazy(() => import('./pages/Login'));
const NotFound        = lazy(() => import('./pages/NotFound'));

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { session, profile, isLoading } = useAuth();
  if (isLoading) return <div className="app-loading"><span>Cargando...</span></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'superadmin') return <Navigate to="/" replace />;
  return children;
};

const LoginRoute = () => {
  const { session, isLoading } = useAuth();
  if (isLoading) return <div className="app-loading"><span>Cargando...</span></div>;
  return session ? <Navigate to="/" replace /> : <Login />;
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
      <Route path="/sgi/nc/nuevo"          element={<W><NCDetalle /></W>} />
      <Route path="/sgi/nc/:id"            element={<W><NCDetalle /></W>} />
      <Route path="/sgi/incidentes"        element={<W><Incidentes /></W>} />
      <Route path="/sgi/incidentes/nuevo"  element={<W><IncidenteDetalle /></W>} />
      <Route path="/sgi/incidentes/:id"    element={<W><IncidenteDetalle /></W>} />
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
