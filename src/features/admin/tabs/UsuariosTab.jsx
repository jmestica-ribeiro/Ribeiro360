import React, { useState, useEffect } from 'react';
import { GraduationCap, Calendar, Rocket, MessageCircle, LayoutGrid, ShieldCheck, RefreshCw, ImageIcon, CheckCircle, AlertCircle, Search, Trash2, ChevronLeft, ChevronRight, ClipboardCheck, Truck, Tag, Rss, Wrench } from 'lucide-react';
import { fetchAllUsers, updateUserRoleAndTabs, syncMsUsers, syncMsPhotos, deleteUser } from '../../../services/usuariosService';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminListPanel, LoadingSpinner, Select } from '../../../components/common';

const ALL_TABS = ['capacitaciones', 'paf', 'onboarding', 'eventos', 'faq', 'organigrama', 'sgi', 'cert-equipos', 'checklist-items', 'vehiculos', 'familias', 'social', 'herramientas'];

const TAB_ICONS = {
  capacitaciones: <GraduationCap size={14} strokeWidth={1.5} />,
  paf:            <Calendar size={14} strokeWidth={1.5} />,
  onboarding:     <Rocket size={14} strokeWidth={1.5} />,
  eventos:        <Calendar size={14} strokeWidth={1.5} />,
  faq:            <MessageCircle size={14} strokeWidth={1.5} />,
  organigrama:    <LayoutGrid size={14} strokeWidth={1.5} />,
  sgi:            <ShieldCheck size={14} strokeWidth={1.5} />,
  'cert-equipos':    <ClipboardCheck size={14} strokeWidth={1.5} />,
  'checklist-items': <ClipboardCheck size={14} strokeWidth={1.5} />,
  vehiculos:         <Truck size={14} strokeWidth={1.5} />,
  familias:          <Tag size={14} strokeWidth={1.5} />,
  social:            <Rss size={14} strokeWidth={1.5} />,
  herramientas:      <Wrench size={14} strokeWidth={1.5} />,
};

const TAB_LABELS = {
  capacitaciones: 'Capacitaciones',
  paf:            'Plan PAF',
  onboarding:     'Onboarding',
  eventos:        'Eventos',
  faq:            'FAQ',
  organigrama:    'Organigrama',
  sgi:            'SGI',
  'cert-equipos':    'Cert. Equipos',
  'checklist-items': 'Checklists Equipo',
  vehiculos:         'Vehículos',
  familias:          'Familias Equipo',
  social:            'Social',
  herramientas:      'Herramientas',
};

const ROLE_BADGE = {
  superadmin: { label: 'Super Admin', tone: '' },
  admin:      { label: 'Admin',       tone: 'success' },
  user:       { label: 'Usuario',     tone: 'neutral' },
};

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

