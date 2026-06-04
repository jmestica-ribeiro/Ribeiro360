import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { fetchFamilias, saveFamilia, deleteFamilia, fetchModelosCodigos } from '../../../services/vehiculosService';
import { TIPOS_EQUIPO } from '../../sgi/checklists-equipo/tiposEquipo';
import { LoadingSpinner } from '../../../components/common';

const FamiliasTab = () => {
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
    if (!window.confirm('¿Eliminar este mapeo?')) return;
    await deleteFamilia(id);
    await load();
  };

  const tipoLabel = (key) => TIPOS_EQUIPO.find(t => t.key === key)?.label ?? key;

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: '#6366f118', color: '#6366f1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Tag size={18} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Familias de Equipos
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Mapeá cada <strong>Modelo_Codigo</strong> al tipo de checklist correspondiente.
          </p>
        </div>
      </div>

      {/* Formulario nuevo mapeo */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-end',
        padding: '16px', borderRadius: 10,
        background: 'var(--bg-card)', border: '1px solid var(--border-color,#e5e7eb)',
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Modelo_Codigo
          </label>
          <select
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 13,
              border: '1px solid var(--border-color,#e5e7eb)',
              background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none',
            }}
            value={form.modelo_codigo}
            onChange={e => setForm(f => ({ ...f, modelo_codigo: e.target.value }))}
          >
            <option value="">— Seleccionar modelo —</option>
            {modelosSinFamilia.map(m => <option key={m} value={m}>{m}</option>)}
            {form.modelo_codigo && !modelosSinFamilia.includes(form.modelo_codigo) && (
              <option value={form.modelo_codigo}>{form.modelo_codigo}</option>
            )}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Tipo de checklist
          </label>
          <select
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 13,
              border: '1px solid var(--border-color,#e5e7eb)',
              background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none',
            }}
            value={form.tipo_equipo}
            onChange={e => setForm(f => ({ ...f, tipo_equipo: e.target.value }))}
          >
            <option value="">— Seleccionar tipo —</option>
            {TIPOS_EQUIPO.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !form.modelo_codigo || !form.tipo_equipo}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: '#6366f1', color: '#fff', border: 'none',
            cursor: saving || !form.modelo_codigo || !form.tipo_equipo ? 'not-allowed' : 'pointer',
            opacity: saving || !form.modelo_codigo || !form.tipo_equipo ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      {/* Lista */}
      {isLoading ? <LoadingSpinner /> : (
        <div style={{ border: '1px solid var(--border-color,#e5e7eb)', borderRadius: 10, overflow: 'hidden' }}>
          {familias.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
              No hay familias configuradas. Agregá la primera arriba.
            </div>
          ) : familias.map((f, idx) => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
              borderBottom: idx < familias.length - 1 ? '1px solid var(--border-color,#e5e7eb)' : 'none',
              background: 'var(--bg-main)',
            }}>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: '#e0e7ff', color: '#3730a3',
              }}>{f.modelo_codigo}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>→</span>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: '#6366f118', color: '#6366f1',
              }}>{tipoLabel(f.tipo_equipo)}</span>
              <button
                onClick={() => handleDelete(f.id)}
                style={{
                  marginLeft: 'auto', background: 'none', border: 'none',
                  cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 4, borderRadius: 6,
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {modelosSinFamilia.length > 0 && (
        <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
          <strong>{modelosSinFamilia.length}</strong> modelo{modelosSinFamilia.length !== 1 ? 's' : ''} sin familia asignada en la base de datos.
        </p>
      )}
    </div>
  );
};

export default FamiliasTab;
