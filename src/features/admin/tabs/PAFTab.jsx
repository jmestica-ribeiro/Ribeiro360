import React, { useState, useEffect } from 'react';
import { Plus, Save, Edit2, Trash2, Calendar } from 'lucide-react';
import { CheckCircle, HelpCircle, X } from 'lucide-react';
import { fetchPAF, createPafPlan, savePafItem, deletePafItem } from '../../../services/pafService';
import { fetchCursos, fetchCursosCategorias } from '../../../services/cursosService';
import { LoadingSpinner, useToast } from '../../../components/common';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PAFTab = () => {
  const { showToast } = useToast();
  const [planes, setPlanes] = useState([]);
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [newAnio, setNewAnio] = useState(new Date().getFullYear());
  const [editingItem, setEditingItem] = useState(null);

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
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('¿Eliminar esta capacitación del plan?')) return;
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
    <div style={{ background: '#f5f7ff', border: '1.5px solid #c7d0ff', borderRadius: '10px', padding: '12px', marginTop: '8px' }}>
      <input
        className="form-control"
        style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
        placeholder="Nombre de la capacitación"
        value={editingItem.titulo}
        onChange={e => setEditingItem({ ...editingItem, titulo: e.target.value })}
        autoFocus={autoFocus}
      />
      <select
        className="form-control"
        style={{ marginBottom: '8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
        value={editingItem.categoria_id || ''}
        onChange={e => setEditingItem({ ...editingItem, categoria_id: e.target.value || null })}
      >
        <option value="">Sin categoría</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <input
        className="form-control"
        style={{ marginBottom: '10px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
        placeholder="Descripción (opcional)"
        value={editingItem.descripcion || ''}
        onChange={e => setEditingItem({ ...editingItem, descripcion: e.target.value })}
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        <button className="btn-primary" style={{ fontSize: '12px', padding: '5px 14px' }} onClick={handleSaveItem}><Save size={12} /> Guardar</button>
        <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 14px' }} onClick={() => setEditingItem(null)}><X size={12} /> Cancelar</button>
      </div>
    </div>
  );

  return (
    <div className="admin-section">
      {/* Header con selector de año */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontWeight: '800', fontSize: '22px', margin: 0 }}>Plan Anual de Formación</h3>
          <p style={{ color: '#888', fontSize: '13px', margin: '2px 0 0' }}>Planificá y seguí las capacitaciones del año</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            className="form-control"
            style={{ width: '90px', fontSize: '13px' }}
            value={newAnio}
            onChange={e => setNewAnio(parseInt(e.target.value))}
          />
          <button className="btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => handleCreatePlan(newAnio)}>
            <Plus size={15} /> Nuevo plan
          </button>
        </div>
      </div>

      {/* Tabs de año */}
      {aniosExistentes.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px', borderBottom: '2px solid #f0f0f0', paddingBottom: '0' }}>
          {aniosExistentes.sort((a, b) => a - b).map(anio => (
            <button
              key={anio}
              onClick={() => setSelectedAnio(anio)}
              style={{
                padding: '8px 22px', border: 'none', background: 'none', fontWeight: '700', fontSize: '15px',
                color: selectedAnio === anio ? '#4361ee' : '#aaa', cursor: 'pointer',
                borderBottom: selectedAnio === anio ? '2px solid #4361ee' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s',
              }}
            >{anio}</button>
          ))}
        </div>
      )}

      {!planActivo ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#bbb' }}>
          <Calendar size={52} style={{ margin: '0 auto 16px', opacity: 0.2, display: 'block' }} />
          <p style={{ fontWeight: '600', fontSize: '15px' }}>No hay plan PAF para {selectedAnio}</p>
          <p style={{ fontSize: '13px' }}>Creá uno con el botón "Nuevo plan"</p>
        </div>
      ) : (
        <>
          {/* Banner de progreso */}
          <div style={{ background: 'linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)', borderRadius: '16px', padding: '24px 28px', marginBottom: '28px', color: '#fff', display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px', fontWeight: '500' }}>Progreso del plan {selectedAnio}</div>
              <div style={{ fontSize: '36px', fontWeight: '900', lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>{cursosLinkeados.length} de {itemsDelPlan.length} ejecutadas</div>
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ background: '#fff', height: '100%', width: `${pct}%`, borderRadius: '8px', transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800' }}>{itemsDelPlan.length}</div>
                  <div style={{ fontSize: '11px', opacity: 0.75 }}>Planificadas</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#a7f3d0' }}>{cursosLinkeados.length}</div>
                  <div style={{ fontSize: '11px', opacity: 0.75 }}>Disponibles</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#fde68a' }}>{itemsDelPlan.length - cursosLinkeados.length}</div>
                  <div style={{ fontSize: '11px', opacity: 0.75 }}>Pendientes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de meses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {MESES.map((nombreMes, idx) => {
              const mes = idx + 1;
              const itemsMes = itemsDelPlan.filter(i => i.mes === mes);
              const completadosMes = itemsMes.filter(i => courses.find(c => c.paf_item_id === i.id)).length;
              const isEditingInThisMes = editingItem && editingItem.mes === mes && !editingItem.id;
              const hayItems = itemsMes.length > 0;

              return (
                <div key={mes} style={{ borderRadius: '14px', overflow: 'hidden', border: '1.5px solid', borderColor: hayItems ? '#e0e4ff' : '#f0f0f0', background: '#fff', boxShadow: hayItems ? '0 2px 12px rgba(67,97,238,0.07)' : 'none' }}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid', borderColor: hayItems ? '#e0e4ff' : '#f5f5f5', background: hayItems ? '#f5f7ff' : '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', fontSize: '13px', color: hayItems ? '#4361ee' : '#aaa' }}>{nombreMes}</span>
                      {hayItems && (
                        <span style={{ fontSize: '11px', background: completadosMes === itemsMes.length ? '#d1fae5' : '#e0e4ff', color: completadosMes === itemsMes.length ? '#16a34a' : '#4361ee', borderRadius: '20px', padding: '1px 8px', fontWeight: '700' }}>
                          {completadosMes}/{itemsMes.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingItem({ mes, titulo: '', descripcion: '', orden: itemsMes.length, plan_id: planActivo.id })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4361ee', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '600', padding: '2px 6px', borderRadius: '6px' }}
                    >
                      <Plus size={13} /> Agregar
                    </button>
                  </div>

                  <div style={{ padding: '10px' }}>
                    {itemsMes.map(item => {
                      const cursoVinculado = courses.find(c => c.paf_item_id === item.id);
                      const isEditingThis = editingItem?.id === item.id;
                      return isEditingThis ? (
                        <div key={item.id}>{formItem(false)}</div>
                      ) : (
                        <div key={item.id} style={{ borderRadius: '10px', marginBottom: '8px', overflow: 'hidden', border: '1px solid', borderColor: cursoVinculado ? '#bbf7d0' : '#ececec' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', background: cursoVinculado ? '#f0fdf4' : '#fff' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: '700', fontSize: '13px', lineHeight: '1.3', display: 'block' }}>{item.titulo}</span>
                              {item.categoria_id && (() => {
                                const cat = categories.find(c => c.id === item.categoria_id);
                                return cat ? <span style={{ display: 'inline-block', marginTop: '3px', fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '20px', background: cat.color + '22', color: cat.color }}>{cat.nombre}</span> : null;
                              })()}
                            </div>
                            <div style={{ display: 'flex', gap: '2px', marginLeft: '6px', flexShrink: 0 }}>
                              <button className="action-btn edit" style={{ padding: '3px 5px' }} onClick={() => setEditingItem({ ...item })}><Edit2 size={12} /></button>
                              <button className="action-btn delete" style={{ padding: '3px 5px' }} onClick={() => handleDeleteItem(item.id)}><Trash2 size={12} /></button>
                            </div>
                          </div>
                          {item.descripcion && <div style={{ padding: '0 10px 7px', fontSize: '11px', color: '#888' }}>{item.descripcion}</div>}
                          <div style={{ padding: '5px 10px 7px', display: 'flex', alignItems: 'center', gap: '5px', borderTop: '1px solid', borderColor: cursoVinculado ? '#bbf7d0' : '#f0f0f0', background: cursoVinculado ? '#dcfce7' : '#fafafa' }}>
                            {cursoVinculado ? (
                              <>
                                <CheckCircle size={12} color="#16a34a" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>Disponible para el personal</span>
                              </>
                            ) : (
                              <>
                                <HelpCircle size={12} color="#f59e0b" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600' }}>Pendiente de ejecución</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isEditingInThisMes && formItem(true)}

                    {!hayItems && !isEditingInThisMes && (
                      <div style={{ textAlign: 'center', padding: '14px 0', color: '#ccc', fontSize: '12px' }}>Sin capacitaciones</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PAFTab;
