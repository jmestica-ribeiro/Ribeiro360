import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Compass } from 'lucide-react';
import './Explorar.css';

import PortalCMASS from './portales/PortalCMASS';
import PortalAdministracion from './portales/PortalAdministracion';
import PortalServiciosCompartidos from './portales/PortalServiciosCompartidos';

// ----------------------------------------------------------------------
// 2. REGISTRO DE PORTALES
// Asociamos el nombre exacto del departamento con su componente.
// ----------------------------------------------------------------------
const PORTALES_HARDCODEADOS = {
  'CMASS': {
    titulo: 'Portal de CMASS',
    descripcion: 'Calidad, Medio Ambiente, Seguridad y Salud Ocupacional.',
    componente: <PortalCMASS />,
  },
  'Administración': {
    titulo: 'Portal de Administración',
    descripcion: 'Métricas de facturación, enlaces a AFIP y sistemas ERP.',
    componente: <PortalAdministracion />,
  },
  'Servicios Compartidos': {
    titulo: 'Centro de Servicios Compartidos',
    descripcion: 'Procesos centralizados, mesa de soporte y gestión de trámites.',
    componente: <PortalServiciosCompartidos />,
  }
};


// ----------------------------------------------------------------------
// 3. COMPONENTE PRINCIPAL (No tocar mucho aquí)
// ----------------------------------------------------------------------
const Explorar = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const myDept = profile?.department || 'General';

  // Si sos Admin, podés simular ser de otras áreas para testear
  const [selectedDept, setSelectedDept] = useState(myDept);

  // Intentamos buscar el portal en el objeto de arriba
  const portalActivo = PORTALES_HARDCODEADOS[selectedDept];

  // Extraemos todos los departamentos que hayamos hardcodeado para que el Admin pueda elegirlos
  const departamentosDisponibles = Object.keys(PORTALES_HARDCODEADOS);

  return (
    <div className="explorar-container">
      <div className="explorar-header">
        <div className="explorar-title">
          <h2>Explorar: {selectedDept}</h2>
          <p>{portalActivo ? portalActivo.titulo : 'Espacio de trabajo departamental'}</p>
          {portalActivo?.descripcion && <p style={{ fontSize: 14, color: 'var(--text-main)', marginTop: 4 }}>{portalActivo.descripcion}</p>}
        </div>

        {isAdmin && departamentosDisponibles.length > 0 && (
          <div className="admin-selector">
            <Compass size={18} color="var(--text-muted)" />
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
              {departamentosDisponibles.map(d => (
                <option key={d} value={d}>Ver como: {d}</option>
              ))}
              {!departamentosDisponibles.includes(selectedDept) && (
                <option value={selectedDept}>Ver como: {selectedDept} (Vacío)</option>
              )}
            </select>
          </div>
        )}
      </div>

      {!portalActivo ? (
        <div className="no-seccion">
          <BookOpen size={48} color="var(--text-muted)" />
          <h3>No hay un diseño codificado para {selectedDept}</h3>
          <p>Abierto a sugerencias. Pedile al equipo de Sistemas que programe el código para esta sección.</p>
        </div>
      ) : (
        portalActivo.componente
      )}
    </div>
  );
};

export default Explorar;
