import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GripVertical, X } from 'lucide-react';
import { fetchAllCheqItems, saveCheqItem, deleteCheqItem } from '../../../services/sgiService';
import { TIPOS_EQUIPO } from '../../sgi/checklists-equipo/tiposEquipo';
import { LoadingSpinner } from '../../../components/common';

const ChecklistItemsTab = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tipoActivo, setTipoActivo] = useState(TIPOS_EQUIPO[0].key);
  const [newNombre, setNewNombre] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const { data } = await fetchAllCheqItems();
    setItems(data);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const itemsDelTipo = items
    .filter(i => i.tipo_equipo === tipoActivo)
    .sort((a, b) => a.orden - b.orden);

  const handleAdd = async () => {
    const nombre = newNombre.trim();
    if (!nombre) return;
    setSaving(true);
    const orden = itemsDelTipo.length > 0
      ? Math.max(...itemsDelTipo.map(i => i.orden)) + 1
      : 1;
    await saveCheqItem({ tipo_equipo: tipoActivo, nombre, orden, activo: true });
    setNewNombre('');
    await load();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este ítem?')) return;
    await deleteCheqItem(id);
    await load();
  };

  const handleToggle = async (item) => {
    await saveCheqItem({ id: item.id, activo: !item.activo });
    await load();
  };

  const tipoLabel = TIPOS_EQUIPO.find(t => t.key === tipoActivo)?.label ?? tipoActivo;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
          Ítems de Checklists de Equipo
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Administrá los puntos de verificación para cada tipo de equipo.
        </p>
      </div>

      {/* Selector de tipo */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TIPOS_EQUIPO.map(t => (
          <button
            key={t.key}
            onClick={() => setTipoActivo(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1.5px solid',
              borderColor: tipoActivo === t.key ? 'var(--primary-color, #6366f1)' : 'var(--border-color, #e5e7eb)',
              background: tipoActivo === t.key ? 'var(--primary-color, #6366f1)' : 'var(--bg-card)',
              color: tipoActivo === t.key ? '#fff' : 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            {t.label}
            <span style={{
              marginLeft: 6, fontSize: 11, opacity: 0.7,
            }}>
              {items.filter(i => i.tipo_equipo === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Agregar ítem */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20,
        padding: '14px 16px', borderRadius: 10,
        background: 'var(--bg-card)', border: '1px solid var(--border-color, #e5e7eb)',
      }}>
        <input
          style={{
            flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: 13,
            border: '1px solid var(--border-color, #e5e7eb)',
            background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none',
          }}
          placeholder={`Nuevo ítem para ${tipoLabel}...`}
          value={newNombre}
          onChange={e => setNewNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newNombre.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: 'var(--primary-color, #6366f1)', color: '#fff', border: 'none',
            cursor: saving || !newNombre.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !newNombre.trim() ? 0.5 : 1,
          }}
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      {/* Lista */}
      {isLoading ? <LoadingSpinner /> : (
        <div style={{
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          {itemsDelTipo.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              No hay ítems para {tipoLabel}. Agregá el primero.
            </div>
          ) : (
            itemsDelTipo.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: idx < itemsDelTipo.length - 1 ? '1px solid var(--border-color, #e5e7eb)' : 'none',
                  background: item.activo ? 'var(--bg-main)' : 'var(--bg-card)',
                  opacity: item.activo ? 1 : 0.5,
                }}
              >
                <GripVertical size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-main)' }}>{item.nombre}</span>
                <button
                  title={item.activo ? 'Desactivar' : 'Activar'}
                  onClick={() => handleToggle(item)}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                    border: '1px solid', cursor: 'pointer',
                    borderColor: item.activo ? '#bbf7d0' : '#e5e7eb',
                    background: item.activo ? '#f0fdf4' : 'var(--bg-card)',
                    color: item.activo ? '#16a34a' : 'var(--text-secondary)',
                  }}
                >
                  {item.activo ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  title="Eliminar"
                  onClick={() => handleDelete(item.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ef4444', display: 'flex', alignItems: 'center', padding: 4,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ChecklistItemsTab;
