export const NORMAS_ESTRUCTURA = {
  'ISO 9001': [
    {
      id: '4', label: '4 - Contexto de la organización', sub: [
        { id: '4.1', label: '4.1 - Comprensión de la organización y de su contexto' },
        { id: '4.2', label: '4.2 - Comprensión de las necesidades y expectativas de las partes interesadas' },
        { id: '4.3', label: '4.3 - Determinación del alcance del SGC' },
        { id: '4.4', label: '4.4 - Sistema de gestión de la calidad y sus procesos', sub: [
          { id: '4.4.1', label: '4.4.1 - Requisitos generales del SGC' },
          { id: '4.4.2', label: '4.4.2 - Información documentada del SGC' },
        ]},
      ],
    },
    {
      id: '5', label: '5 - Liderazgo', sub: [
        { id: '5.1', label: '5.1 - Liderazgo y compromiso', sub: [
          { id: '5.1.1', label: '5.1.1 - Generalidades' },
          { id: '5.1.2', label: '5.1.2 - Enfoque al cliente' },
        ]},
        { id: '5.2', label: '5.2 - Política', sub: [
          { id: '5.2.1', label: '5.2.1 - Establecimiento de la política de calidad' },
          { id: '5.2.2', label: '5.2.2 - Comunicación de la política de calidad' },
        ]},
        { id: '5.3', label: '5.3 - Roles, responsabilidades y autoridades' },
      ],
    },
    {
      id: '6', label: '6 - Planificación', sub: [
        { id: '6.1', label: '6.1 - Acciones para abordar riesgos y oportunidades', sub: [
          { id: '6.1.1', label: '6.1.1 - Generalidades' },
          { id: '6.1.2', label: '6.1.2 - Planificación de acciones' },
        ]},
        { id: '6.2', label: '6.2 - Objetivos de calidad y planificación', sub: [
          { id: '6.2.1', label: '6.2.1 - Objetivos de calidad' },
          { id: '6.2.2', label: '6.2.2 - Planificación para lograr los objetivos' },
        ]},
        { id: '6.3', label: '6.3 - Planificación de los cambios' },
      ],
    },
    {
      id: '7', label: '7 - Apoyo', sub: [
        { id: '7.1', label: '7.1 - Recursos', sub: [
          { id: '7.1.1', label: '7.1.1 - Generalidades' },
          { id: '7.1.2', label: '7.1.2 - Personas' },
          { id: '7.1.3', label: '7.1.3 - Infraestructura' },
          { id: '7.1.4', label: '7.1.4 - Ambiente para la operación de los procesos' },
          { id: '7.1.5', label: '7.1.5 - Recursos de seguimiento y medición', sub: [
            { id: '7.1.5.1', label: '7.1.5.1 - Generalidades' },
            { id: '7.1.5.2', label: '7.1.5.2 - Trazabilidad de las mediciones' },
          ]},
          { id: '7.1.6', label: '7.1.6 - Conocimientos de la organización' },
        ]},
        { id: '7.2', label: '7.2 - Competencia' },
        { id: '7.3', label: '7.3 - Toma de conciencia' },
        { id: '7.4', label: '7.4 - Comunicación' },
        { id: '7.5', label: '7.5 - Información documentada', sub: [
          { id: '7.5.1', label: '7.5.1 - Generalidades' },
          { id: '7.5.2', label: '7.5.2 - Creación y actualización' },
          { id: '7.5.3', label: '7.5.3 - Control de la información documentada' },
        ]},
      ],
    },
    {
      id: '8', label: '8 - Operación', sub: [
        { id: '8.1', label: '8.1 - Planificación y control operacional' },
        { id: '8.2', label: '8.2 - Requisitos para los productos y servicios', sub: [
          { id: '8.2.1', label: '8.2.1 - Comunicación con el cliente' },
          { id: '8.2.2', label: '8.2.2 - Determinación de los requisitos' },
          { id: '8.2.3', label: '8.2.3 - Revisión de los requisitos', sub: [
            { id: '8.2.3.1', label: '8.2.3.1 - Generalidades' },
            { id: '8.2.3.2', label: '8.2.3.2 - Información documentada' },
          ]},
          { id: '8.2.4', label: '8.2.4 - Cambios en los requisitos' },
        ]},
        { id: '8.3', label: '8.3 - Diseño y desarrollo', sub: [
          { id: '8.3.1', label: '8.3.1 - Generalidades' },
          { id: '8.3.2', label: '8.3.2 - Planificación del diseño y desarrollo' },
          { id: '8.3.3', label: '8.3.3 - Entradas para el diseño y desarrollo' },
          { id: '8.3.4', label: '8.3.4 - Controles del diseño y desarrollo' },
          { id: '8.3.5', label: '8.3.5 - Salidas del diseño y desarrollo' },
          { id: '8.3.6', label: '8.3.6 - Cambios del diseño y desarrollo' },
        ]},
        { id: '8.4', label: '8.4 - Control de procesos, productos y servicios externos', sub: [
          { id: '8.4.1', label: '8.4.1 - Generalidades' },
          { id: '8.4.2', label: '8.4.2 - Tipo y alcance del control' },
          { id: '8.4.3', label: '8.4.3 - Información para los proveedores externos' },
        ]},
        { id: '8.5', label: '8.5 - Producción y provisión del servicio', sub: [
          { id: '8.5.1', label: '8.5.1 - Control de la producción y provisión del servicio' },
          { id: '8.5.2', label: '8.5.2 - Identificación y trazabilidad' },
          { id: '8.5.3', label: '8.5.3 - Propiedad perteneciente a los clientes' },
          { id: '8.5.4', label: '8.5.4 - Preservación' },
          { id: '8.5.5', label: '8.5.5 - Actividades posteriores a la entrega' },
          { id: '8.5.6', label: '8.5.6 - Control de los cambios' },
        ]},
        { id: '8.6', label: '8.6 - Liberación de los productos y servicios' },
        { id: '8.7', label: '8.7 - Control de las salidas no conformes', sub: [
          { id: '8.7.1', label: '8.7.1 - Generalidades' },
          { id: '8.7.2', label: '8.7.2 - Información documentada' },
        ]},
      ],
    },
    {
      id: '9', label: '9 - Evaluación del desempeño', sub: [
        { id: '9.1', label: '9.1 - Seguimiento, medición, análisis y evaluación', sub: [
          { id: '9.1.1', label: '9.1.1 - Generalidades' },
          { id: '9.1.2', label: '9.1.2 - Satisfacción del cliente' },
          { id: '9.1.3', label: '9.1.3 - Análisis y evaluación' },
        ]},
        { id: '9.2', label: '9.2 - Auditoría interna', sub: [
          { id: '9.2.1', label: '9.2.1 - Generalidades' },
          { id: '9.2.2', label: '9.2.2 - Programa de auditoría interna' },
        ]},
        { id: '9.3', label: '9.3 - Revisión por la dirección', sub: [
          { id: '9.3.1', label: '9.3.1 - Generalidades' },
          { id: '9.3.2', label: '9.3.2 - Entradas de la revisión' },
          { id: '9.3.3', label: '9.3.3 - Salidas de la revisión' },
        ]},
      ],
    },
    {
      id: '10', label: '10 - Mejora', sub: [
        { id: '10.1', label: '10.1 - Generalidades' },
        { id: '10.2', label: '10.2 - No conformidad y acción correctiva', sub: [
          { id: '10.2.1', label: '10.2.1 - Gestión de no conformidades' },
          { id: '10.2.2', label: '10.2.2 - Información documentada' },
        ]},
        { id: '10.3', label: '10.3 - Mejora continua' },
      ],
    },
  ],

  'ISO 14001': [
    {
      id: '4', label: '4 - Contexto de la organización', sub: [
        { id: '4.1', label: '4.1 - Comprensión de la organización y de su contexto' },
        { id: '4.2', label: '4.2 - Comprensión de las necesidades y expectativas de las partes interesadas' },
        { id: '4.3', label: '4.3 - Determinación del alcance del SGA' },
        { id: '4.4', label: '4.4 - Sistema de gestión ambiental' },
      ],
    },
    {
      id: '5', label: '5 - Liderazgo', sub: [
        { id: '5.1', label: '5.1 - Liderazgo y compromiso' },
        { id: '5.2', label: '5.2 - Política ambiental' },
        { id: '5.3', label: '5.3 - Roles, responsabilidades y autoridades' },
      ],
    },
    {
      id: '6', label: '6 - Planificación', sub: [
        { id: '6.1', label: '6.1 - Acciones para abordar riesgos y oportunidades', sub: [
          { id: '6.1.1', label: '6.1.1 - Generalidades' },
          { id: '6.1.2', label: '6.1.2 - Aspectos ambientales' },
          { id: '6.1.3', label: '6.1.3 - Requisitos legales y otros requisitos' },
          { id: '6.1.4', label: '6.1.4 - Planificación de acciones' },
        ]},
        { id: '6.2', label: '6.2 - Objetivos ambientales y planificación', sub: [
          { id: '6.2.1', label: '6.2.1 - Objetivos ambientales' },
          { id: '6.2.2', label: '6.2.2 - Planificación para lograr los objetivos' },
        ]},
      ],
    },
    {
      id: '7', label: '7 - Apoyo', sub: [
        { id: '7.1', label: '7.1 - Recursos' },
        { id: '7.2', label: '7.2 - Competencia' },
        { id: '7.3', label: '7.3 - Toma de conciencia' },
        { id: '7.4', label: '7.4 - Comunicación', sub: [
          { id: '7.4.1', label: '7.4.1 - Generalidades' },
          { id: '7.4.2', label: '7.4.2 - Comunicación interna' },
          { id: '7.4.3', label: '7.4.3 - Comunicación externa' },
        ]},
        { id: '7.5', label: '7.5 - Información documentada', sub: [
          { id: '7.5.1', label: '7.5.1 - Generalidades' },
          { id: '7.5.2', label: '7.5.2 - Creación y actualización' },
          { id: '7.5.3', label: '7.5.3 - Control de la información documentada' },
        ]},
      ],
    },
    {
      id: '8', label: '8 - Operación', sub: [
        { id: '8.1', label: '8.1 - Planificación y control operacional', sub: [
          { id: '8.1.1', label: '8.1.1 - Generalidades' },
          { id: '8.1.2', label: '8.1.2 - Eliminar la fuente o sustituir' },
          { id: '8.1.3', label: '8.1.3 - Gestión del cambio' },
          { id: '8.1.4', label: '8.1.4 - Adquisiciones' },
          { id: '8.1.5', label: '8.1.5 - Contratación externa' },
        ]},
        { id: '8.2', label: '8.2 - Preparación y respuesta ante emergencias' },
      ],
    },
    {
      id: '9', label: '9 - Evaluación del desempeño', sub: [
        { id: '9.1', label: '9.1 - Seguimiento, medición, análisis y evaluación', sub: [
          { id: '9.1.1', label: '9.1.1 - Generalidades' },
          { id: '9.1.2', label: '9.1.2 - Evaluación del cumplimiento' },
        ]},
        { id: '9.2', label: '9.2 - Auditoría interna', sub: [
          { id: '9.2.1', label: '9.2.1 - Generalidades' },
          { id: '9.2.2', label: '9.2.2 - Programa de auditoría interna' },
        ]},
        { id: '9.3', label: '9.3 - Revisión por la dirección' },
      ],
    },
    {
      id: '10', label: '10 - Mejora', sub: [
        { id: '10.1', label: '10.1 - Generalidades' },
        { id: '10.2', label: '10.2 - No conformidad y acción correctiva' },
        { id: '10.3', label: '10.3 - Mejora continua' },
      ],
    },
  ],

  'ISO 45001': [
    {
      id: '4', label: '4 - Contexto de la organización', sub: [
        { id: '4.1', label: '4.1 - Comprensión de la organización y de su contexto' },
        { id: '4.2', label: '4.2 - Comprensión de las necesidades y expectativas de los trabajadores y otras partes interesadas' },
        { id: '4.3', label: '4.3 - Determinación del alcance del SGSST' },
        { id: '4.4', label: '4.4 - Sistema de gestión de la SST' },
      ],
    },
    {
      id: '5', label: '5 - Liderazgo y participación de los trabajadores', sub: [
        { id: '5.1', label: '5.1 - Liderazgo y compromiso' },
        { id: '5.2', label: '5.2 - Política de la SST' },
        { id: '5.3', label: '5.3 - Roles, responsabilidades y autoridades' },
        { id: '5.4', label: '5.4 - Consulta y participación de los trabajadores' },
      ],
    },
    {
      id: '6', label: '6 - Planificación', sub: [
        { id: '6.1', label: '6.1 - Acciones para abordar riesgos y oportunidades', sub: [
          { id: '6.1.1', label: '6.1.1 - Generalidades' },
          { id: '6.1.2', label: '6.1.2 - Identificación de peligros y evaluación de riesgos', sub: [
            { id: '6.1.2.1', label: '6.1.2.1 - Identificación de peligros' },
            { id: '6.1.2.2', label: '6.1.2.2 - Evaluación de riesgos para la SST' },
            { id: '6.1.2.3', label: '6.1.2.3 - Evaluación de otras oportunidades' },
          ]},
          { id: '6.1.3', label: '6.1.3 - Determinación de requisitos legales y otros requisitos' },
          { id: '6.1.4', label: '6.1.4 - Planificación de acciones' },
        ]},
        { id: '6.2', label: '6.2 - Objetivos de la SST y planificación', sub: [
          { id: '6.2.1', label: '6.2.1 - Objetivos de la SST' },
          { id: '6.2.2', label: '6.2.2 - Planificación para lograr los objetivos' },
        ]},
      ],
    },
    {
      id: '7', label: '7 - Apoyo', sub: [
        { id: '7.1', label: '7.1 - Recursos' },
        { id: '7.2', label: '7.2 - Competencia' },
        { id: '7.3', label: '7.3 - Toma de conciencia' },
        { id: '7.4', label: '7.4 - Comunicación', sub: [
          { id: '7.4.1', label: '7.4.1 - Generalidades' },
          { id: '7.4.2', label: '7.4.2 - Comunicación interna' },
          { id: '7.4.3', label: '7.4.3 - Comunicación externa' },
        ]},
        { id: '7.5', label: '7.5 - Información documentada', sub: [
          { id: '7.5.1', label: '7.5.1 - Generalidades' },
          { id: '7.5.2', label: '7.5.2 - Creación y actualización' },
          { id: '7.5.3', label: '7.5.3 - Control de la información documentada' },
        ]},
      ],
    },
    {
      id: '8', label: '8 - Operación', sub: [
        { id: '8.1', label: '8.1 - Planificación y control operacional', sub: [
          { id: '8.1.1', label: '8.1.1 - Generalidades' },
          { id: '8.1.2', label: '8.1.2 - Eliminar peligros y reducir riesgos' },
          { id: '8.1.3', label: '8.1.3 - Gestión del cambio' },
          { id: '8.1.4', label: '8.1.4 - Adquisiciones', sub: [
            { id: '8.1.4.1', label: '8.1.4.1 - Generalidades' },
            { id: '8.1.4.2', label: '8.1.4.2 - Contratistas' },
            { id: '8.1.4.3', label: '8.1.4.3 - Contratación externa' },
          ]},
        ]},
        { id: '8.2', label: '8.2 - Preparación y respuesta ante emergencias' },
      ],
    },
    {
      id: '9', label: '9 - Evaluación del desempeño', sub: [
        { id: '9.1', label: '9.1 - Seguimiento, medición, análisis y evaluación', sub: [
          { id: '9.1.1', label: '9.1.1 - Generalidades' },
          { id: '9.1.2', label: '9.1.2 - Evaluación del cumplimiento' },
        ]},
        { id: '9.2', label: '9.2 - Auditoría interna', sub: [
          { id: '9.2.1', label: '9.2.1 - Generalidades' },
          { id: '9.2.2', label: '9.2.2 - Programa de auditoría interna' },
        ]},
        { id: '9.3', label: '9.3 - Revisión por la dirección' },
      ],
    },
    {
      id: '10', label: '10 - Mejora', sub: [
        { id: '10.1', label: '10.1 - Generalidades' },
        { id: '10.2', label: '10.2 - Incidentes, no conformidades y acciones correctivas' },
        { id: '10.3', label: '10.3 - Mejora continua' },
      ],
    },
  ],

  'ISO 27001': [
    {
      id: '4', label: '4 - Contexto de la organización', sub: [
        { id: '4.1', label: '4.1 - Comprensión de la organización y de su contexto' },
        { id: '4.2', label: '4.2 - Comprensión de las necesidades y expectativas de las partes interesadas' },
        { id: '4.3', label: '4.3 - Determinación del alcance del SGSI' },
        { id: '4.4', label: '4.4 - Sistema de gestión de seguridad de la información' },
      ],
    },
    {
      id: '5', label: '5 - Liderazgo', sub: [
        { id: '5.1', label: '5.1 - Liderazgo y compromiso' },
        { id: '5.2', label: '5.2 - Política' },
        { id: '5.3', label: '5.3 - Roles, responsabilidades y autoridades' },
      ],
    },
    {
      id: '6', label: '6 - Planificación', sub: [
        { id: '6.1', label: '6.1 - Acciones para abordar riesgos y oportunidades', sub: [
          { id: '6.1.1', label: '6.1.1 - Generalidades' },
          { id: '6.1.2', label: '6.1.2 - Evaluación de riesgos de seguridad de la información' },
          { id: '6.1.3', label: '6.1.3 - Tratamiento de riesgos de seguridad de la información' },
        ]},
        { id: '6.2', label: '6.2 - Objetivos de seguridad de la información y planificación' },
        { id: '6.3', label: '6.3 - Planificación de los cambios' },
      ],
    },
    {
      id: '7', label: '7 - Apoyo', sub: [
        { id: '7.1', label: '7.1 - Recursos' },
        { id: '7.2', label: '7.2 - Competencia' },
        { id: '7.3', label: '7.3 - Toma de conciencia' },
        { id: '7.4', label: '7.4 - Comunicación' },
        { id: '7.5', label: '7.5 - Información documentada', sub: [
          { id: '7.5.1', label: '7.5.1 - Generalidades' },
          { id: '7.5.2', label: '7.5.2 - Creación y actualización' },
          { id: '7.5.3', label: '7.5.3 - Control de la información documentada' },
        ]},
      ],
    },
    {
      id: '8', label: '8 - Operación', sub: [
        { id: '8.1', label: '8.1 - Planificación y control operacional' },
        { id: '8.2', label: '8.2 - Evaluación de riesgos de seguridad de la información' },
        { id: '8.3', label: '8.3 - Tratamiento de riesgos de seguridad de la información' },
      ],
    },
    {
      id: '9', label: '9 - Evaluación del desempeño', sub: [
        { id: '9.1', label: '9.1 - Seguimiento, medición, análisis y evaluación' },
        { id: '9.2', label: '9.2 - Auditoría interna' },
        { id: '9.3', label: '9.3 - Revisión por la dirección', sub: [
          { id: '9.3.1', label: '9.3.1 - Generalidades' },
          { id: '9.3.2', label: '9.3.2 - Entradas de la revisión por la dirección' },
          { id: '9.3.3', label: '9.3.3 - Resultados de la revisión por la dirección' },
        ]},
      ],
    },
    {
      id: '10', label: '10 - Mejora', sub: [
        { id: '10.1', label: '10.1 - Mejora continua' },
        { id: '10.2', label: '10.2 - No conformidad y acción correctiva' },
      ],
    },
  ],

  'Otra': [],
};
