# Arquitectura — Ribeiro 360

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + JSX |
| Routing | React Router 7 |
| Build | Vite |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| Auth | Microsoft Entra ID (vía Supabase) |
| Animaciones | Framer Motion |
| Gráficos | Recharts |
| Íconos | Lucide React |

---

## Estructura de carpetas

```
src/
├── App.jsx                    ← Punto de entrada: rutas, lazy loading, layout shell
├── App.css                    ← Estilos globales del layout
├── index.css                  ← Variables CSS globales (:root), reset, tipografía
│
├── assets/                    ← Imágenes estáticas (Logo.png, etc.)
│
├── contexts/
│   └── AuthContext.jsx        ← Sesión y perfil del usuario (única fuente de verdad de auth)
│
├── hooks/
│   └── useNotificaciones.js   ← Lógica de notificaciones del bell (cursos + NC)
│
├── lib/
│   ├── supabase.js            ← Cliente Supabase (instancia única)
│   ├── visibilidad.js         ← Lógica de filtrado por perfil de usuario
│   ├── blockUtils.js          ← Utilidades para bloques de contenido JSON
│   └── ncNotificaciones.js    ← Lógica de notificaciones de No Conformidades
│
├── services/                  ← Acceso a Supabase, uno por dominio
│   ├── cursosService.js
│   ├── eventosService.js
│   ├── faqService.js
│   ├── novedadesService.js
│   ├── onboardingService.js
│   ├── organigramaService.js
│   ├── pafService.js
│   ├── sgiService.js
│   └── usuariosService.js
│
├── components/
│   ├── common/                ← Componentes UI reutilizables entre features
│   │   ├── LoadingSpinner.jsx
│   │   ├── EmptyState.jsx
│   │   ├── AdminListPanel.jsx
│   │   ├── FormBackHeader.jsx
│   │   ├── VisibilidadEditor.jsx
│   │   ├── CommonComponents.css
│   │   └── index.js           ← Barrel export
│   └── layout/                ← Shell de la app (siempre montado)
│       ├── Sidebar.jsx / .css
│       ├── Header.jsx / .css
│       ├── NotificacionesModal.jsx / .css
│       └── PageTransition.jsx
│
├── features/                  ← Una carpeta por dominio de negocio
│   ├── admin/
│   │   ├── AdminPanel.jsx     ← Shell del panel (~70 líneas, solo navegación)
│   │   ├── AdminPanel.css
│   │   ├── tabs/              ← Cada tab es un componente autónomo
│   │   │   ├── CapacitacionesTab.jsx
│   │   │   ├── PAFTab.jsx
│   │   │   ├── OnboardingTab.jsx
│   │   │   ├── EventosTab.jsx
│   │   │   ├── FAQTab.jsx
│   │   │   ├── OrganigramaTab.jsx
│   │   │   ├── SGITab.jsx
│   │   │   ├── NovedadesTab.jsx
│   │   │   └── UsuariosTab.jsx
│   │   └── shared/            ← Componentes internos del admin
│   │       ├── BlocksEditor.jsx
│   │       └── QuizBuilder.jsx
│   │
│   ├── dashboard/
│   │   ├── Dashboard.jsx / .css
│   │   ├── BannerNovedades.jsx / .css
│   │   └── DashboardChart.jsx
│   │
│   ├── capacitaciones/
│   │   ├── MisCursos.jsx / .css
│   │   ├── CoursePlayer.jsx / .css
│   │   ├── Certificado.jsx / .css
│   │   ├── Explorar.jsx / .css
│   │   └── portales/
│   │       ├── PortalCMASS.jsx
│   │       ├── PortalAdministracion.jsx
│   │       └── PortalServiciosCompartidos.jsx
│   │
│   ├── sgi/
│   │   ├── SGI.jsx / .css
│   │   ├── SGIDocument.jsx / .css
│   │   ├── SGIEstadisticas.jsx / .css
│   │   └── nc/
│   │       ├── NoConformidades.jsx / .css
│   │       ├── NCDetalle.jsx / .css
│   │       └── NCInformePDF.jsx
│   │
│   ├── directorio/    → Directorio.jsx / .css
│   ├── eventos/       → Eventos.jsx / .css
│   ├── faq/           → FAQ.jsx / .css
│   ├── onboarding/    → Onboarding.jsx / .css
│   ├── organigrama/   → Organigrama.jsx / .css
│   └── perfil/        → Perfil.jsx / .css
│
└── pages/
    └── Login.jsx / .css       ← Única página fuera de features (no requiere layout)
```

