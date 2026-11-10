import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Calendar, Pencil } from 'lucide-react';
import { CheckCircle, HelpCircle, X } from 'lucide-react';
import { fetchPAF, createPafPlan, savePafItem, deletePafItem } from '../../../services/pafService';
import { fetchCursos, fetchCursosCategorias } from '../../../services/cursosService';
import { LoadingSpinner, useToast, Select, SubmitButton, FieldError } from '../../../components/common';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import { useConfirm } from '../../../contexts/ConfirmContext';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PAFTab = () => {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [planes, setPlanes] = useState([]);
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [newAnio, setNewAnio] = useState(new Date().getFullYear());
  const [editingItem, setEditingItem] = useState(null);
  const vf = useRequiredFields([
    { id: 'paf-item-titulo', label: 'Nombre', valid: !!editingItem?.titulo?.trim() },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [pafRes, cursosRes, catRes] = await Promise.all([
      fetchPAF(),
      fetchCursos(),
      fetchCursosCategorias(),
    ]);
    setPlanes(pafRes.planes);
    setItems(pafRes.items);
    setCourses(cursosRes.data);
    setCategories(catRes.data);
    setIsLoading(false);
  };

  const loadPAF = async () => {
    const { planes: p, items: i } = await fetchPAF();
    setPlanes(p);
    setItems(i);
  };

  const getPlanForAnio = (anio) => planes.find(p => p.anio === anio) || null;

  const handleCreatePlan = async (anio) => {
    if (planes.find(p => p.anio === anio)) return showToast('Ya existe un plan para ese año.', 'warning');
    const { error } = await createPafPlan(anio);
    if (error) return showToast(error.message, 'error');
    await loadPAF();
    setSelectedAnio(anio);
  };

  const handleSaveItem = async () => {
    if (!editingItem?.titulo) return;
    const plan = getPlanForAnio(selectedAnio);
    if (!plan) return showToast('No existe un plan para este año.', 'warning');
    const { error } = await savePafItem({
      ...editingItem,
      plan_id: plan.id,
      descripcion: editingItem.descripcion || '',
      orden: editingItem.orden || 0,
      categoria_id: editingItem.categoria_id || null,
    });
    if (error) return showToast(error.message, 'error');
    await loadPAF();
    setEditingItem(null);
    vf.reset();
  };

  const handleDeleteItem = async (id) => {
    if (!(await confirm({ message: '¿Eliminar esta capacitación del plan?', destructive: true }))) return;
    await deletePafItem(id);
    await loadPAF();
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><LoadingSpinner size={28} /></div>;
  }

  const planActivo = getPlanForAnio(selectedAnio);
  const itemsDelPlan = planActivo ? items.filter(i => i.plan_id === planActivo.id) : [];
  const aniosExistentes = planes.map(p => p.anio);
  const cursosLinkeados = courses.filter(c =>
    c.es_paf && planActivo && itemsDelPlan.map(i => i.id).includes(c.paf_item_id)
  );
  const pct = itemsDelPlan.length > 0 ? Math.round((cursosLinkeados.length / itemsDelPlan.length) * 100) : 0;

  const formItem = (autoFocus = false) => (
    <div className="paf-item-form">
      <input
        id="paf-item-titulo"
        {...vf.fieldProps('paf-item-titulo')}
        className="form-control"
        placeholder="Nombre de la capacitación"
        aria-label="Nombre de la capacitación"
        value={editingItem.titulo}
        onChange={e => setEditingItem({ ...editingItem, titulo: e.target.value })}
        autoFocus={autoFocus}
      />
      <FieldError show={vf.isInvalid('paf-item-titulo')}>Ingresá el nombre de la capacitación</FieldError>
      <Select
        size="sm"
        value={String(editingItem.categoria_id || '')}
        onChange={v => setEditingItem({ ...editingItem, categoria_id: v || null })}
        placeholder="Sin categoría"
        options={[{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: String(c.id), label: c.nombre }))]}
        aria-label="Categoría"
      />
      <input
        className="form-control"
        placeholder="Descripción (opcional)"
        aria-label="Descripción"
        value={editingItem.descripcion || ''}
        onChange={e => setEditingItem({ ...editingItem, descripcion: e.target.value })}
      />
      <div className="paf-item-form-actions">
        <button type="button" className="paf-btn ghost" onClick={() => { setEditingItem(null); vf.reset(); }}><X size={14} strokeWidth={1.5} /> Cancelar</button>
        <SubmitButton className="paf-btn primary" missing={vf.missing} onMissing={vf.revealAll} onClick={handleSaveItem}><Save size={14} strokeWidth={1.5} /> Guardar</SubmitButton>
      </div>
    </div>
  );

  return (
    <div className="admin-list-panel paf">
      <div className="admin-list-header">
        <div>
          <h3>Plan Anual de Formación</h3>
          <p className="paf-subtitle">Planificá y seguí las capacitaciones del año</p>
        </div>
        <div className="paf-new-plan">
          <input
            type="number"
            className="form-control"
            aria-label="Año del nuevo plan"
            value={newAnio}
            onChange={e => setNewAnio(parseInt(e.target.value))}
          />
          <button type="button" className="btn-add-admin" onClick={() => handleCreatePlan(newAnio)}>
            <Plus size={16} /> Nuevo plan
          </button>
        </div>
      </div>

      {aniosExistentes.length > 0 && (
        <div className="org-segmented paf-years" role="tablist" aria-label="Año del plan">
          {aniosExistentes.sort((a, b) => a - b).map(anio => (
            <button
              key={anio}
              type="button"
              role="tab"
              aria-selected={selectedAnio === anio}
              className={selectedAnio === anio ? 'active' : ''}
              onClick={() => setSelectedAnio(anio)}
            >{anio}</button>
          ))}
        </div>
      )}

      {!planActivo ? (
        <div className="adm-empty">
          <Calendar size={40} strokeWidth={1.5} className="paf-empty-icon" />
          <p className="paf-empty-title">No hay plan PAF para {selectedAnio}</p>
          <p>Creá uno con el botón “Nuevo plan”.</p>
        </div>
      ) : (
        <>
          <div className="paf-progress">
            <div className="paf-progress-main">
              <span className="adm-group-label paf-progress-label">Progreso del plan {selectedAnio}</span>
              <div className="paf-progress-pct">{pct}%</div>
              <div className="paf-progress-sub">{cursosLinkeados.length} de {itemsDelPlan.length} ejecutadas</div>
            </div>
            <div className="paf-progress-side">
              <div className="paf-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del plan">
                <div className="paf-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="paf-stats">
                <div><strong>{itemsDelPlan.length}</strong><span>Planificadas</span></div>
                <div className="success"><strong>{cursosLinkeados.length}</strong><span>Disponibles</span></div>
                <div className="warning"><strong>{itemsDelPlan.length - cursosLinkeados.length}</strong><span>Pendientes</span></div>
              </div>
            </div>
          </div>

          <div className="paf-months">
            {MESES.map((nombreMes, idx) => {
              const mes = idx + 1;
              const itemsMes = itemsDelPlan.filter(i => i.mes === mes);
              const completadosMes = itemsMes.filter(i => courses.find(c => c.paf_item_id === i.id)).length;
              const isEditingInThisMes = editingItem && editingItem.mes === mes && !editingItem.id;
              const hayItems = itemsMes.length > 0;

              return (
                <section key={mes} className={`paf-month${hayItems ? ' has-items' : ''}`} aria-label={nombreMes}>
                  <header className="paf-month-head">
                    <div className="paf-month-name">
                      <span>{nombreMes}</span>
                      {hayItems && (
                        <span className={`adm-badge ${completadosMes === itemsMes.length ? 'success' : ''}`}>
                          {completadosMes}/{itemsMes.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="paf-add"
                      aria-label={`Agregar capacitación en ${nombreMes}`}
                      onClick={() => setEditingItem({ mes, titulo: '', descripcion: '', orden: itemsMes.length, plan_id: planActivo.id })}
                    >
                      <Plus size={14} strokeWidth={1.5} /> Agregar
                    </button>
                  </header>

                  <div className="paf-month-body">
                    {itemsMes.map(item => {
                      const cursoVinculado = courses.find(c => c.paf_item_id === item.id);
                      const isEditingThis = editingItem?.id === item.id;
                      const cat = item.categoria_id ? categories.find(c => c.id === item.categoria_id) : null;
                      return isEditingThis ? (
                        <div key={item.id}>{formItem(false)}</div>
                      ) : (
                        <div key={item.id} className="paf-item">
                          <div className="paf-item-top">
                            <div className="adm-row-info">
                              <span className="paf-item-title">{item.titulo}</span>
                              {cat && <span className="adm-badge tone" style={{ '--tone': cat.color }}>{cat.nombre}</span>}
                            </div>
                            <div className="adm-actions">
                              <button type="button" className="adm-action" aria-label={`Editar ${item.titulo}`} onClick={() => setEditingItem({ ...item })}><Pencil size={14} strokeWidth={1.5} /></button>
                              <button type="button" className="adm-action danger" aria-label={`Eliminar ${item.titulo}`} onClick={() => handleDeleteItem(item.id)}><Trash2 size={14} strokeWidth={1.5} /></button>
                            </div>
                          </div>
                          {item.descripcion && <p className="paf-item-desc">{item.descripcion}</p>}
                          {cursoVinculado ? (
                            <span className="paf-status success"><CheckCircle size={13} strokeWidth={1.5} /> Disponible para el personal</span>
                          ) : (
                            <span className="paf-status warning"><HelpCircle size={13} strokeWidth={1.5} /> Pendiente de ejecución</span>
                          )}
                        </div>
                      );
                    })}

                    {isEditingInThisMes && formItem(true)}

                    {!hayItems && !isEditingInThisMes && (
                      <p className="paf-month-empty">Sin capacitaciones</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PAFTab;
