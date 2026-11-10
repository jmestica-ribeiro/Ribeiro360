import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft, MessageCircle, Pencil } from 'lucide-react';
import { fetchFaqPreguntas, fetchFaqSectores, saveFaqPregunta, deleteFaqPregunta } from '../../../services/faqService';
import { AdminListPanel, EmptyState, useToast, SubmitButton, FieldError } from '../../../components/common';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Select } from '../../../components/common';

const EMPTY_PREGUNTA = { pregunta: '', respuesta: '', sector_id: null, activo: true, numero_orden: 0, links: [] };

const FAQTab = () => {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [preguntas, setPreguntas] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const v = useRequiredFields([
    { id: 'faq-pregunta', label: 'Pregunta', valid: !!editingData?.pregunta?.trim() },
    { id: 'faq-respuesta', label: 'Respuesta', valid: !!editingData?.respuesta?.trim() },
  ]);

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
    v.reset();
    setIsEditing(true);
  };

  const handleEdit = (item) => {
    setEditingData({ ...item, links: item.links || [] });
    v.reset();
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
    if (!(await confirm({ message: '¿Eliminar esta pregunta?', destructive: true }))) return;
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
              <SubmitButton className="btn-primary" missing={v.missing} onMissing={v.revealAll} onClick={handleSave}><Save size={16} /> Guardar</SubmitButton>
            </div>
          </div>
          <div className="form-body">
            <div className="form-group">
              <label htmlFor="faq-pregunta">Pregunta *</label>
              <input id="faq-pregunta" {...v.fieldProps('faq-pregunta')} className="form-control" value={editingData.pregunta} onChange={e => setEditingData(d => ({ ...d, pregunta: e.target.value }))} placeholder="¿Cuál es la pregunta?" />
              <FieldError show={v.isInvalid('faq-pregunta')}>Ingresá la pregunta</FieldError>
            </div>
            <div className="form-group">
              <label htmlFor="faq-respuesta">Respuesta *</label>
              <textarea id="faq-respuesta" {...v.fieldProps('faq-respuesta')} className="form-control" rows={5} value={editingData.respuesta} onChange={e => setEditingData(d => ({ ...d, respuesta: e.target.value }))} placeholder="Escribí la respuesta completa..." />
              <FieldError show={v.isInvalid('faq-respuesta')}>Ingresá la respuesta</FieldError>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Sector</label>
                <Select value={String(editingData.sector_id || '')} onChange={v => setEditingData(d => ({ ...d, sector_id: v }))} placeholder="Sin sector"
                  options={[{ value: '', label: 'Sin sector' }, ...sectores.map(s => ({ value: String(s.id), label: s.nombre }))]} />
              </div>
              <div className="form-group">
                <label>Orden</label>
                <input type="number" className="form-control" value={editingData.numero_orden} onChange={e => setEditingData(d => ({ ...d, numero_orden: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <Select value={editingData.activo ? 'true' : 'false'} onChange={v => setEditingData(d => ({ ...d, activo: v === 'true' }))}
                  options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} />
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
          <section key={sector} style={{ '--tone': color }}>
            <h4 className="adm-group-label adm-group-label-row">
              <span className="adm-badge tone">{sector}</span>
              <span>{items.length}</span>
            </h4>
            <ul className="adm-list">
              {items.map(p => (
                <li key={p.id} className={`adm-row${!p.activo ? ' muted' : ''}`}>
                  <span className="adm-row-icon"><MessageCircle size={18} strokeWidth={1.5} /></span>
                  <div className="adm-row-info">
                    <div className="adm-row-title">
                      <span className="adm-ellipsis">{p.pregunta}</span>
                      {!p.activo && <span className="adm-badge danger">Inactivo</span>}
                    </div>
                    <div className="adm-row-meta">
                      <span className="adm-ellipsis">{p.respuesta.slice(0, 80)}{p.respuesta.length > 80 ? '…' : ''}</span>
                    </div>
                  </div>
                  <div className="adm-actions hover-reveal">
                    <button type="button" className="adm-action" aria-label="Editar pregunta" onClick={() => handleEdit(p)}><Pencil size={16} strokeWidth={1.5} /></button>
                    <button type="button" className="adm-action danger" aria-label="Eliminar pregunta" onClick={() => handleDelete(p.id)}><Trash2 size={16} strokeWidth={1.5} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </AdminListPanel>
  );
};

export default FAQTab;
