import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Compass, Globe, Lock } from 'lucide-react';
import { fetchPortalesConfig, updatePortalVisibilidad } from '../../services/portalesService';
import './Explorar.css';

import PortalCMASS from './portales/PortalCMASS';
import PortalAdministracion from './portales/PortalAdministracion';
import PortalServiciosCompartidos from './portales/PortalServiciosCompartidos';
import PortalOperaciones from './portales/PortalOperaciones';
import PortalObras from './portales/PortalObras';
import PortalTecnologia from './portales/PortalTecnologia';

// ----------------------------------------------------------------------
// REGISTRO DE PORTALES
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
  },
  'Operaciones & Servicios': {
    titulo: 'Portal de Operaciones & Servicios',
    descripcion: 'Recursos y herramientas del área de Operaciones.',
    componente: <PortalOperaciones />,
  },
  'Obras': {
    titulo: 'Portal de Obras',
    descripcion: 'Seguimiento de proyectos y herramientas del área de Obras.',
    componente: <PortalObras />,
  },
  'Tecnología - Construcciones y NN': {
    titulo: 'Portal de Tecnología',
    descripcion: 'Recursos y herramientas del área de Tecnología.',
    componente: <PortalTecnologia />,
  },
};

const TODOS_LOS_DEPTS = Object.keys(PORTALES_HARDCODEADOS);

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------
const Explorar = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const myDept = profile?.department || 'General';

  const [visibilidadMap, setVisibilidadMap] = useState({});
  const [loadingVis, setLoadingVis] = useState(true);
  const [togglingDept, setTogglingDept] = useState(null);

  useEffect(() => {
    async function cargarConfig() {
      const { data } = await fetchPortalesConfig();
      const map = {};
      data.forEach(({ departamento, publico }) => { map[departamento] = publico; });
      setVisibilidadMap(map);
      setLoadingVis(false);
    }
    cargarConfig();
  }, []);

  // Opciones disponibles según el rol:
  // Admins ven todos los portales hardcodeados.
  // Usuarios ven su propio portal (si existe) + los portales marcados como públicos.
  const opcionesSelector = loadingVis
    ? (TODOS_LOS_DEPTS.includes(myDept) ? [myDept] : [])
    : isAdmin
      ? TODOS_LOS_DEPTS
      : TODOS_LOS_DEPTS.filter(dept =>
          dept === myDept || (visibilidadMap[dept] ?? false)
        );

  const defaultDept = opcionesSelector.includes(myDept)
    ? myDept
    : opcionesSelector[0] ?? myDept;

  const [selectedDept, setSelectedDept] = useState(defaultDept);

  // Si las opciones cargaron y el dept seleccionado no está disponible, corregir
  useEffect(() => {
    if (!loadingVis && opcionesSelector.length > 0 && !opcionesSelector.includes(selectedDept)) {
      setSelectedDept(opcionesSelector[0]);
    }
  }, [loadingVis]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleVisibilidad = async (dept) => {
    const actual = visibilidadMap[dept] ?? false;
    setTogglingDept(dept);
    const { error } = await updatePortalVisibilidad(dept, !actual);
    if (!error) {
      setVisibilidadMap(prev => ({ ...prev, [dept]: !actual }));
    }
    setTogglingDept(null);
  };

  const portalActivo = PORTALES_HARDCODEADOS[selectedDept];
  const esPortalPropio = selectedDept === myDept;

  return (
    <div className="explorar-container">
      <div className="explorar-header">
        <div className="explorar-title">
          <h2>Explorar: {selectedDept}</h2>
          <p>{portalActivo ? portalActivo.titulo : 'Espacio de trabajo departamental'}</p>
          {portalActivo?.descripcion && (
            <p style={{ fontSize: 14, color: 'var(--text-main)', marginTop: 4 }}>
              {portalActivo.descripcion}
            </p>
          )}
        </div>

        {/* Selector unificado: visible si hay más de una opción */}
        {!loadingVis && opcionesSelector.length > 1 && (
          <div className="admin-selector">
            <Compass size={18} color="var(--text-muted)" />
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
              {opcionesSelector.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
              {/* Si el dept propio del admin no tiene portal, igual mostrarlo */}
              {isAdmin && !opcionesSelector.includes(myDept) && (
                <option value={myDept}>{myDept} (sin portal)</option>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Barra de visibilidad — solo admins, solo cuando hay portal */}
      {isAdmin && !loadingVis && portalActivo && (
        <div className="portal-visibilidad-bar">
          <span className="visibilidad-label">
            {visibilidadMap[selectedDept] ? (
              <><Globe size={14} /> Visible para todos</>
            ) : (
              <><Lock size={14} /> Solo uso interno</>
            )}
          </span>
          <button
            className={`btn-toggle-visibilidad ${visibilidadMap[selectedDept] ? 'activo' : ''}`}
            onClick={() => handleToggleVisibilidad(selectedDept)}
            disabled={togglingDept === selectedDept}
          >
            {togglingDept === selectedDept
              ? 'Guardando...'
              : visibilidadMap[selectedDept]
                ? 'Hacer privado'
                : 'Hacer público'}
          </button>
        </div>
      )}

      {/* Contenido del portal */}
      {portalActivo ? (
        portalActivo.componente
      ) : (
        <div className="no-seccion">
          <BookOpen size={48} color="var(--text-muted)" />
          <h3>No hay un diseño codificado para {selectedDept}</h3>
          <p>Abierto a sugerencias. Pedile al equipo de Sistemas que programe el código para esta sección.</p>
        </div>
      )}
    </div>
  );
};

export default Explorar;
