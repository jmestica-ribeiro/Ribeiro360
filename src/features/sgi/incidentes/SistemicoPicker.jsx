import React, { useState } from 'react';
import { X, Building2, Wrench, User, ShieldOff, ChevronRight } from 'lucide-react';

const CATEGORIAS = [
  {
    id: 'org',
    label: 'Factores Organizacionales',
    shortLabel: 'Organizacionales',
    icon: Building2,
    color: '#1a5276',
    subcategorias: [
      {
        id: 'org_1', label: '1. Gestión de Personas',
        items: [
          { id: 1, label: 'Proceso de selección de personal inexistente o con falencias' },
          { id: 2, label: 'Proceso de evaluación psicofísica inexistente o con falencias' },
          { id: 3, label: 'Roles y responsabilidades inexistentes o no definidos claramente' },
        ],
      },
      {
        id: 'org_1_2', label: '1.2. Sanciones y reconocimientos',
        items: [
          { id: 4, label: 'Política de sanción y reconocimiento inexistente o con falencias' },
          { id: 5, label: 'Aplicación de la Política de sanción y reconocimiento inexistente o con falencias' },
        ],
      },
      {
        id: 'org_1_3', label: '1.3. Inducción y desarrollo profesional',
        items: [
          { id: 6, label: 'Proceso de inducción al puesto inexistente o con falencias' },
          { id: 7, label: 'Proceso de formación y desarrollo inexistente o con falencias' },
          { id: 8, label: 'Aplicación de los procesos de inducción, formación y desarrollo profesional inexistente o con falencias' },
        ],
      },
      {
        id: 'org_1_4', label: '1.4. Evaluación del desempeño',
        items: [
          { id: 9, label: 'Procesos de evaluación de desempeño inexistente o ineficaz' },
          { id: 10, label: 'Aplicación del proceso de evaluación de desempeño inexistente o con falencias' },
        ],
      },
      {
        id: 'org_2', label: '2. Gestión de las comunicaciones',
        items: [
          { id: 11, label: 'Proceso de comunicación inexistente o con falencias' },
          { id: 12, label: 'Aplicación del proceso de comunicación inexistente o con falencias' },
        ],
      },
      {
        id: 'org_3', label: '3. Gestión documental (normas, procedimientos, instructivos, protocolos)',
        items: [
          { id: 13, label: 'Proceso formal de gestión de documentos inexistente o con falencias' },
          { id: 14, label: 'Normas, procedimientos, instructivos, protocolos inexistentes o con falencias' },
        ],
      },
      {
        id: 'org_4', label: '4. Mantenimiento de activos y equipos',
        items: [
          { id: 15, label: 'Criterio de priorización del mantenimiento e intervención de equipos e instalaciones inexistente o con falencias' },
          { id: 16, label: 'Proceso de mantenimiento predictivo/preventivo inexistente o con falencias' },
          { id: 17, label: 'Proceso de mantenimiento correctivo inexistente o con falencias en la aplicación' },
          { id: 18, label: 'Sistema de reporte de fallas de equipos o activos inexistente o con falencias' },
          { id: 19, label: 'Proceso de habilitación de equipos/herramientas/instalaciones inexistente o con falencias' },
        ],
      },
      {
        id: 'org_5', label: '5. Gestión de compras de materias primas, insumos o productos',
        items: [
          { id: 20, label: 'Proceso de compras inexistente o con falencias' },
          { id: 21, label: 'Proceso de distribución inexistente o con falencias' },
          { id: 22, label: 'Proceso de almacenamiento y control de stock inexistente o con falencias' },
        ],
      },
      {
        id: 'org_6', label: '6. Gestión de Servicios Contratados',
        items: [
          { id: 23, label: 'Proceso de contratación de servicios inexistente o con falencias' },
          { id: 24, label: 'Contratación de empresas de servicio que no reúnen los criterios de precalificación técnica' },
          { id: 25, label: 'Seguimiento del desempeño de contratistas inexistente o con falencias' },
          { id: 26, label: 'Proceso de coordinación de trabajos con empresas contratistas inexistente o con falencias' },
          { id: 27, label: 'Incumplimiento de las cláusulas contractuales' },
        ],
      },
      {
        id: 'org_7', label: '7. Gestión de riesgos',
        items: [
          { id: 28, label: 'Proceso de gestión de riesgos de higiene laboral inexistente o con falencias' },
          { id: 29, label: 'Proceso de gestión de riesgos de seguridad laboral inexistente o con falencias' },
          { id: 30, label: 'Proceso de gestión de riesgos de proceso inexistente o con falencias' },
          { id: 31, label: 'Proceso de gestión de riesgos psicosociales inexistente o con falencias' },
          { id: 32, label: 'Proceso de gestión de la seguridad vial inexistente o con falencias' },
          { id: 33, label: 'Documentación de acciones resultantes de eventos anteriores no realizadas o con falencias' },
          { id: 34, label: 'Sistemas de captura y/o reporte de peligros inexistentes o con falencias' },
          { id: 35, label: 'Proceso de gestión de la emergencia inexistente o con falencias' },
          { id: 36, label: 'Proceso para el manejo del cambio (MOC) inexistente o con falencias' },
        ],
      },
      {
        id: 'org_8', label: '8. Políticas y objetivos',
        items: [
          { id: 37, label: 'Políticas y objetivos organizacionales contradictorios' },
          { id: 38, label: 'Proceso de asignación de recursos económicos con falencias' },
        ],
      },
    ],
  },
  {
    id: 'ctx',
    label: 'Contexto de trabajo / de la Operación',
    shortLabel: 'Contexto Operacional',
    icon: Wrench,
    color: '#1e7e34',
    subcategorias: [
      {
        id: 'ctx_1', label: '1. Equipo de trabajo',
        items: [],
      },
      {
        id: 'ctx_1_1', label: '1.1. Supervisión y asignación de personas y tareas',
        items: [
          { id: 'c1', label: 'Diseño de los turnos/ciclos de trabajo/descanso' },
          { id: 'c2', label: 'Ausencia o falencias en la asignación de tareas y responsabilidades al personal' },
          { id: 'c3', label: 'Pautas de trabajo u orientación inexistente o con falencias' },
          { id: 'c4', label: 'Tareas realizadas con una supervisión escasa' },
          { id: 'c5', label: 'Falencias en la coordinación/identificación de tareas simultáneas' },
          { id: 'c6', label: 'Ausencia o falencia en la coordinación de trabajos entre personal de empresa contratista y empresa contratante' },
          { id: 'c7', label: 'Interferencias o déficit de comunicación interpersonales horizontal/vertical en la comunicación o coordinación de las tareas' },
          { id: 'c8', label: 'Fallas en la comunicación horizontal del equipo de trabajo' },
          { id: 'c9', label: 'Falencias en el proceso de transferencia/cambio de turno' },
          { id: 'c10', label: 'Relaciones jerárquicas poco claras o contradictorias para quien realiza la tarea' },
        ],
      },
      {
        id: 'ctx_1_2', label: '1.2. Conocimientos/habilidades/competencias',
        items: [
          { id: 'c11', label: 'Inducción al puesto no realizada o con falencias en su aplicación' },
          { id: 'c12', label: 'Formación al puesto insuficiente' },
          { id: 'c13', label: 'Capacitación inexistente o con falencias' },
          { id: 'c14', label: 'Entrenamiento práctico inexistente o con falencias' },
          { id: 'c15', label: 'Poca experiencia en la realización de la tarea' },
        ],
      },
      {
        id: 'ctx_2', label: '2. Condiciones del ambiente de trabajo',
        items: [
          { id: 'c16', label: 'Presencia de agentes de riesgo higiénicos fuera de los límites establecidos' },
          { id: 'c17', label: 'Presencia de fenómenos ambientales adversos' },
          { id: 'c18', label: 'Presencia de condiciones físicas adversas del área de trabajo' },
          { id: 'c19', label: 'Presencia de tareas simultáneas con interferencias' },
          { id: 'c20', label: 'Señalización y/o demarcación inexistente o defectuosa' },
          { id: 'c21', label: 'Organización del espacio de trabajo que induce a errores o infracciones' },
          { id: 'c22', label: 'Ausencia o fallas en el orden y limpieza del sector de trabajo' },
        ],
      },
      {
        id: 'ctx_3', label: '3. Documentos de referencia (Políticas, estándares, procedimientos e instructivos de trabajo, etc.)',
        items: [
          { id: 'c23', label: 'No existe documento de referencia asociado a la tarea' },
          { id: 'c24', label: 'Documento de referencia incompleto' },
          { id: 'c25', label: 'Documento de referencia con consignas poco claras o confusas' },
          { id: 'c26', label: 'Documento de referencia con diseño que dificulta su comprensión' },
          { id: 'c27', label: 'Documento de referencia no difundido o no comunicado adecuadamente' },
          { id: 'c28', label: 'Documento de referencia desactualizado' },
          { id: 'c29', label: 'Documento de referencia no disponible para su consulta' },
          { id: 'c30', label: 'Documento de referencia contradictorio con las necesidades de la situación de trabajo' },
          { id: 'c31', label: 'Documento de referencia contradictorio con otros procedimientos aplicables a la tarea' },
        ],
      },
      {
        id: 'ctx_4', label: '4. Equipos/herramientas/instalaciones/materiales/insumos',
        items: [
          { id: 'c32', label: 'Falencia en la realización del mantenimiento predictivo/preventivo' },
          { id: 'c33', label: 'Mantenimiento predictivo/preventivo inexistente' },
          { id: 'c34', label: 'Ejecución de mantenimiento correctivo defectuoso' },
          { id: 'c35', label: 'Mantenimiento correctivo inexistente' },
          { id: 'c36', label: 'Diseño/especificaciones de uso de equipos/herramientas no adecuadas para la tarea' },
          { id: 'c37', label: 'Equipos/herramientas no disponibles al momento de realizar la tarea' },
          { id: 'c38', label: 'Equipos/herramientas críticas no habilitadas/certificadas para su uso' },
          { id: 'c39', label: 'Equipos críticos con sistemas de control/operación y-paseados' },
          { id: 'c40', label: 'Materiales/insumos no adecuados para realizar la tarea' },
          { id: 'c41', label: 'Materiales/insumos requeridos para realizar la tarea no disponibles o insuficientes' },
          { id: 'c42', label: 'Ausencia o falla de elementos de Lock-out/Tag-out' },
          { id: 'c43', label: 'Diseño de equipo/herramienta no permite realizar el bloqueo de energías' },
          { id: 'c44', label: 'EPP para realizar la tarea no adecuado o defectuoso' },
          { id: 'c45', label: 'EPP requerido para realizar la tarea no disponible' },
          { id: 'c46', label: 'Falencias en el embalaje/almacenamiento/transporte' },
          { id: 'c47', label: 'Equipos/Instalaciones incompletas o fuera de especificación' },
        ],
      },
    ],
  },
  {
    id: 'hum',
    label: 'Desempeño humano y/o fallas técnicas en equipos/instalaciones',
    shortLabel: 'Desempeño Humano / Fallas Técnicas',
    icon: User,
    color: '#b84c00',
    subcategorias: [
      {
        id: 'hum_1', label: '1. Desempeño humano',
        items: [
          { id: 'h1', label: 'No aplicación de procedimientos formales de trabajo' },
          { id: 'h2', label: 'Aplicación incorrecta de procedimientos formales de trabajo' },
          { id: 'h3', label: 'No uso de equipos/herramientas' },
          { id: 'h4', label: 'Uso incorrecto de equipos/herramientas' },
          { id: 'h5', label: 'No utilización o uso incorrecto de EPP´s' },
          { id: 'h6', label: 'Utilización de EPP´s incorrectos para la tarea' },
          { id: 'h7', label: 'Uso de equipos/herramientas para fines diferentes para los cuales fueron diseñados' },
          { id: 'h8', label: 'Uso de equipos/herramientas no habilitados y/o con fallas' },
          { id: 'h9', label: 'Uso de equipo/herramienta sin habilitación/entrenamiento correspondiente' },
          { id: 'h10', label: 'Uso de materia prima/insumos incorrectos o defectuosos' },
          { id: 'h11', label: 'Inhabilitación de condiciones de seguridad/control' },
          { id: 'h12', label: 'No aplicación de recomendaciones de análisis de riesgo asociado a la tarea' },
          { id: 'h13', label: 'Realización de tarea sin autorización' },
          { id: 'h14', label: 'Realización de acciones que derivaron en un resultado no deseado' },
        ],
      },
      {
        id: 'hum_2', label: '2. Factores psicofísicos',
        items: [
          { id: 'h15', label: 'Lesiones y/o enfermedades preexistentes que interfirieren en la tarea' },
          { id: 'h16', label: 'Disminución de capacidad psicofísica derivada de la ejecución de la tarea' },
          { id: 'h17', label: 'Disminución de capacidad psicofísica derivada del consumo sustancias lícitas/ilícitas' },
        ],
      },
      {
        id: 'hum_3', label: '3. Equipos/herramientas/instalaciones/materiales/insumos',
        items: [
          { id: 'h18', label: 'Falla repentina de equipos' },
          { id: 'h19', label: 'Falla repentina de herramientas' },
          { id: 'h20', label: 'Falla repentina de instalaciones' },
          { id: 'h21', label: 'Falla repentina de materiales' },
          { id: 'h22', label: 'Falla repentina de insumos' },
        ],
      },
    ],
  },
  {
    id: 'bar',
    label: 'Barreras Ausentes o fallidas',
    shortLabel: 'Barreras Ausentes / Fallidas',
    icon: ShieldOff,
    color: '#555555',
    subcategorias: [
      {
        id: 'bar_1', label: 'Barreras',
        items: [
          { id: 'b1', label: 'Sistemas de prevención/detecciones inexistentes' },
          { id: 'b2', label: 'Sistemas de prevención/detección no cumplen con su objetivo' },
          { id: 'b3', label: 'Sistemas de recuperación inexistentes' },
          { id: 'b4', label: 'Sistemas de recuperación no cumplen con su objetivo' },
          { id: 'b5', label: 'Sistemas de mitigación inexistentes' },
          { id: 'b6', label: 'Sistemas de mitigación no cumplen con su objetivo' },
        ],
      },
    ],
  },
];

