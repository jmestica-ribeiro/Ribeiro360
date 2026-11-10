import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft, Calendar, Pencil } from 'lucide-react';
import {
  fetchEventos,
  fetchEventosCategorias,
  fetchAreas,
  fetchEventoVisibilidad,
  saveEvento,
  deleteEvento,
} from '../../../services/eventosService';
import { fetchProfileValues } from '../../../services/usuariosService';
import { AdminListPanel, EmptyState, VisibilidadEditor, useToast, SubmitButton, FieldError } from '../../../components/common';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import { hoyISO } from '../../../lib/fechas';
import { notificarNuevoEvento } from '../../../lib/notificaciones';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Select } from '../../../components/common';

const EMPTY_EVENTO = { titulo: '', descripcion: '', fecha: '', categoria_id: null, area_id: null };

const EventosTab = () => {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [eventos, setEventos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [areas, setAreas] = useState([]);
  const [profileValues, setProfileValues] = useState({ job_title: [], department: [], office_location: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [editingVisibilidad, setEditingVisibilidad] = useState([]);
  const v = useRequiredFields([
    { id: 'evt-titulo', label: 'Título', valid: !!editingData?.titulo?.trim() },
    { id: 'evt-fecha', label: 'Fecha', valid: !!editingData?.fecha },
  ]);

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
    setEditingData({ ...EMPTY_EVENTO, fecha: hoyISO(), categoria_id: categorias[0]?.id || null, area_id: areas[0]?.id || null });
    setEditingVisibilidad([]);
    v.reset();
    setIsEditing(true);
  };

  const handleEdit = async (evento) => {
    setEditingData({ ...evento, categoria_id: evento.categoria_id, area_id: evento.area_id });
    const { data } = await fetchEventoVisibilidad(evento.id);
    setEditingVisibilidad(data || []);
    v.reset();
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
    const isNew = !editingData.id;
    if (editingData.id) payload.id = editingData.id;
    const { data: savedEvento, error } = await saveEvento(payload, editingVisibilidad);
    if (error) return showToast(error.message, 'error');
    if (isNew && savedEvento?.id) {
      notificarNuevoEvento({ eventoTitulo: payload.titulo, eventoId: savedEvento.id, eventoFecha: payload.fecha, visRules: editingVisibilidad });
    }
    await loadData();
    handleBack();
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ message: '¿Eliminar este evento?', destructive: true }))) return;
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
              <SubmitButton className="btn-primary" missing={v.missing} onMissing={v.revealAll} onClick={handleSave}><Save size={16} /> Guardar</SubmitButton>
            </div>
          </div>
          <div className="form-body">
            <div className="form-group">
              <label htmlFor="evt-titulo">Título *</label>
              <input id="evt-titulo" {...v.fieldProps('evt-titulo')} className="form-control" value={editingData.titulo} onChange={e => setEditingData(d => ({ ...d, titulo: e.target.value }))} placeholder="Ej: Reunión de equipo" />
              <FieldError show={v.isInvalid('evt-titulo')}>Ingresá un título</FieldError>
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea className="form-control" rows={3} value={editingData.descripcion || ''} onChange={e => setEditingData(d => ({ ...d, descripcion: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="evt-fecha">Fecha *</label>
                <input id="evt-fecha" {...v.fieldProps('evt-fecha')} type="date" className="form-control" value={editingData.fecha} onChange={e => setEditingData(d => ({ ...d, fecha: e.target.value }))} />
                <FieldError show={v.isInvalid('evt-fecha')}>Elegí una fecha</FieldError>
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <Select value={String(editingData.categoria_id || '')} onChange={v => setEditingData(d => ({ ...d, categoria_id: v }))} placeholder="Sin categoría"
                  options={[{ value: '', label: 'Sin categoría' }, ...categorias.map(c => ({ value: String(c.id), label: c.nombre }))]} />
              </div>
              <div className="form-group">
                <label>Área</label>
                <Select value={String(editingData.area_id || '')} onChange={v => setEditingData(d => ({ ...d, area_id: v }))} placeholder="Sin área"
                  options={[{ value: '', label: 'Sin área' }, ...areas.map(a => ({ value: String(a.id), label: a.nombre }))]} />
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
          <section key={month}>
            <h4 className="adm-group-label">{month.charAt(0).toUpperCase() + month.slice(1)}</h4>
            <ul className="adm-list">
              {evs.map(ev => {
                const fecha = new Date(ev.fecha + 'T00:00:00');
                return (
                  <li key={ev.id} className="adm-row" style={{ '--tone': ev.categoria?.color || 'var(--accent)' }}>
                    <span className="adm-row-icon adm-date">
                      <strong>{fecha.getDate()}</strong>
                      <small>{fecha.toLocaleDateString('es-AR', { month: 'short' })}</small>
                    </span>
                    <div className="adm-row-info">
                      <div className="adm-row-title"><span className="adm-ellipsis">{ev.titulo}</span></div>
                      {(ev.categoria || ev.area) && (
                        <div className="adm-row-meta">
                          {ev.categoria && <span className="adm-badge tone" style={{ '--tone': ev.categoria.color }}>{ev.categoria.nombre}</span>}
                          {ev.area && <span className="adm-badge tone" style={{ '--tone': ev.area.color }}>{ev.area.nombre}</span>}
                        </div>
                      )}
                    </div>
                    <div className="adm-actions hover-reveal">
                      <button type="button" className="adm-action" aria-label={`Editar ${ev.titulo}`} onClick={() => handleEdit(ev)}><Pencil size={16} strokeWidth={1.5} /></button>
                      <button type="button" className="adm-action danger" aria-label={`Eliminar ${ev.titulo}`} onClick={() => handleDelete(ev.id)}><Trash2 size={16} strokeWidth={1.5} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </AdminListPanel>
  );
};

export default EventosTab;
