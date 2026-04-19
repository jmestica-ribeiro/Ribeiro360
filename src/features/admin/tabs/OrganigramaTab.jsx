import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft } from 'lucide-react';
import { fetchOrgNodos, saveOrgNodo, deleteOrgNodo } from '../../../services/organigramaService';
import { AdminListPanel, EmptyState, useToast } from '../../../components/common';

const EMPTY_NODO = { nombre: '', cargo: '', area: '', area_color: '#cccccc', parent_id: null, foto_url: '', numero_orden: 0, activo: true };

const OrganigramaTab = () => {
  const { showToast } = useToast();
  const [orgNodos, setOrgNodos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);

  useEffect(() => {
    loadNodos();
  }, []);

  const loadNodos = async () => {
    const { data } = await fetchOrgNodos();
    setOrgNodos(data);
  };

  const handleCreate = () => {
    setEditingData({ ...EMPTY_NODO });
    setIsEditing(true);
  };

  const handleEdit = (nodo) => {
    setEditingData({ ...nodo });
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
    if (!window.confirm('¿Eliminar este nodo?')) return;
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
              <label>Nombre / Área *</label>
              <input className="form-control" value={editingData.nombre} onChange={e => setEditingData(d => ({ ...d, nombre: e.target.value }))} placeholder="Ej: María García" />
            </div>
            <div className="form-group">
              <label>Cargo *</label>
              <input className="form-control" value={editingData.cargo} onChange={e => setEditingData(d => ({ ...d, cargo: e.target.value }))} placeholder="Ej: Gerente RRHH" />
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
              <select className="form-control" value={editingData.parent_id || ''} onChange={e => setEditingData(d => ({ ...d, parent_id: e.target.value || null }))}>
                <option value="">— Sin padre (raíz) —</option>
                {parents.map(n => (
                  <option key={n.id} value={n.id}>{n.nombre} — {n.cargo}</option>
                ))}
              </select>
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
          <button className="btn-primary" onClick={handleSave} disabled={!editingData.nombre || !editingData.cargo}>
            <Save size={16} /> Guardar nodo
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminListPanel title="Organigrama" count={orgNodos.length} addLabel="Nuevo nodo" onAdd={handleCreate}>
      {orgNodos.length === 0 ? (
        <EmptyState message="No hay nodos todavía." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orgNodos.map(nodo => {
            const padre = orgNodos.find(n => n.id === nodo.parent_id);
            return (
              <div key={nodo.id} className="evento-item" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: nodo.area_color || '#ccc', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="evento-titulo">{nodo.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {nodo.cargo}{padre ? ` · Reporta a: ${padre.nombre}` : ' · Raíz'}{!nodo.activo ? ' · Inactivo' : ''}
                  </div>
                </div>
                <div className="admin-item-actions">
                  <button className="btn-icon-admin" onClick={() => handleEdit(nodo)}><Edit2 size={14} /></button>
                  <button className="btn-icon-admin danger" onClick={() => handleDelete(nodo.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminListPanel>
  );
};

export default OrganigramaTab;