export default function SistemicoPicker({ value = [], onChange }) {
  const [activeCat, setActiveCat] = useState(null);
  const [activeSubcat, setActiveSubcat] = useState(null);

  const cat = CATEGORIAS.find(c => c.id === activeCat);
  const subcat = cat?.subcategorias.find(s => s.id === activeSubcat);

  const toggle = (item, catLabel, subcatLabel) => {
    const exists = value.find(v => v.id === item.id);
    if (exists) {
      onChange(value.filter(v => v.id !== item.id));
    } else {
      onChange([...value, { id: item.id, label: item.label, categoria: catLabel, subcategoria: subcatLabel, nota: '' }]);
    }
  };

  const updateNota = (id, nota) => {
    onChange(value.map(v => v.id === id ? { ...v, nota } : v));
  };

  const isSelected = id => value.some(v => v.id === id);

  const handleCatClick = (catId) => {
    if (activeCat === catId) { setActiveCat(null); setActiveSubcat(null); }
    else { setActiveCat(catId); setActiveSubcat(null); }
  };

  const handleSubcatClick = (subcatId) => {
    setActiveSubcat(activeSubcat === subcatId ? null : subcatId);
  };

  return (
    <div className="sist-picker">

      {/* ── Categorías como cards estilo incd-tecnica-card ── */}
      <div className="sist-cats-grid">
        {CATEGORIAS.map(c => {
          const Icon = c.icon;
          const count = value.filter(v => v.categoria === c.label).length;
          const isActive = activeCat === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`sist-cat-card${isActive ? ' active' : ''}`}
              style={{ '--cat-color': c.color }}
              onClick={() => handleCatClick(c.id)}
            >
              <div className="sist-cat-card-icon">
                <Icon size={22} />
              </div>
              <span className="sist-cat-card-title">{c.shortLabel}</span>
              {count > 0 && (
                <span className="sist-cat-card-count">{count} seleccionada{count !== 1 ? 's' : ''}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Panel drill-down ── */}
      {cat && (
        <div className="sist-panel" style={{ '--cat-color': cat.color }}>

          {/* Subcategorías */}
          <div className="sist-subcats">
            <p className="sist-panel-label">Subcategorías</p>
            {cat.subcategorias.map(s => {
              const count = value.filter(v => v.subcategoria === s.label).length;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`sist-subcat-btn${activeSubcat === s.id ? ' active' : ''}`}
                  onClick={() => handleSubcatClick(s.id)}
                >
                  <ChevronRight size={13} className="sist-subcat-chevron" />
                  <span>{s.label}</span>
                  {count > 0 && (
                    <span className="sist-subcat-badge">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ítems */}
          <div className="sist-items">
            {!subcat ? (
              <div className="sist-items-empty">
                <ChevronRight size={16} />
                <span>Seleccioná una subcategoría</span>
              </div>
            ) : (
              <>
                <p className="sist-panel-label">{subcat.label}</p>
                {subcat.items.map(item => {
                  const sel = isSelected(item.id);
                  const entry = value.find(v => v.id === item.id);
                  return (
                    <div key={item.id} className={`sist-item${sel ? ' selected' : ''}`}>
                      <label className="sist-item-row">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggle(item, cat.label, subcat.label)}
                        />
                        <span>{item.label}</span>
                      </label>
                      {sel && (
                        <textarea
                          className="sist-item-nota"
                          rows={2}
                          placeholder="¿Por qué esta causa contribuyó al incidente? (opcional)"
                          value={entry?.nota || ''}
                          onChange={e => updateNota(item.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Causas seleccionadas ── */}
      {value.length > 0 && (
        <div className="sist-tags">
          <p className="sist-tags-title">Causas identificadas <span className="sist-tags-count">{value.length}</span></p>
          <div className="sist-tags-list">
            {value.map(v => {
              const tagCat = CATEGORIAS.find(c => c.label === v.categoria);
              return (
                <div key={v.id} className="sist-tag" style={{ '--tag-color': tagCat?.color || '#555' }}>
                  <div className="sist-tag-main">
                    <span className="sist-tag-dot" />
                    <span className="sist-tag-text">{v.label}</span>
                    <button type="button" onClick={() => onChange(value.filter(x => x.id !== v.id))}>
                      <X size={11} />
                    </button>
                  </div>
                  {v.nota && (
                    <p className="sist-tag-nota">"{v.nota}"</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
