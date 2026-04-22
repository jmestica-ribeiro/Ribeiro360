# Mapa de Servicios de Datos

*Índice de funciones disponibles en la capa de servicios para acceso rápido del Agente.*

## [navService.js](../../src/services/navService.js)
- `fetchNavConfig()` — obtiene array `{ key, visible }[]` de ítems del sidebar
- `updateNavItem(key, visible)` — upsert visibilidad de un ítem del menú

## [portalesService.js](../../src/services/portalesService.js)
- `fetchPortalesConfig()` — obtiene mapa de visibilidad `{ departamento, publico }[]`
- `updatePortalVisibilidad(departamento, publico)` — upsert visibilidad de un portal

## [cursosService.js](../../src/services/cursosService.js)
- `fetchCursos()`
- `fetchCursosCategorias()`
- `fetchCursoDetalle(cursoId)`
- `saveCurso(cursoData, modulos, visibilidadRules, destinatarios)`
- `deleteCurso(id)`

## [eventosService.js](../../src/services/eventosService.js)
- `fetchEventos()`
- `fetchEventosCategorias()`
- `fetchAreas()`
- `fetchEventoVisibilidad(eventoId)`
- `saveEvento(eventoPayload, visibilidadRules = [])`
- `deleteEvento(id)`
- `fetchEventosByDateRange(from, to)`
- `fetchEventosVisibilidad()`

## [faqService.js](../../src/services/faqService.js)
- `fetchFaqPreguntas()`
- `fetchFaqSectores()`
- `saveFaqPregunta(payload)`
- `deleteFaqPregunta(id)`
- `saveFaqSector(payload)`
- `deleteFaqSector(id)`
- `fetchFaqPreguntasActivas()`

## [novedadesService.js](../../src/services/novedadesService.js)
- `fetchNovedades()`
- `uploadNovedadImagen(file)`
- `insertNovedad(payload)`
- `updateNovedad(id, fields)`
- `deleteNovedad(id, imagenPath)`
- `swapNovedadOrden(a, b)`

## [onboardingService.js](../../src/services/onboardingService.js)
- `fetchOnboardingSteps()`
- `fetchOnboardingBloques(stepId)`
- `saveOnboardingStep(stepData, bloques)`
- `deleteOnboardingStep(id)`
- `reorderOnboardingSteps(stepsOrdenados)`
- `fetchOnboardingContenido()`

## [organigramaService.js](../../src/services/organigramaService.js)
- `fetchOrgNodos()`
- `saveOrgNodo(payload)`
- `deleteOrgNodo(id)`

## [pafService.js](../../src/services/pafService.js)
- `fetchPAF()`
- `createPafPlan(anio)`
- `savePafItem(payload)`
- `deletePafItem(id)`

## [sgiService.js](../../src/services/sgiService.js)
- `fetchSGI()`
- `fetchVersionVigente(documentoId)`
- `saveSgiCategoria(payload)`
- `deleteSgiCategoria(id)`
- `saveSgiDocumento(docPayload, versionData)`
- `softDeleteSgiDocumento(id)`
- `uploadSgiArchivo(documentoId, version, file)`
- `saveSgiVersion(payload)`
- `deleteSgiVersion(id)`
- `fetchSgiCategoriasActivas()`
- `fetchSgiDocsCounts()`
- `fetchSgiDocumentosByCategoria(categoriaId)`
- `fetchSgiDocumentoById(docId)`
- `fetchSgiVersionesByDocumento(documentoId)`
- `fetchSgiVersionesPendientes()`
- `reviewSgiVersion(versionId, reviewerProfile, comentario = null)`
- `approveSgiVersion(versionId, documentoId, approverProfile, comentario = null)`
- `rejectSgiVersion(versionId, comentario = null)`
- `getSgiSignedUrl(path, seconds = 60)`
- `fetchSgiEstadisticasData()`
- `fetchNcHallazgosAbiertos()`
- `fetchNcGerencias()`
- `fetchNcHallazgos({ tipo, estado, fechaDesde, fechaHasta, paso, gerencia } = {})`
- `fetchNcInformeData(hallazgoId)`

## [usuariosService.js](../../src/services/usuariosService.js)
- `fetchAllUsers()`
- `fetchProfileValues()`
- `updateUserRoleAndTabs(userId, newRole, adminTabs)`