// ── Panel de sincronización desde Entra ID ───────────────────────────────────
const SyncPanel = ({ onSuccess }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingPhotos, setIsSyncingPhotos] = useState(false);
  const [result, setResult] = useState(null);
  const [photoResult, setPhotoResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);
    setErrorMsg('');
    const { data, error } = await syncMsUsers();
    setIsSyncing(false);
    if (error) { setErrorMsg(error.message); return; }
    setResult(data);
    onSuccess();
  };

  const handleSyncPhotos = async () => {
    setIsSyncingPhotos(true);
    setPhotoResult(null);
    setErrorMsg('');
    const { data, error } = await syncMsPhotos();
    setIsSyncingPhotos(false);
    if (error) { setErrorMsg(error.message); return; }
    setPhotoResult(data);
  };

  const busy = isSyncing || isSyncingPhotos;

  const renderStats = (stats) => (
    <div className="usr-stats">
      {stats.map(({ label, value, tone }) => (
        <div key={label} className={`usr-stat ${tone}`}>
          <span className="usr-stat-value">{value}</span>
          <span className="usr-stat-label">{label}</span>
        </div>
      ))}
    </div>
  );

  const renderErrors = (errores) => errores?.length > 0 && (
    <details className="usr-errors">
      <summary>{errores.length} error(es) — ver detalle</summary>
      <ul>{errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
    </details>
  );

  return (
    <div className="adm-card usr-sync">
      <div className="usr-sync-head">
        <div>
          <p className="usr-sync-title">Sincronizar desde Entra ID</p>
          <p className="usr-sync-desc">
            Importa directamente desde Microsoft Graph API todos los usuarios activos e inactivos de tu organización.
          </p>
        </div>
        <div className="usr-sync-actions">
          <button type="button" className="adm-pill-btn" onClick={handleSyncPhotos} disabled={busy}>
            {isSyncingPhotos ? <LoadingSpinner size={14} strokeWidth={1.5} /> : <ImageIcon size={16} strokeWidth={1.5} />}
            {isSyncingPhotos ? 'Actualizando...' : 'Sincronizar fotos'}
          </button>
          <button type="button" className="btn-add-admin" onClick={handleSync} disabled={busy}>
            {isSyncing ? <LoadingSpinner size={14} strokeWidth={1.5} /> : <RefreshCw size={16} strokeWidth={1.5} />}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="usr-alert danger" role="alert">
          <AlertCircle size={16} strokeWidth={1.5} />
          <p>{errorMsg}</p>
        </div>
      )}

      {result && (
        <div className="usr-alert success" role="status">
          <div className="usr-alert-head">
            <CheckCircle size={16} strokeWidth={1.5} />
            <p>Sincronización completada</p>
          </div>
          {renderStats([
            { label: 'Creados',     value: result.creados,     tone: 'success' },
            { label: 'Ya existían', value: result.ya_existian, tone: 'info' },
            { label: 'Inactivados', value: result.inactivados, tone: 'warning' },
            { label: 'Omitidos',    value: result.omitidos,    tone: 'neutral' },
          ])}
          {renderErrors(result.errores)}
        </div>
      )}

      {photoResult && (
        <div className="usr-alert success" role="status">
          <div className="usr-alert-head">
            <CheckCircle size={16} strokeWidth={1.5} />
            <p>Fotos actualizadas</p>
          </div>
          {renderStats([
            { label: 'Actualizadas', value: photoResult.actualizados, tone: 'success' },
            { label: 'Sin foto',     value: photoResult.sin_foto,     tone: 'neutral' },
          ])}
          {renderErrors(photoResult.errores)}
        </div>
      )}
    </div>
  );
};

const ITEMS_PER_PAGE = 10;

