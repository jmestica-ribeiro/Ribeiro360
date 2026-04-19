import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { fetchOnboardingSteps, fetchOnboardingBloques, saveOnboardingStep, deleteOnboardingStep, reorderOnboardingSteps } from '../../../services/onboardingService';
import { updateBlockInList, updateBlockMetaInList } from '../../../lib/blockUtils';
import BlocksEditor from '../shared/BlocksEditor';
import { LoadingSpinner, useToast } from '../../../components/common';

const EMPTY_STEP = { titulo: '', subtitulo: '', icono: 'building', activo: true };

const OnboardingTab = () => {
  const { showToast } = useToast();
  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [editingBlocks, setEditingBlocks] = useState([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  useEffect(() => {
    loadSteps();
  }, []);

  const loadSteps = async () => {
    setIsLoading(true);
    const { data } = await fetchOnboardingSteps();
    setSteps(data);
    setIsLoading(false);
  };

  const handleCreate = () => {
    setEditingData({ ...EMPTY_STEP });
    setEditingBlocks([]);
    setIsEditing(true);
  };

  const handleEdit = async (step) => {
    setEditingData(step);
    setIsEditing(true);
    setEditingBlocks([]);
    setIsLoadingBlocks(true);
    const { data } = await fetchOnboardingBloques(step.id);
    setEditingBlocks(data);
    setIsLoadingBlocks(false);
  };

  const handleBack = () => {
    setIsEditing(false);
    setEditingData(null);
  };

  const handleSave = async () => {
    if (!editingData.titulo) return;
    const { error } = await saveOnboardingStep(editingData, editingBlocks);
    if (error) return showToast(error.message, 'error');
    await loadSteps();
    handleBack();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este paso?')) return;
    await deleteOnboardingStep(id);
    await loadSteps();
  };

  const handleReorder = async (newOrder) => {
    setSteps(newOrder);
    await reorderOnboardingSteps(newOrder);
  };

  if (isEditing) {
    return (
      <div className="admin-form-section">
        <div className="form-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn-back" onClick={handleBack}><ChevronLeft size={20} /></button>
            <h3>{editingData?.id ? 'Editar Paso de Onboarding' : 'Nuevo Paso'}</h3>
          </div>
          <div className="form-header-actions">
            <button className="btn-primary" onClick={handleSave}><Save size={18} /> Guardar Cambios</button>
          </div>
        </div>

        <div className="edit-card">
          <div className="form-group" style={{ marginBottom: '40px' }}>
            <label>Título del Paso</label>
            <input
              className="form-control"
              style={{ fontSize: '18px', fontWeight: '700' }}
              value={editingData.titulo}
              onChange={e => setEditingData(d => ({ ...d, titulo: e.target.value }))}
              placeholder="Ej: ¡Bienvenido a Ribeiro!"
            />
          </div>

          <div className="form-group mb-6">
            <label>Subtítulo / Descripción corta</label>
            <input
              className="form-control"
              value={editingData.subtitulo}
              onChange={e => setEditingData(d => ({ ...d, subtitulo: e.target.value }))}
              placeholder="Una breve descripción que aparece en el listado..."
            />
          </div>

          <div className="section-divider" style={{ margin: '48px 0', borderBottom: '2px solid #f0f0f0' }} />

          <h4 className="mb-4" style={{ fontSize: '20px', fontWeight: '800' }}>Bloques de Contenido</h4>
          <p className="text-muted text-sm mb-4">Añade elementos para construir la experiencia del usuario.</p>

          {isLoadingBlocks ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><LoadingSpinner size={24} /></div>
          ) : (
            <BlocksEditor
              blocks={editingBlocks}
              onUpdate={(id, f, v) => setEditingBlocks(b => updateBlockInList(b, id, f, v))}
              onUpdateMeta={(id, k, v) => setEditingBlocks(b => updateBlockMetaInList(b, id, k, v))}
              onRemove={(id) => setEditingBlocks(b => b.filter(bl => bl.id !== id))}
              onAdd={(tipo) => setEditingBlocks(b => [...b, { id: 'temp-' + Date.now(), tipo, contenido: '', metadata: {} }])}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="section-toolbar">
        <h3>Pasos de Inducción</h3>
        <button className="btn-primary" onClick={handleCreate}><Plus size={18} /> Agregar Paso</button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><LoadingSpinner size={24} /></div>
      ) : (
        <Reorder.Group axis="y" values={steps} onReorder={handleReorder} className="steps-list">
          {steps.map(step => (
            <Reorder.Item key={step.id} value={step} className="step-list-item">
              <div className="step-drag-handle">
                <GripVertical size={20} className="text-muted" />
              </div>
              <div className="step-list-info">
                <h4>{step.titulo}</h4>
                <p>{step.subtitulo}</p>
              </div>
              <div className="actions-cell">
                <button className="action-btn edit" onClick={() => handleEdit(step)}><Edit2 size={16} /></button>
                <button className="action-btn delete" onClick={() => handleDelete(step.id)}><Trash2 size={16} /></button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
};

export default OnboardingTab;