---

## Capa de servicios (`src/services/`)

Todos los accesos a Supabase pasan por acá. Ningún componente llama a `supabase` directamente — excepto `SGITab.jsx` para generar URLs firmadas de descarga, que no tiene una abstracción limpia en la capa de servicio todavía.

### Convención

Cada función retorna `{ data, error }` (mismo contrato que Supabase). Los componentes solo manejan el resultado, no la lógica de base de datos.

```js
// Ejemplo: src/services/eventosService.js
export async function fetchEventos() {
  const { data, error } = await supabase
    .from('eventos')
    .select('*, categoria:eventos_categorias(nombre, color), area:areas(nombre, color)')
    .order('fecha');
  if (error) console.error('[eventosService] fetchEventos:', error.message);
  return { data: data ?? [], error };
}
```

### Servicios disponibles

| Archivo | Tablas Supabase que maneja |
|---|---|
| `cursosService.js` | `cursos`, `cursos_modulos`, `cursos_visibilidad`, `cursos_destinatarios`, `cursos_categorias` |
| `eventosService.js` | `eventos`, `eventos_visibilidad`, `eventos_categorias`, `areas` |
| `faqService.js` | `faq_preguntas`, `faq_sectores` |
| `novedadesService.js` | `novedades`, storage bucket `novedades` |
| `onboardingService.js` | `onboarding_steps`, `onboarding_bloques` |
| `organigramaService.js` | `organigrama_nodos` |
| `pafService.js` | `paf_planes`, `paf_items` |
| `sgiService.js` | `sgi_categorias`, `sgi_documentos`, `sgi_versiones`, storage bucket `sgi-documentos` |
| `usuariosService.js` | `profiles` (RPC `admin_update_user_role`) |

---

## Utilidades de librería (`src/lib/`)

### `visibilidad.js`

Centraliza la lógica de "¿este usuario puede ver este contenido?" que antes estaba duplicada en tres archivos.

```js
import { visMatchesProfile, courseIsVisible, eventoIsVisible } from '../lib/visibilidad';

// ¿el usuario cumple alguna regla de visibilidad?
visMatchesProfile(rules, profile)

// ¿puede ver este curso? (considera destinatarios individuales + reglas)
courseIsVisible(cursoId, destCursoIds, visRules, profile)

// ¿puede ver este evento?
eventoIsVisible(eventoId, visRules, profile)
```

**Usada en:** `Dashboard.jsx`, `MisCursos.jsx`, `useNotificaciones.js`

---

### `blockUtils.js`

Los módulos de cursos y pasos de onboarding almacenan su contenido como JSON en un campo de texto. Estas utilidades manejan esa estructura de forma inmutable.

```js
import { parseBlocks, updateBlockInList, updateBlockMetaInList } from '../lib/blockUtils';

// Parsea el JSON del campo `contenido` (maneja texto plano legacy)
const blocks = parseBlocks(modulo.contenido);

// Actualiza un campo de un bloque por id
const newBlocks = updateBlockInList(blocks, blockId, 'contenido', newValue);

// Actualiza un campo dentro de block.metadata
const newBlocks = updateBlockMetaInList(blocks, blockId, 'bg_color', '#ff0000');
```

**Usada en:** `CapacitacionesTab.jsx`, `OnboardingTab.jsx`

---

