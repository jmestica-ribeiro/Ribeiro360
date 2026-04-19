# Ribeiro 360 - Contexto para Claude Code

Este archivo define las reglas arquitectónicas, los comandos comunes y el contexto general de negocio para Ribeiro 360. Por favor consúltalo de manera constante a la hora de proponer modificaciones de código.

Para detalles arquitectónicos completos, siempre consultar el archivo `ARCHITECTURE.md`.

## 1. Contexto del Negocio y Funcionalidades Core

"Ribeiro 360" es una **Intranet corporativa** moderna que agrupa múltiples verticales para la gestión de los empleados y los procesos internos.

### 1.1 Módulo de Capacitaciones y Onboarding - *Alta Dinámica de Datos*
Es el ecosistema educacional y de inducción de la empresa (`src/features/capacitaciones/`):
- **Estructura Modular por Bloques:** Los cursos (`cursos`) se construyen agrupando módulos (`cursos_modulos`) de lectura secuencial. El contenido rico de los módulos se guarda como arreglos de JSON (*blocks*) que representan distintos tipos de componentes interactivos (texto, imagen, video, quiz).
- **Visibilidad Dinámica y Granular:** Un curso no es visible para todos los empleados de forma predeterminada ni se hardcodea por roles. Se define mediante cruces de metadatos en `cursos_visibilidad` (filtrando al usuario por su Puesto, Departamento o Sucursal). Alternativamente, se pueden asignar personas mediante *Destinatarios Directos* (`cursos_destinatarios`). El motor algorítmico que resuelve esto está unificado en `src/lib/visibilidad.js`.
- **Evaluaciones y Certificados:** El cierre de un curso puede disparar una evaluación. Al aprobar, el frontend inyecta dinámicamente un diploma y lo exporta a PDF visual (`jspdf`, `html2canvas`).
- Toda la orquestación de escritura y lectura de esta matriz de datos recae en `src/services/cursosService.js`.

### 1.2 Directorio, Novedades y Dashboard
- **Directorio y Organigrama:** Visualización de la estructura y árbol jerárquico de la empresa.
- **Noticias e Inicio:** Tablero dinámico o lobby con atajos operacionales y banners generados por roles.

### 1.3 Módulo SGI (Sistema de Gestión Integral) - *Alta Complejidad*
El apartado SGI (`src/features/sgi/`) es probablemente el área de mayor carga lógica de toda la empresa, dividido en dos subsistemas principales interconectados de uso diario por administradores y auditores:

**A. Gestión Documental SGI (`sgi_documentos`, `sgi_versiones`, `sgi_categorias`):**
- **Estructura Estricta:** Jerarquía en árbol para categorizar manuales, procedimientos operacionales (POEs), e instructivos.
- **Versionado Activo:** Altera el repositorio y mantiene el histórico de cada documento de la empresa. Un documento tiene múltiples registros en `sgi_versiones`, pero **asegura que solo haya una versión 'vigente'** al mismo tiempo.
- **Seguridad:** Los archivos per-se radican en el bucket privado de Storage de Supabase `sgi-documentos`. Descargarlos o visualizarlos requiere programar la generación de URLs Firmadas (Signed URLs).

**B. Sistema de No Conformidades (NC) / Hallazgos (`features/sgi/nc/`):**
- Un potente pipeline de seguimiento de desvíos, accidentes de trabajo y auditorías de calidad.
- **Hallazgos:** Captan el reclamo inicial con estado (Ej: `abierto`), una gerencia involucrada, severidad y un avance en un embudo o pipeline (pasos/steps).
- **Acciones Correctivas (`nc_acciones`):** Un mismo Hallazgo disipa múltiples acciones correctivas. Estas tienen responsables directos y metas de tiempo duras (`fecha_vencimiento`).
- **Hitos y Cierre:** El progreso de la acción no es "hecho o no hecho"; fluye a través de múltiples `hitos` (porcentajes de progreso o timeline). Al finalizar, la calidad se audita mediante una validación final (`verif_eficaz`).
- **Reportes:** Motor de renderizado en PDF interconectado  (`NCInformePDF.jsx`) que exporta el árbol semántico y auditable de (Hallazgo -> Todas sus Acciones -> Hitos de la acción).

*A la hora de mantener este módulo, la referencia principal y única central de entrada y salida es `src/services/sgiService.js`.*

