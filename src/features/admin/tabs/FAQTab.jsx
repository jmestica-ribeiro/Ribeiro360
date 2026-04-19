import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft, MessageCircle } from 'lucide-react';
import { fetchFaqPreguntas, fetchFaqSectores, saveFaqPregunta, deleteFaqPregunta } from '../../../services/faqService';
import { AdminListPanel, EmptyState, useToast } from '../../../components/common';

const EMPTY_PREGUNTA = { pregunta: '', respuesta: '', sector_id: null, activo: true, numero_orden: 0, links: [] };

const FAQTab = () => {
  const { showToast } = useToast();
  const [preguntas, setPreguntas] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [preguntasRes, sectoresRes] = await Promise.all([
      fetchFaqPreguntas(),
      fetchFaqSectores(),
    ]);
    setPreguntas(preguntasRes.data);
    setSectores(sectoresRes.data);
  };

  const handleCreate = () => {
    setEditingData({ ...EMPTY_PREGUNTA, sector_id: sectores[0]?.id || null });
    setIsEditing(true);
  };

  const handleEdit = (item) => {
    setEditingData({ ...item, links: item.links || [] });
    setIsEditing(true);
  };

  const handleBack = () => {
    setIsEditing(false);
    setEditingData(null);
  };

  const handleSave = async () => {
    if (!editingData.pregunta || !editingData.respuesta) return;
    const payload = {
      ...editingData,
      links: (editingData.links || []).filter(l => l.url?.trim()),
    };
    const { error } = await saveFaqPregunta(payload);
    if (error) return showToast(error.message, 'error');
    await loadData();
    handleBack();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    await deleteFaqPregunta(id);
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
            <h3>{editingData?.id ? 'Editar Pregunta' : 'Nueva Pregunta'}</h3>
            <div className="form-header-actions">
              <button className="btn-primary" onClick={handleSave}><Save size={16} /> Guardar</button>
            </div>
          </div>
          <div className="form-body">
            <div className="form-group">
              <label>Pregunta *</label>
              <input className="form-control" value={editingData.pregunta} onChange={e => setEditingData(d => ({ ...d, pregunta: e.target.value }))} placeholder="¿Cuál es la pregunta?" />
            </div>
            <div className="form-group">
              <label>Respuesta *</label>
              <textarea className="form-control" rows={5} value={editingData.respuesta} onChange={e => setEditingData(d => ({ ...d, respuesta: e.target.value }))} placeholder="Escribí la respuesta completa..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Sector</label>
                <select className="form-control" value={editingData.sector_id || ''} onChange={e => setEditingData(d => ({ ...d, sector_id: e.target.value }))}>
                  <option value="">Sin sector</option>
                  {sectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Orden</label>
                <input type="number" className="form-control" value={editingData.numero_orden} onChange={e => setEditingData(d => ({ ...d, numero_orden: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select className="form-control" value={editingData.activo ? 'true' : 'false'} onChange={e => setEditingData(d => ({ ...d, activo: e.target.value === 'true' }))}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="faq-links-editor">
              <div className="faq-links-editor-header">
                <label>Links de interés</label>
                <button type="button" className="btn-add-link" onClick={() => setEditingData(d => ({ ...d, links: [...(d.links || []), { titulo: '', url: '' }] }))}>
                  <Plus size={14} /> Agregar link
                </button>
              </div>
              {(editingData.links || []).length === 0 ? (
                <p className="faq-links-empty">No hay links agregados.</p>
              ) : (
                <div className="faq-links-rows">
                  {editingData.links.map((link, i) => (
                    <div key={i} className="faq-link-row">
                      <input className="form-control" placeholder="Título del link" value={link.titulo}
                        onChange={e => {
                          const updated = [...editingData.links];
                          updated[i] = { ...updated[i], titulo: e.target.value };
                          setEditingData(d => ({ ...d, links: updated }));
                        }}
                      />
                      <input className="form-control" placeholder="URL (https://...)" value={link.url}
                        onChange={e => {
                          const updated = [...editingData.links];
                          updated[i] = { ...updated[i], url: e.target.value };
                          setEditingData(d => ({ ...d, links: updated }));
                        }}
                      />
                      <button type="button" className="btn-icon-admin danger" onClick={() => setEditingData(d => ({ ...d, links: d.links.filter((_, idx) => idx !== i) }))}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const grouped = preguntas.reduce((acc, p) => {
    const key = p.sector?.nombre || 'Sin sector';
    const color = p.sector?.color || '#ccc';
    if (!acc[key]) acc[key] = { color, items: [] };
    acc[key].items.push(p);
    return acc;
  }, {});

  return (
    <AdminListPanel title="Preguntas Frecuentes" count={preguntas.length} addLabel="Nueva Pregunta" onAdd={handleCreate}>
      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon={<MessageCircle size={40} />} message="No hay preguntas cargadas aún." />
      ) : (
        Object.entries(grouped).map(([sector, { color, items }]) => (
          <div key={sector} className="eventos-month-group">
            <h4 className="eventos-month-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
              {sector}
              <span className="admin-count" style={{ marginLeft: 4 }}>{items.length}</span>
            </h4>
            <div className="eventos-list">
              {items.map(p => (
                <div key={p.id} className="evento-item">
                  <div className="evento-info">
                    <span className="evento-titulo">{p.pregunta}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                      {p.respuesta.slice(0, 80)}{p.respuesta.length > 80 ? '…' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!p.activo && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>Inactivo</span>}
                    <div className="admin-item-actions">
                      <button className="btn-icon-admin" onClick={() => handleEdit(p)}><Edit2 size={15} /></button>
                      <button className="btn-icon-admin danger" onClick={() => handleDelete(p.id)}><Trash2 size={15} /></button>
                    </div>
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

export default FAQTab;
