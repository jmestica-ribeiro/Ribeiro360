# Esquema de Base de Datos (Compacto)

*Índice de tablas y columnas principales para referencia rápida del Agente. Este archivo ahorra un 75% de tokens vs JSON.*

### profiles
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| id | string | uuid | PK |
| full_name | string | | Nombre completo |
| email | string | | Correo corporativo |
| avatar_url | string | | |
| job_title | string | | Puesto |
| department | string | | Departamento / Gerencia |
| sucursal | string | | Sitio / Sede |

### nav_config
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| key | string | text | PK — clave del ítem (explorar, cursos, sgi, etc.) |
| visible | boolean | | Si false, el ítem se oculta del sidebar para todos |

### portales_config
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| departamento | string | text | PK — nombre exacto del departamento |
| publico | boolean | | Si true, visible para todos los empleados |

### sgi_categorias
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| id | string | uuid | PK |
| nombre | string | | |
| icono | string | | Lucide Icon name |
| orden | integer | | Orden de jerarquía |
| parent_id | string | uuid | Para árbol de carpetas |

### sgi_documentos
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| id | string | uuid | PK |
| codigo | string | | Ej: POE-RRHH-01 |
| nombre | string | | |
| categoria_id | string | uuid | |
| activo | boolean | | |

### sgi_versiones
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| id | string | uuid | PK |
| documento_id | string | uuid | |
| numero_version | string | | |
| vigente | boolean | | Solo una activa |
| archivo_url | string | | Path en Storage |

### nc_hallazgos
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| id | string | uuid | PK |
| numero | string | | NC-2026-001 |
| tipo | string | enum | NC, OBS, OM, Fortaleza |
| estado | string | enum | abierto, proceso, cerrado |
| gerencia | string | | Area responsable |
| descripcion | string | | |

### nc_acciones
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| id | string | uuid | PK |
| hallazgo_id | string | uuid | |
| descripcion | string | | |
| responsable_id | string | uuid | |
| estado | string | | pendiente, cerrada |
| avance | integer | | 0-100 |

### cursos
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| id | string | uuid | PK |
| nombre | string | | |
| descripcion | string | | |
| imagen_url | string | | Portada |
| activo | boolean | | |

### cursos_modulos
| Columna | Tipo | Formato | Info |
|:---|:---|:---|:---|
| id | string | uuid | PK |
| curso_id | string | uuid | |
| orden | integer | | |
| contenido | string | json | Bloques de contenido |