// ── Tab principal ─────────────────────────────────────────────────────────────
const UsuariosTab = () => {
  const { profile: currentUserProfile } = useAuth();
  const isSuperAdmin = currentUserProfile?.role === 'superadmin';
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  // Debounce del buscador para no disparar una consulta por cada tecla
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, showInactive]);

  useEffect(() => { loadUsers(); }, [debouncedSearch, showInactive, page]);

  const loadUsers = async () => {
    setIsLoading(true);
    const { data, count } = await fetchAllUsers({ search: debouncedSearch, showInactive, page, pageSize: ITEMS_PER_PAGE });
    setUsers(data);
    setTotalCount(count);
    setIsLoading(false);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const handleRoleChange = async (userId, newRole) => {
    const user = users.find(u => u.id === userId);
    await updateUserRoleAndTabs(userId, newRole, user?.admin_tabs ?? null);
    await loadUsers();
  };

  const handleTabsChange = async (userId, newTabs) => {
    const user = users.find(u => u.id === userId);
    await updateUserRoleAndTabs(userId, user?.role ?? 'user', newTabs);
    await loadUsers();
  };

  const handleDelete = async (userId) => {
    setDeletingId(userId);
    await deleteUser(userId);
    setConfirmId(null);
    setDeletingId(null);
    await loadUsers();
  };

  return (
    <AdminListPanel title="Usuarios" count={totalCount}>
      <SyncPanel onSuccess={loadUsers} />

      {/* Buscador + filtro inactivos */}
      <div className="adm-toolbar">
        <label className="org-search">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nombre o email..."
            aria-label="Buscar por nombre o email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`adm-pill-btn${showInactive ? ' active' : ''}`}
          aria-pressed={showInactive}
          onClick={() => setShowInactive(v => !v)}
        >
          {showInactive ? 'Ocultar inactivos' : 'Ver inactivos'}
        </button>
      </div>

      {isLoading ? (
        <div className="adm-empty">
          <LoadingSpinner size={24} />
        </div>
      ) : (
        <>
          <ul className="adm-list">
            {users.map(u => {
              const isSelf = u.id === currentUserProfile?.id;
              const currentTabs = u.admin_tabs ?? ALL_TABS;
              const allSelected = ALL_TABS.every(t => currentTabs.includes(t));
              const roleBadge = ROLE_BADGE[u.role || 'user'];
              const isConfirming = confirmId === u.id;
              const isDeleting = deletingId === u.id;

              return (
                <li key={u.id} className={`usr-item${u.is_active === false ? ' muted' : ''}`}>
                  <div className="adm-row">
                    <span className="adm-row-icon round">{initials(u.full_name)}</span>
                    <div className="adm-row-info">
                      <div className="adm-row-title">
                        <span className="adm-ellipsis">{u.full_name}</span>
                        {isSelf && <span className="adm-badge">Vos</span>}
                        {u.is_active === false && <span className="adm-badge warning">Inactivo</span>}
                      </div>
                      <div className="adm-row-meta"><span className="adm-ellipsis">{u.email}</span></div>
                    </div>

                    <div className="adm-row-side usr-side">
                      <span className={`adm-badge ${roleBadge.tone}`}>{roleBadge.label}</span>
                      {!isSelf && (
                        <div className="usr-role-select">
                          <Select
                            size="sm"
                            aria-label={`Rol de ${u.full_name}`}
                            value={u.role || 'user'}
                            onChange={v => handleRoleChange(u.id, v)}
                            options={[{ value: 'user', label: 'Usuario' }, { value: 'admin', label: 'Admin' }, { value: 'superadmin', label: 'Super Admin' }]}
                          />
                        </div>
                      )}

                      {/* Eliminar — solo superadmin, no sobre sí mismo */}
                      {isSuperAdmin && !isSelf && (
                        isConfirming ? (
                          <div className="usr-confirm">
                            <span>¿Confirmar?</span>
                            <button type="button" className="usr-confirm-yes" onClick={() => handleDelete(u.id)} disabled={isDeleting}>
                              {isDeleting ? '...' : 'Sí, eliminar'}
                            </button>
                            <button type="button" className="adm-pill-btn sm" onClick={() => setConfirmId(null)}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="adm-action danger" aria-label={`Eliminar usuario ${u.full_name}`} onClick={() => setConfirmId(u.id)}>
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {u.role === 'admin' && (
                    <div className="usr-perms">
                      <div className="usr-perms-head">
                        <span className="adm-group-label">Acceso a secciones</span>
                        <button
                          type="button"
                          className="usr-link-btn"
                          onClick={() => handleTabsChange(u.id, allSelected ? [] : [...ALL_TABS])}
                        >
                          {allSelected ? 'Quitar todo' : 'Seleccionar todo'}
                        </button>
                      </div>
                      <div className="usr-perms-grid">
                        {ALL_TABS.map(tab => {
                          const checked = currentTabs.includes(tab);
                          return (
                            <div key={tab} className={`usr-perm${checked ? ' on' : ''}`}>
                              <span className="usr-perm-label">
                                {TAB_ICONS[tab]} {TAB_LABELS[tab]}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={checked}
                                aria-label={`Acceso a ${TAB_LABELS[tab]}`}
                                className={`adm-switch sm${checked ? ' on' : ''}`}
                                onClick={() => {
                                  const base = u.admin_tabs ?? ALL_TABS;
                                  const next = checked ? base.filter(t => t !== tab) : [...base, tab];
                                  handleTabsChange(u.id, next);
                                }}
                              >
                                <span className="adm-switch-thumb" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Paginación */}
          {totalPages > 1 && (() => {
            // Genera: [1] … [page-1] [page] [page+1] … [last]
            const pages = new Set([1, totalPages, page, page - 1, page + 1].filter(n => n >= 1 && n <= totalPages));
            const sorted = [...pages].sort((a, b) => a - b);
            const items = [];
            sorted.forEach((n, i) => {
              if (i > 0 && n - sorted[i - 1] > 1) items.push('…' + i);
              items.push(n);
            });

            return (
              <nav className="adm-pager" aria-label="Paginación">
                <button type="button" className="adm-pager-btn" aria-label="Página anterior" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </button>
                {items.map(item =>
                  typeof item === 'string'
                    ? <span key={item} className="adm-pager-gap">…</span>
                    : <button key={item} type="button" className={`adm-pager-btn${item === page ? ' active' : ''}`} aria-current={item === page ? 'page' : undefined} onClick={() => setPage(item)}>{item}</button>
                )}
                <button type="button" className="adm-pager-btn" aria-label="Página siguiente" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
              </nav>
            );
          })()}
        </>
      )}
    </AdminListPanel>
  );
};

export default UsuariosTab;