## Componentes comunes (`src/components/common/`)

Importar siempre desde el barrel:

```js
import { LoadingSpinner, PageLoader, EmptyState, AdminListPanel, VisibilidadEditor } from '../../components/common';
```

### `LoadingSpinner` / `PageLoader`

```jsx
// Spinner inline (dentro de una sección)
<LoadingSpinner size={24} />

// Loader de pantalla completa (usado en Suspense)
<PageLoader />
```

---

### `EmptyState`

Estado vacío estándar para listas sin datos.

```jsx
<EmptyState
  icon={<Calendar size={40} />}
  message="No hay eventos creados aún."
  action={<button onClick={handleCreate}>Crear el primero</button>} // opcional
/>
```

---

### `AdminListPanel`

Wrapper para las listas del panel de administración. Genera el encabezado con título, contador y botón de alta.

```jsx
<AdminListPanel
  title="Eventos"
  count={eventos.length}
  addLabel="Nuevo Evento"   // opcional — si se omite no muestra botón
  onAdd={handleCreate}       // opcional
>
  {/* contenido de la lista */}
</AdminListPanel>
```

---

### `VisibilidadEditor`

Editor de reglas de visibilidad por perfil. Se usa en `EventosTab` y `CapacitacionesTab`.

```jsx
// rules: [{ id, campo, valor }]
// onChange recibe el array actualizado completo
// profileValues: { job_title: [], department: [], office_location: [] }

<VisibilidadEditor
  rules={editingVisibilidad}
  onChange={setEditingVisibilidad}
  profileValues={profileValues}
/>
```

Los valores de `profileValues` se obtienen con `fetchProfileValues()` de `usuariosService`.

---

## Componentes internos del admin (`features/admin/shared/`)

Solo los tabs del panel de administración los usan. No forman parte del barrel de `common/`.

### `BlocksEditor`

Editor visual para listas de bloques de contenido (texto, imagen, video, banner, cards).

```jsx
import BlocksEditor from '../shared/BlocksEditor';

<BlocksEditor
  blocks={parseBlocks(modulo.contenido)}
  onUpdate={(id, field, value) => updateModuleBlock(mIdx, id, field, value)}
  onUpdateMeta={(id, key, value) => updateModuleBlockMeta(mIdx, id, key, value)}
  onRemove={(id) => removeBlockFromModule(mIdx, id)}
  onAdd={(tipo) => handleAddBlockToModule(mIdx, tipo)}
/>
```

**Tipos de bloque soportados:** `texto`, `imagen`, `video`, `banner`, `cards`

---

### `QuizBuilder`

Editor del cuestionario final de un curso. Recibe el estado y su setter directamente — maneja los handlers internamente.

```jsx
import QuizBuilder from '../shared/QuizBuilder';

// preguntas: [{ id, texto, opciones: [{ id, texto, correcta }] }]
<QuizBuilder
  preguntas={editingPreguntas}
  setPreguntas={setEditingPreguntas}
/>
```

---

## Panel de administración (`features/admin/`)

### `AdminPanel.jsx` — el shell

Solo maneja navegación: qué tab está activo y qué tabs puede ver el usuario según su rol/permisos.

- `superadmin` → ve todos los tabs + "Usuarios"
- `admin` → ve los tabs que tenga en `profile.admin_tabs[]`

Cuando necesites agregar un tab nuevo:
1. Crear `features/admin/tabs/NuevoTab.jsx`
2. Agregar su key al array `ALL_TABS` en `AdminPanel.jsx` y en `UsuariosTab.jsx`
3. Agregar su entrada en `TAB_CONFIG`
4. Importar y renderizar el componente en la sección de `admin-workarea`

### Tabs autónomos

Cada tab es autocontenido: maneja su propio estado, llama a sus servicios en `useEffect`, y usa los componentes de `common/`. No comparten estado entre sí.

**Patrón típico de un tab:**

