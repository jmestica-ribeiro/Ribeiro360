import React, { useState, useEffect } from 'react';
import { Globe, Lock } from 'lucide-react';
import { fetchPortalesConfig, updatePortalVisibilidad } from '../../../services/portalesService';

// Metadatos de los portales hardcodeados — fuente de verdad para el admin
const PORTALES_INFO = [
  {
    departamento: 'CMASS',
    titulo: 'Portal de CMASS',
    descripcion: 'Calidad, Medio Ambiente, Seguridad y Salud Ocupacional.',
  },
  {
    departamento: 'Administración',
    titulo: 'Portal de Administración',
    descripcion: 'Métricas de facturación, enlaces a AFIP y sistemas ERP.',
  },
  {
    departamento: 'Servicios Compartidos',
    titulo: 'Centro de Servicios Compartidos',
    descripcion: 'Procesos centralizados, mesa de soporte y gestión de trámites.',
  },
  {
    departamento: 'Operaciones & Servicios',
    titulo: 'Portal de Operaciones & Servicios',
    descripcion: 'Recursos y herramientas del área de Operaciones.',
  },
  {
    departamento: 'Obras',
    titulo: 'Portal de Obras',
    descripcion: 'Seguimiento de proyectos y herramientas del área de Obras.',
  },
  {
    departamento: 'Tecnología - Construcciones y NN',
    titulo: 'Portal de Tecnología',
    descripcion: 'Recursos y herramientas del área de Tecnología.',
  },
];

const PortalesTab = () => {
  const [visibilidadMap, setVisibilidadMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    async function cargar() {
      const { data } = await fetchPortalesConfig();
      const map = {};
      data.forEach(({ departamento, publico }) => { map[departamento] = publico; });
      setVisibilidadMap(map);
      setLoading(false);
    }
    cargar();
  }, []);

  const handleToggle = async (dept) => {
    const actual = visibilidadMap[dept] ?? false;
    setToggling(dept);
    const { error } = await updatePortalVisibilidad(dept, !actual);
    if (!error) {
      setVisibilidadMap(prev => ({ ...prev, [dept]: !actual }));
    }
    setToggling(null);
  };

  if (loading) {
    return <p style={{ color: 'var(--text-muted)', padding: '32px 0' }}>Cargando portales...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
          Visibilidad de portales
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Controlá qué portales departamentales son accesibles para todos los empleados
          y cuáles permanecen de uso interno.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PORTALES_INFO.map(({ departamento, titulo, descripcion }) => {
          const esPublico = visibilidadMap[departamento] ?? false;
          const ocupado = toggling === departamento;

          return (
            <div key={departamento} className="portales-tab-row">
              <div className="portales-tab-info">
                <span className="portales-tab-titulo">{titulo}</span>
                <span className="portales-tab-desc">{descripcion}</span>
              </div>

              <div className="portales-tab-controls">
                <span className={`portales-tab-badge ${esPublico ? 'publico' : 'interno'}`}>
                  {esPublico ? <><Globe size={12} /> Público</> : <><Lock size={12} /> Interno</>}
                </span>
                <button
                  className={`portales-tab-toggle ${esPublico ? 'activo' : ''}`}
                  onClick={() => handleToggle(departamento)}
                  disabled={ocupado}
                >
                  {ocupado
                    ? 'Guardando...'
                    : esPublico
                      ? 'Hacer privado'
                      : 'Hacer público'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
        Los portales marcados como <strong>Público</strong> aparecen en la sección
        "Disponibles para todos" dentro de Explorar, accesibles para cualquier empleado.
      </p>
    </div>
  );
};

export default PortalesTab;
