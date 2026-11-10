import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, ArrowRight } from 'lucide-react';
import { fetchFamilias, saveFamilia, deleteFamilia, fetchModelosCodigos } from '../../../services/vehiculosService';
import { TIPOS_EQUIPO } from '../../sgi/checklists-equipo/tiposEquipo';
import { LoadingSpinner } from '../../../components/common';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Select } from '../../../components/common';

const FamiliasTab = () => {
  const confirm = useConfirm();
  const [familias, setFamilias]     = useState([]);
  const [modelos, setModelos]       = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ modelo_codigo: '', tipo_equipo: '' });

  const load = async () => {
    setIsLoading(true);
    const [{ data: fam }, { data: mod }] = await Promise.all([
      fetchFamilias(),
      fetchModelosCodigos(),
    ]);
    setFamilias(fam);
    setModelos(mod);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const yaConfigurados = new Set(familias.map(f => f.modelo_codigo));
  const modelosSinFamilia = modelos.filter(m => !yaConfigurados.has(m));

  const handleAdd = async () => {
    if (!form.modelo_codigo || !form.tipo_equipo) return;
    setSaving(true);
    await saveFamilia(form);
    setForm({ modelo_codigo: '', tipo_equipo: '' });
    await load();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ message: '¿Eliminar este mapeo?', destructive: true }))) return;
    await deleteFamilia(id);
    await load();
  };

  const tipoLabel = (key) => TIPOS_EQUIPO.find(t => t.key === key)?.label ?? key;

  const canAdd = !saving && form.modelo_codigo && form.tipo_equipo;

  return (
    <div className="adm-panel adm-familias">
      <div className="admin-list-header">
        <div>
          <h3>Familias de equipos <span className="admin-count">{familias.length}</span></h3>
          <p className="adm-panel-desc">
            Mapeá cada <strong>Modelo_Codigo</strong> al tipo de checklist correspondiente.
          </p>
        </div>
      </div>

      <div className="adm-card adm-inline-form">
        <div className="adm-inline-field">
          <span className="adm-field-label">Modelo_Codigo</span>
          <Select
            size="sm"
            value={form.modelo_codigo || ''}
            onChange={v => setForm(f => ({ ...f, modelo_codigo: v }))}
            placeholder="Seleccionar modelo"
            aria-label="Modelo_Codigo"
            options={[
              ...modelosSinFamilia,
              ...(form.modelo_codigo && !modelosSinFamilia.includes(form.modelo_codigo) ? [form.modelo_codigo] : []),
            ]}
          />
        </div>
        <div className="adm-inline-field">
          <span className="adm-field-label">Tipo de checklist</span>
          <Select
            size="sm"
            value={form.tipo_equipo || ''}
            onChange={v => setForm(f => ({ ...f, tipo_equipo: v }))}
            placeholder="Seleccionar tipo"
            aria-label="Tipo de checklist"
            options={TIPOS_EQUIPO.map(t => ({ value: t.key, label: t.label }))}
          />
        </div>
        <button type="button" className="btn-add-admin" onClick={handleAdd} disabled={!canAdd}>
          <Plus size={16} strokeWidth={1.5} /> Agregar
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : familias.length === 0 ? (
        <div className="adm-empty">No hay familias configuradas. Agregá la primera arriba.</div>
      ) : (
        <ul className="adm-list">
          {familias.map(f => (
            <li key={f.id} className="adm-row">
              <span className="adm-row-icon"><Tag size={18} strokeWidth={1.5} /></span>
              <div className="adm-row-info">
                <div className="adm-row-title">
                  <span className="adm-badge mono neutral">{f.modelo_codigo}</span>
                  <ArrowRight size={14} strokeWidth={1.5} className="adm-arrow" aria-hidden="true" />
                  <span className="adm-badge">{tipoLabel(f.tipo_equipo)}</span>
                </div>
              </div>
              <div className="adm-actions hover-reveal">
                <button type="button" className="adm-action danger" aria-label={`Eliminar mapeo ${f.modelo_codigo}`} onClick={() => handleDelete(f.id)}>
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modelosSinFamilia.length > 0 && (
        <p className="adm-footnote">
          <strong>{modelosSinFamilia.length}</strong> modelo{modelosSinFamilia.length !== 1 ? 's' : ''} sin familia asignada en la base de datos.
        </p>
      )}
    </div>
  );
};

export default FamiliasTab;