```jsx
const MiTab = () => {
  const [items, setItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    const { data } = await fetchMisItems();
    setItems(data);
  };

  if (isEditing) return <FormView ... />;
  return <ListView ... />;
};
```

---

## Autenticación y perfil

El hook `useAuth()` expone:

```js
const { session, profile, isLoading } = useAuth();
```

| Campo | Tipo | Descripción |
|---|---|---|
| `session` | object / null | Sesión de Supabase |
| `profile` | object / null | Fila de `profiles` del usuario |
| `profile.role` | `'user'` / `'admin'` / `'superadmin'` | Rol del usuario |
| `profile.admin_tabs` | `string[]` / null | Tabs del admin a los que tiene acceso (null = todos) |
| `profile.job_title` | string | Puesto (usado para reglas de visibilidad) |
| `profile.department` | string | Área / Departamento |
| `profile.office_location` | string | Ubicación |

---

## Variables CSS globales

Definidas en `src/index.css` bajo `:root`. Usarlas siempre en vez de valores hardcodeados.

```css
var(--primary-color)      /* amarillo Ribeiro */
var(--bg-main)            /* fondo principal */
var(--bg-card)            /* fondo de tarjetas */
var(--bg-hover)           /* hover de elementos */
var(--text-main)          /* texto principal */
var(--text-muted)         /* texto secundario */
var(--border-color)       /* bordes */
```

El dark mode se maneja agregando la clase `.dark` al `<html>`. Las variables se redefinen automáticamente.

---

## Cómo agregar una feature nueva

Ejemplo: agregar una sección "Comunicados".

**1. Servicio**

```js
// src/services/comunicadosService.js
export async function fetchComunicados() { ... }
export async function saveComunicado(payload) { ... }
export async function deleteComunicado(id) { ... }
```

**2. Feature page (si tiene ruta propia)**

```
src/features/comunicados/
  Comunicados.jsx
  Comunicados.css
```

**3. Ruta en `App.jsx`**

```js
const Comunicados = lazy(() => import('./features/comunicados/Comunicados'));
// ...
<Route path="/comunicados" element={<W><Comunicados /></W>} />
```

**4. Tab en el admin (si necesita gestión)**

```
src/features/admin/tabs/ComunicadosTab.jsx
```

Agregar en `AdminPanel.jsx`:
- Key en `ALL_TABS`
- Entrada en `TAB_CONFIG`
- `{activeTab === 'comunicados' && <ComunicadosTab />}`

Agregar en `UsuariosTab.jsx`:
- Key en `ALL_TABS`
- Entrada en `TAB_ICONS` y `TAB_LABELS`

---

## Decisiones de diseño

**¿Por qué `features/` en vez de mantener todo en `components/`?**
Con más de 25 archivos JSX en una sola carpeta, encontrar qué pertenece a qué dominio era difícil. La estructura por feature agrupa todo lo que cambia junto: vista, estilos, lógica relacionada.

**¿Por qué una capa de servicios separada?**
Antes, las queries de Supabase estaban mezcladas con el render. Si cambia un esquema, hay que buscar en todos los componentes. Con servicios centralizados, el cambio es en un solo lugar.

**¿Por qué tabs autónomos en el admin?**
El `AdminPanel.jsx` original tenía 2500+ líneas y 75+ `useState`. Era imposible leer, imposible tocar sin romper otra cosa. Cada tab autónomo tiene su propio scope — podés editar `FAQTab.jsx` sin miedo a afectar `CapacitacionesTab.jsx`.

**¿Por qué `components/common/` y no una librería de componentes?**
Son 5-6 componentes con CSS variables del proyecto. Una librería externa agregaría fricción para algo que es 100% específico al diseño de esta app.

**¿Por qué no TypeScript?**
Decisión del proyecto: la velocidad de iteración con JSX puro es suficiente para el equipo actual. Si el equipo crece, la migración sería gradual empezando por los servicios (las firmas de función son el lugar donde los tipos dan más valor).