## 2. Comandos Principales / Skills de Asistente
- **Desarrollo**: `npm run dev`
- **Producción**: `npm run build`
- **Linting Básico (Sintaxis)**: `npm run lint`
- **Generador de Mockup SGI**: `npm run mock:sgi`
- **Inspector de Base de Datos**: `npm run schema:fetch` *(**CRÍTICO:** Ejecute este comando si desconoce nombres de columnas o Data Types).*
- **Andamiaje de Módulos**: `npm run scaffold:feature {nombre_feature}`
- **Diagnosticador de Permisos (Visibilidad)**: `npm run debug:permissions {email} {curso_id}` *(**IMPORTANTE:** Si le piden auditar por qué un usuario no ve un sistema o arreglar `visibilidad.js`, corra esto).*
- **Verificador de Alertas/Notificaciones**: `npm run audit:notifications` *(**OBLIGATORIO:** Ejecútelo luego de codear cualquier función de guardado (insert/update). Ayuda a la IA a recordar disparar notificaciones si hay nueva actividad o reasignaciones para el usuario).*
- **Simulador de PDF A4**: `npm run preview:pdf` *(**OPCIONAL:** Úselo si necesita entender o debuggear las proporciones de `NCInformePDF.jsx` visualizando el archivo `docs/pdf_preview.html`).*
- **Escáner de Seguridad / Data Integrity**: `npm run audit:security` *(**OBLIGATORIO:** Ejecute este comando de ciberseguridad *SIEMPRE* antes de dar por finalizada la integración).*
- **Generador de Mapa de Servicios**: `npm run services:map` *(**RECOMENDADO:** Ejecute esto si hay muchos cambios en services/ para tener un índice actualizado).*

## 3. Stack Tecnológico
- **Frontend Core**: React 19, JSX, React Router 7.
- **Tooling**: Vite.
- **Backend / DB / Auth**: Supabase. La autenticación incluye integración con Microsoft Entra ID.
- **Herramientas de UI**: Vanilla CSS, Framer Motion (animaciones espaciadas), Recharts (gráficos para estadísticas), y Lucide React (íconos).

## 4. Reglas Críticas de Arquitectura (Obligatorias)

1. **Patrón de Features ("Feature-Driven")**:
   - Todo lo que cambie junto (estado, hooks, css, vistas) debe ir en la misma carpeta dentro de `src/features/`. 
   - No amontonar vistas en páginas globales. Cada feature es encapsulada (ej. `features/admin`, `features/capacitaciones`).

2. **Capa de Servicios de Datos (Supabase)**:
   - **NUNCA** importar o invocar al cliente `supabase` directamente desde un componente de UI o hooks locales (la única pequeña excepción momentánea es la generación de URL firmada en SGI).
   - Toda interacción con la base de datos se maneja a través de archivos en `src/services/` (ej. `eventosService.js`, `cursosService.js`).
   - Todos los métodos de los servicios deben retornar exactamente el contrato: `{ data, error }`.

3. **Manejo de Permisos y Perfil (Visibilidad)**:
   - El estado de la sesión y datos de perfil se manejan globalmente por medio del hook de Context: `const { session, profile, isLoading } = useAuth();`.
   - La lógica general de visibilidad de componentes (quién puede ver un curso o evento de acuerdo a su perfil) está abstraída y centralizada en `src/lib/visibilidad.js`. Recurrir a esos métodos compartidos.

4. **Variables Globales de Estilo**:
   - **Prohibido** usar colores sueltos/hardcodeados o códigos `#hex` estáticos donde aplique tema oscuro.
   - Utilizar imperativamente las **variables CSS** para todos los colores y fondos principales, definidas en `src/index.css` (ej: `var(--bg-card)`, `var(--primary-color)`, `var(--text-main)`). 
   - El Dark mode se activa mediante la clase `.dark` en el tag padre, las variables cambian automáticamente.

5. **Componentes UI Compartidos**:
   - Para carga local, usar `<LoadingSpinner />`. Para carga a pantalla completa usar `<PageLoader />`.
   - Si no hay contenido iterativo (un array vacío), utilizar `<EmptyState />`.
   - A la hora de llamar uno de estos u otros componentes base compartidos, importar invariablemente desde el *barrel file* (`import { PageLoader } from '../../components/common';`).

## 5. Model Memory & Token Optimization
- **Grep-First**: If searching for definitions, strings, or constants, use `grep -r` instead of opening files or listing broad directories.
- **Map-First**: Before opening a service file in `src/services/`, consult `docs/services_map.md` to identify the correct function.
- **Schema-First**: Use `docs/supabase_schema.md` (Markdown) instead of JSON for DB context.
- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Skip files over 100KB unless explicitly required.
- Suggest running `/cost` when a session is running long to monitor cache ratio.
- Recommend starting a new session (`/clear`) when switching to an unrelated task.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.
