import React, { useState, useEffect } from 'react';
import { Trash2, Save, ChevronLeft, Pencil, Search, CornerDownRight } from 'lucide-react';
import { fetchOrgNodos, saveOrgNodo, deleteOrgNodo } from '../../../services/organigramaService';
import { AdminListPanel, EmptyState, useToast, SubmitButton, FieldError } from '../../../components/common';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Select } from '../../../components/common';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

const EMPTY_NODO = { nombre: '', cargo: '', area: '', area_color: '#cccccc', parent_id: null, foto_url: '', numero_orden: 0, activo: true };

const OrganigramaTab = () => {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [orgNodos, setOrgNodos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('lista');
  const v = useRequiredFields([
    { id: 'org-nombre', label: 'Nombre', valid: !!editingData?.nombre?.trim() },
    { id: 'org-cargo', label: 'Cargo', valid: !!editingData?.cargo?.trim() },
  ]);

  useEffect(() => {
    loadNodos();
  }, []);

  const loadNodos = async () => {
    const { data } = await fetchOrgNodos();
    setOrgNodos(data);
  };

  const handleCreate = () => {
    setEditingData({ ...EMPTY_NODO });
    v.reset();
    setIsEditing(true);
  };

  const handleEdit = (nodo) => {
    setEditingData({ ...nodo });
    v.reset();
    setIsEditing(true);
  };

  const handleBack = () => {
    setIsEditing(false);
    setEditingData(null);
  };

  const handleSave = async () => {
    const { error } = await saveOrgNodo(editingData);
    if (error) return showToast(error.message, 'error');
    await loadNodos();
    handleBack();
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ message: '¿Eliminar este nodo?', destructive: true }))) return;
    await deleteOrgNodo(id);
    await loadNodos();
  };

  if (isEditing) {
    const parents = orgNodos.filter(n => n.id !== editingData?.id);
    return (
      <div className="edit-card">
        <div className="form-header">
          <button className="btn-back" onClick={handleBack}>
            <ChevronLeft size={18} /> Volver
          </button>
          <h3>{editingData?.id ? 'Editar nodo' : 'Nuevo nodo'}</h3>
        </div>
        <div className="form-body">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="org-nombre">Nombre / Área *</label>
              <input id="org-nombre" {...v.fieldProps('org-nombre')} className="form-control" value={editingData.nombre} onChange={e => setEditingData(d => ({ ...d, nombre: e.target.value }))} placeholder="Ej: María García" />
              <FieldError show={v.isInvalid('org-nombre')}>Ingresá un nombre</FieldError>
            </div>
            <div className="form-group">
              <label htmlFor="org-cargo">Cargo *</label>
              <input id="org-cargo" {...v.fieldProps('org-cargo')} className="form-control" value={editingData.cargo} onChange={e => setEditingData(d => ({ ...d, cargo: e.target.value }))} placeholder="Ej: Gerente RRHH" />
              <FieldError show={v.isInvalid('org-cargo')}>Ingresá un cargo</FieldError>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Área / Sector</label>
              <input className="form-control" value={editingData.area} onChange={e => setEditingData(d => ({ ...d, area: e.target.value }))} placeholder="Ej: Recursos Humanos" />
            </div>
            <div className="form-group" style={{ maxWidth: 120 }}>
              <label>Color de área</label>
              <input type="color" className="form-control" style={{ height: 42, padding: 4, cursor: 'pointer' }} value={editingData.area_color} onChange={e => setEditingData(d => ({ ...d, area_color: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Reporta a (nodo padre)</label>
              <Select value={String(editingData.parent_id || '')} onChange={v => setEditingData(d => ({ ...d, parent_id: v || null }))} placeholder="— Sin padre (raíz) —"
                options={[{ value: '', label: '— Sin padre (raíz) —' }, ...parents.map(n => ({ value: String(n.id), label: `${n.nombre} — ${n.cargo}` }))]} />
            </div>
            <div className="form-group">
              <label>Orden</label>
              <input type="number" className="form-control" value={editingData.numero_orden} onChange={e => setEditingData(d => ({ ...d, numero_orden: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>URL de foto</label>
            <input className="form-control" value={editingData.foto_url || ''} onChange={e => setEditingData(d => ({ ...d, foto_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={editingData.activo} onChange={e => setEditingData(d => ({ ...d, activo: e.target.checked }))} style={{ marginRight: 8 }} />
              Activo (visible en el organigrama)
            </label>
          </div>
          <SubmitButton className="btn-primary" missing={v.missing} onMissing={v.revealAll} onClick={handleSave}>
            <Save size={16} /> Guardar nodo
          </SubmitButton>
        </div>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const byId = new Map(orgNodos.map(n => [n.id, n]));
  const matches = (n) => !q || `${n.nombre} ${n.cargo} ${n.area || ''}`.toLowerCase().includes(q);

  // Vista árbol: recorrido en profundidad desde las raíces, respetando numero_orden
  const ordered = (() => {
    if (view !== 'arbol') return orgNodos.map(n => ({ nodo: n, depth: 0 }));
    const sortFn = (a, b) => (Number(a.numero_orden) || 0) - (Number(b.numero_orden) || 0);
    const children = (pid) => orgNodos.filter(n => (n.parent_id ?? null) === pid || (pid === null && n.parent_id && !byId.has(n.parent_id))).sort(sortFn);
    const out = [];
    const seen = new Set();
    const walk = (pid, depth) => children(pid).forEach(n => {
      if (seen.has(n.id)) return;
      seen.add(n.id);
      out.push({ nodo: n, depth });
      walk(n.id, depth + 1);
    });
    walk(null, 0);
    orgNodos.forEach(n => { if (!seen.has(n.id)) out.push({ nodo: n, depth: 0 }); });
    return out;
  })().filter(({ nodo }) => matches(nodo));

  return (
    <AdminListPanel title="Organigrama" count={orgNodos.length} addLabel="Nuevo nodo" onAdd={handleCreate}>
      {orgNodos.length === 0 ? (
        <EmptyState message="No hay nodos todavía." />
      ) : (
        <>
          <div className="org-toolbar">
            <label className="org-search">
              <Search size={16} strokeWidth={1.5} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o cargo…"
                aria-label="Buscar por nombre o cargo"
              />
            </label>
            <div className="org-segmented" role="radiogroup" aria-label="Vista">
              {[['lista', 'Lista'], ['arbol', 'Árbol']].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={view === key}
                  className={view === key ? 'active' : ''}
                  onClick={() => setView(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {ordered.length === 0 ? (
            <EmptyState message="Sin resultados para tu búsqueda." />
          ) : (
            <ul className="org-list">
              {ordered.map(({ nodo, depth }) => {
                const padre = byId.get(nodo.parent_id);
                const color = /^#[0-9a-f]{6}$/i.test(nodo.area_color || '') ? nodo.area_color : '#9CA3AF';
                return (
                  <li
                    key={nodo.id}
                    className={`org-row${!nodo.activo ? ' inactive' : ''}`}
                    style={{ '--area': color, '--depth': depth }}
                  >
                    <span className="org-avatar" aria-hidden="true">{initials(nodo.nombre)}</span>
                    <div className="org-info">
                      <div className="org-name-row">
                        <span className="org-name">{nodo.nombre}</span>
                        {!padre && <span className="org-badge neutral">Raíz</span>}
                        {nodo.area && <span className="org-badge area">{nodo.area}</span>}
                        {!nodo.activo && <span className="org-badge neutral">Inactivo</span>}
                      </div>
                      <div className="org-meta">
                        <span>{nodo.cargo}</span>
                        {padre && (
                          <span className="org-reports">
                            <CornerDownRight size={12} strokeWidth={1.5} aria-hidden="true" /> Reporta a {padre.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="org-actions">
                      <button type="button" className="org-action" aria-label={`Editar ${nodo.nombre}`} onClick={() => handleEdit(nodo)}>
                        <Pencil size={16} strokeWidth={1.5} />
                      </button>
                      <button type="button" className="org-action danger" aria-label={`Eliminar ${nodo.nombre}`} onClick={() => handleDelete(nodo.id)}>
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </AdminListPanel>
  );
};

export default OrganigramaTab;
