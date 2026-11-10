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
    return <p className="adm-empty">Cargando portales...</p>;
  }

  return (
    <div>
      <div className="adm-pane-head">
        <h3>Visibilidad de portales</h3>
        <p>
          Controlá qué portales departamentales son accesibles para todos los empleados
          y cuáles permanecen de uso interno.
        </p>
      </div>

      <ul className="adm-list">
        {PORTALES_INFO.map(({ departamento, titulo, descripcion }) => {
          const esPublico = visibilidadMap[departamento] ?? false;
          const ocupado = toggling === departamento;

          return (
            <li key={departamento} className="adm-row">
              <span className="adm-row-icon">
                {esPublico ? <Globe size={18} strokeWidth={1.5} /> : <Lock size={18} strokeWidth={1.5} />}
              </span>
              <div className="adm-row-info">
                <div className="adm-row-title">
                  {titulo}
                  <span className={`adm-badge${esPublico ? '' : ' neutral'}`}>{esPublico ? 'Público' : 'Interno'}</span>
                </div>
                <div className="adm-row-meta">{ocupado ? 'Guardando…' : descripcion}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={esPublico}
                aria-label={`Hacer público ${titulo}`}
                className={`adm-switch${esPublico ? ' on' : ''}`}
                onClick={() => handleToggle(departamento)}
                disabled={ocupado}
              >
                <span className="adm-switch-thumb" />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="adm-footnote">
        Los portales marcados como <strong>Público</strong> aparecen en la sección
        "Disponibles para todos" dentro de Explorar, accesibles para cualquier empleado.
      </p>
    </div>
  );
};

export default PortalesTab;
