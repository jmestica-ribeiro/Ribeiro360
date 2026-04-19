import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PageTransition from './components/PageTransition';
import { useAuth } from './contexts/AuthContext';
import './App.css';

// Siempre cargados — parte del shell principal
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Lazy — se cargan solo cuando el usuario navega a esa ruta
const Dashboard    = lazy(() => import('./components/Dashboard'));
const Explorar     = lazy(() => import('./components/Explorar'));
const Onboarding   = lazy(() => import('./components/Onboarding'));
const AdminPanel   = lazy(() => import('./components/AdminPanel'));
const Organigrama  = lazy(() => import('./components/Organigrama'));
const Directorio   = lazy(() => import('./components/Directorio'));
const MisCursos    = lazy(() => import('./components/MisCursos'));
const Eventos      = lazy(() => import('./components/Eventos'));
const FAQ          = lazy(() => import('./components/FAQ'));
const SGI          = lazy(() => import('./components/SGI'));
const SGIDocument  = lazy(() => import('./components/SGIDocument'));
const NoConformidades = lazy(() => import('./components/nc/NoConformidades'));
const NCDetalle    = lazy(() => import('./components/nc/NCDetalle'));
const SGIEstadisticas = lazy(() => import('./components/SGIEstadisticas'));
const Perfil       = lazy(() => import('./components/Perfil'));
const Login        = lazy(() => import('./pages/Login'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: '14px', gap: '10px' }}>
    <div style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
);

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
      <Route path="/"                    element={<W><Dashboard /></W>} />
      <Route path="/explorar"            element={<W><Explorar /></W>} />
      <Route path="/onboarding"          element={<W><Onboarding /></W>} />
      <Route path="/organigrama"         element={<W><Organigrama /></W>} />
      <Route path="/directorio"          element={<W><Directorio /></W>} />
      <Route path="/cursos"              element={<W><MisCursos /></W>} />
      <Route path="/cursos/:id"          element={<W><MisCursos /></W>} />
      <Route path="/eventos"             element={<W><Eventos /></W>} />
      <Route path="/faq"                 element={<W><FAQ /></W>} />
      <Route path="/sgi"                 element={<W><SGI /></W>} />
      <Route path="/sgi/documento/:docId" element={<W><SGIDocument /></W>} />
      <Route path="/sgi/estadisticas"    element={<W><SGIEstadisticas /></W>} />
      <Route path="/sgi/nc"             element={<W><NoConformidades /></W>} />
      <Route path="/sgi/nc/nuevo"       element={<W><NCDetalle /></W>} />
      <Route path="/sgi/nc/:id"         element={<W><NCDetalle /></W>} />
      <Route path="/sgi/:categoria"      element={<W><SGI /></W>} />
      <Route path="/perfil"              element={<W><Perfil /></W>} />
      <Route path="/admin"               element={
        <ProtectedRoute requireAdmin>
          <W><AdminPanel /></W>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
