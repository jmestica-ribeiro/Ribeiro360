import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft, Calendar } from 'lucide-react';
import {
  fetchEventos,
  fetchEventosCategorias,
  fetchAreas,
  fetchEventoVisibilidad,
  saveEvento,
  deleteEvento,
} from '../../../services/eventosService';
import { fetchProfileValues } from '../../../services/usuariosService';
import { AdminListPanel, EmptyState, VisibilidadEditor, useToast } from '../../../components/common';

const EMPTY_EVENTO = { titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], categoria_id: null, area_id: null };

const EventosTab = () => {
  const { showToast } = useToast();
  const [eventos, setEventos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [areas, setAreas] = useState([]);
  const [profileValues, setProfileValues] = useState({ job_title: [], department: [], office_location: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [editingVisibilidad, setEditingVisibilidad] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [eventosRes, catRes, areaRes, profileRes] = await Promise.all([
      fetchEventos(),
      fetchEventosCategorias(),
      fetchAreas(),
      fetchProfileValues(),
    ]);
    setEventos(eventosRes.data);
    setCategorias(catRes.data);
    setAreas(areaRes.data);
    setProfileValues(profileRes.data);
  };

  const handleCreate = () => {
    setEditingData({ ...EMPTY_EVENTO, categoria_id: categorias[0]?.id || null, area_id: areas[0]?.id || null });
    setEditingVisibilidad([]);
    setIsEditing(true);
  };

  const handleEdit = async (evento) => {
    setEditingData({ ...evento, categoria_id: evento.categoria_id, area_id: evento.area_id });
    const { data } = await fetchEventoVisibilidad(evento.id);
    setEditingVisibilidad(data || []);
    setIsEditing(true);
  };

  const handleBack = () => {
    setIsEditing(false);
    setEditingData(null);
    setEditingVisibilidad([]);
  };

  const handleSave = async () => {
    if (!editingData.titulo || !editingData.fecha) return;
    const payload = {
      titulo: editingData.titulo,
      descripcion: editingData.descripcion || null,
      fecha: editingData.fecha,
      categoria_id: editingData.categoria_id || null,
      area_id: editingData.area_id || null,
    };
    if (editingData.id) payload.id = editingData.id;
    const { error } = await saveEvento(payload, editingVisibilidad);
    if (error) return showToast(error.message, 'error');
    await loadData();
    handleBack();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este evento?')) return;
    await deleteEvento(id);
    await loadData();
  };

  if (isEditing) {
    return (
      <div>
        <button className="btn-back" onClick={handleBack} style={{ marginBottom: '20px' }}>
          <ChevronLeft size={18} /> Volver
        </button>
        <div className="edit-card">
          <div className="form-header">
            <h3>{editingData?.id ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            <div className="form-header-actions">
              <button className="btn-primary" onClick={handleSave}><Save size={16} /> Guardar</button>
            </div>
          </div>
          <div className="form-body">
            <div className="form-group">
              <label>Título *</label>
              <input className="form-control" value={editingData.titulo} onChange={e => setEditingData(d => ({ ...d, titulo: e.target.value }))} placeholder="Ej: Reunión de equipo" />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea className="form-control" rows={3} value={editingData.descripcion || ''} onChange={e => setEditingData(d => ({ ...d, descripcion: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" className="form-control" value={editingData.fecha} onChange={e => setEditingData(d => ({ ...d, fecha: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select className="form-control" value={editingData.categoria_id || ''} onChange={e => setEditingData(d => ({ ...d, categoria_id: e.target.value }))}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Área</label>
                <select className="form-control" value={editingData.area_id || ''} onChange={e => setEditingData(d => ({ ...d, area_id: e.target.value }))}>
                  <option value="">Sin área</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="section-divider" style={{ margin: '24px 0 16px 0', borderBottom: '1px solid #f0f0f0' }} />
            <VisibilidadEditor
              rules={editingVisibilidad}
              onChange={setEditingVisibilidad}
              profileValues={profileValues}
            />
          </div>
        </div>
      </div>
    );
  }

  const grouped = eventos.reduce((acc, ev) => {
    const month = new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(ev);
    return acc;
  }, {});

  return (
    <AdminListPanel title="Eventos" count={eventos.length} addLabel="Nuevo Evento" onAdd={handleCreate}>
      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon={<Calendar size={40} />} message="No hay eventos creados aún." />
      ) : (
        Object.entries(grouped).map(([month, evs]) => (
          <div key={month} className="eventos-month-group">
            <h4 className="eventos-month-title">{month.charAt(0).toUpperCase() + month.slice(1)}</h4>
            <div className="eventos-list">
              {evs.map(ev => (
                <div key={ev.id} className="evento-item">
                  <div className="evento-date-badge">
                    <span className="evento-day">{new Date(ev.fecha + 'T00:00:00').getDate()}</span>
                    <span className="evento-month-short">{new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short' })}</span>
                  </div>
                  <div className="evento-info">
                    <span className="evento-titulo">{ev.titulo}</span>
                    <div className="evento-tags">
                      {ev.categoria && <span className="evento-tag" style={{ backgroundColor: ev.categoria.color + '20', color: ev.categoria.color }}>{ev.categoria.nombre}</span>}
                      {ev.area && <span className="evento-tag" style={{ backgroundColor: ev.area.color + '20', color: ev.area.color }}>{ev.area.nombre}</span>}
                    </div>
                  </div>
                  <div className="admin-item-actions">
                    <button className="btn-icon-admin" onClick={() => handleEdit(ev)}><Edit2 size={15} /></button>
                    <button className="btn-icon-admin danger" onClick={() => handleDelete(ev.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </AdminListPanel>
  );
};

export default EventosTab;
