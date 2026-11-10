import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ChevronLeft, GripVertical, Pencil } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { fetchOnboardingSteps, fetchOnboardingBloques, saveOnboardingStep, deleteOnboardingStep, reorderOnboardingSteps } from '../../../services/onboardingService';
import { updateBlockInList, updateBlockMetaInList } from '../../../lib/blockUtils';
import BlocksEditor from '../shared/BlocksEditor';
import { LoadingSpinner, useToast, SubmitButton, FieldError } from '../../../components/common';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import { useConfirm } from '../../../contexts/ConfirmContext';

const EMPTY_STEP = { titulo: '', subtitulo: '', icono: 'building', activo: true };

const OnboardingTab = () => {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [editingBlocks, setEditingBlocks] = useState([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const v = useRequiredFields([
    { id: 'onb-titulo', label: 'Título del paso', valid: !!editingData?.titulo?.trim() },
  ]);

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
    v.reset();
    setIsEditing(true);
  };

  const handleEdit = async (step) => {
    setEditingData(step);
    v.reset();
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
    if (!(await confirm({ message: '¿Eliminar este paso?', destructive: true }))) return;
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
            <SubmitButton className="btn-primary" missing={v.missing} onMissing={v.revealAll} onClick={handleSave}><Save size={18} /> Guardar Cambios</SubmitButton>
          </div>
        </div>

        <div className="edit-card">
          <div className="form-group" style={{ marginBottom: '40px' }}>
            <label htmlFor="onb-titulo">Título del Paso *</label>
            <input
              id="onb-titulo"
              {...v.fieldProps('onb-titulo')}
              className="form-control"
              style={{ fontSize: '18px', fontWeight: '700' }}
              value={editingData.titulo}
              onChange={e => setEditingData(d => ({ ...d, titulo: e.target.value }))}
              placeholder="Ej: ¡Bienvenido a Ribeiro!"
            />
            <FieldError show={v.isInvalid('onb-titulo')}>Ingresá un título</FieldError>
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
    <div className="admin-list-panel">
      <div className="admin-list-header">
        <h3>Pasos de Inducción <span className="admin-count">{steps.length}</span></h3>
        <button type="button" className="btn-add-admin" onClick={handleCreate}><Plus size={16} /> Agregar paso</button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><LoadingSpinner size={24} /></div>
      ) : steps.length === 0 ? (
        <p className="adm-empty">No hay pasos de inducción todavía.</p>
      ) : (
        <Reorder.Group axis="y" values={steps} onReorder={handleReorder} className="adm-list">
          {steps.map((step, i) => (
            <Reorder.Item key={step.id} value={step} className="adm-row adm-row-draggable">
              <span className="adm-drag" aria-hidden="true"><GripVertical size={16} strokeWidth={1.5} /></span>
              <span className="adm-row-icon round">{i + 1}</span>
              <div className="adm-row-info">
                <div className="adm-row-title"><span className="adm-ellipsis">{step.titulo}</span></div>
                {step.subtitulo && <div className="adm-row-meta"><span className="adm-ellipsis">{step.subtitulo}</span></div>}
              </div>
              <div className="adm-actions hover-reveal">
                <button type="button" className="adm-action" aria-label={`Editar ${step.titulo}`} onClick={() => handleEdit(step)}><Pencil size={16} strokeWidth={1.5} /></button>
                <button type="button" className="adm-action danger" aria-label={`Eliminar ${step.titulo}`} onClick={() => handleDelete(step.id)}><Trash2 size={16} strokeWidth={1.5} /></button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
};

export default OnboardingTab;
