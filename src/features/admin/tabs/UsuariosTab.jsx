import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Calendar, Rocket, MessageCircle, LayoutGrid, ShieldCheck, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchAllUsers, updateUserRoleAndTabs, syncMsUsers } from '../../../services/usuariosService';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminListPanel, LoadingSpinner } from '../../../components/common';

const ALL_TABS = ['capacitaciones', 'paf', 'onboarding', 'eventos', 'faq', 'organigrama', 'sgi'];

const TAB_ICONS = {
  capacitaciones: <GraduationCap size={14} />,
  paf:            <Calendar size={14} />,
  onboarding:     <Rocket size={14} />,
  eventos:        <Calendar size={14} />,
  faq:            <MessageCircle size={14} />,
  organigrama:    <LayoutGrid size={14} />,
  sgi:            <ShieldCheck size={14} />,
};

const TAB_LABELS = {
  capacitaciones: 'Capacitaciones',
  paf:            'Plan PAF',
  onboarding:     'Onboarding',
  eventos:        'Eventos',
  faq:            'FAQ',
  organigrama:    'Organigrama',
  sgi:            'SGI',
};

const ROLE_BADGE = {
  superadmin: { label: 'Super Admin', bg: '#1a1a1a', color: '#fff' },
  admin:      { label: 'Admin',       bg: '#e8f5e9', color: '#2e7d32' },
  user:       { label: 'Usuario',     bg: 'var(--bg-hover)', color: 'var(--text-muted)' },
};

// ── Panel de sincronización desde Entra ID ───────────────────────────────────
const SyncPanel = ({ onSuccess }) => {
  const fileRef = useRef(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSync = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    setResult(null);
    setErrorMsg('');
    const { data, error } = await syncMsUsers(file);
    setIsSyncing(false);
    if (error) { setErrorMsg(error.message); return; }
    setResult(data);
    onSuccess();
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14 }}>Sincronizar desde Entra ID</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Importá el CSV exportado desde Azure con las columnas: displayName, userPrincipalName, userType, accountEnabled, jobTitle, department, officeLocation.
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: 'var(--primary-color)', color: '#141414', fontWeight: 700, fontSize: 13, cursor: isSyncing ? 'not-allowed' : 'pointer', opacity: isSyncing ? 0.6 : 1, flexShrink: 0 }}>
          {isSyncing ? <LoadingSpinner size={14} /> : <Upload size={14} />}
          {isSyncing ? 'Procesando...' : 'Cargar CSV'}
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} disabled={isSyncing} onChange={handleSync} />
        </label>
      </div>

      {errorMsg && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={16} color="#dc2626" />
          <p style={{ fontSize: 13, color: '#dc2626' }}>{errorMsg}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle size={16} color="#16a34a" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Sincronización completada</p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Creados', value: result.creados, color: '#16a34a' },
              { label: 'Ya existían', value: result.ya_existian, color: '#2563eb' },
              { label: 'Omitidos', value: result.omitidos, color: '#9ca3af' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
          {result.errores?.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: '#dc2626', cursor: 'pointer' }}>{result.errores.length} error(es) — ver detalle</summary>
              <ul style={{ marginTop: 6, paddingLeft: 16 }}>
                {result.errores.map((e, i) => <li key={i} style={{ fontSize: 11, color: '#dc2626' }}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

// ── Tab principal ─────────────────────────────────────────────────────────────
const UsuariosTab = () => {
  const { profile: currentUserProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const { data } = await fetchAllUsers();
    setUsers(data);
    setIsLoading(false);
  };

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

  return (
    <AdminListPanel title="Usuarios" count={users.length}>
      <SyncPanel onSuccess={loadUsers} />
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <LoadingSpinner size={24} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.map(u => {
            const isSelf = u.id === currentUserProfile?.id;
            const currentTabs = u.admin_tabs ?? ALL_TABS;
            const allSelected = ALL_TABS.every(t => currentTabs.includes(t));
            const roleBadge = ROLE_BADGE[u.role || 'user'];

            return (
              <div key={u.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', color: 'var(--text-main)', flexShrink: 0 }}>
                      {u.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontWeight: '700', fontSize: '14px' }}>{u.full_name}</p>
                        {isSelf && <span style={{ fontSize: '11px', background: 'var(--primary-color)', padding: '1px 7px', borderRadius: '10px', fontWeight: '700' }}>Tú</span>}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: roleBadge.bg, color: roleBadge.color }}>
                      {roleBadge.label}
                    </span>
                    {!isSelf && (
                      <select
                        className="form-control"
                        style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                        value={u.role || 'user'}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    )}
                  </div>
                </div>

                {u.role === 'admin' && (
                  <div style={{ borderTop: '1px solid var(--border-color)', padding: '14px 20px', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ACCESO A SECCIONES</p>
                      <button
                        style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => handleTabsChange(u.id, allSelected ? [] : [...ALL_TABS])}
                      >
                        {allSelected ? 'Quitar todo' : 'Seleccionar todo'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '8px' }}>
                      {ALL_TABS.map(tab => {
                        const checked = currentTabs.includes(tab);
                        return (
                          <label key={tab} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${checked ? 'var(--primary-color)' : 'var(--border-color)'}`, background: checked ? 'rgba(255,220,0,0.1)' : 'var(--bg-card)', cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: checked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                              {TAB_ICONS[tab]} {TAB_LABELS[tab]}
                            </span>
                            <div
                              onClick={() => {
                                const base = u.admin_tabs ?? ALL_TABS;
                                const next = checked ? base.filter(t => t !== tab) : [...base, tab];
                                handleTabsChange(u.id, next);
                              }}
                              style={{ width: '32px', height: '18px', borderRadius: '9px', background: checked ? 'var(--primary-color)' : '#d1d5db', transition: 'background 0.2s', cursor: 'pointer', position: 'relative', flexShrink: 0 }}
                            >
                              <div style={{ position: 'absolute', top: '2px', left: checked ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminListPanel>
  );
};

export default UsuariosTab;
