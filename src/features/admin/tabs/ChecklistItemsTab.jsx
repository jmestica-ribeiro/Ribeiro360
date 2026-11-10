import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Type } from 'lucide-react';
import { fetchAllCheqItems, saveCheqItem, deleteCheqItem } from '../../../services/sgiService';
import { TIPOS_EQUIPO } from '../../sgi/checklists-equipo/tiposEquipo';
import { LoadingSpinner } from '../../../components/common';
import { useConfirm } from '../../../contexts/ConfirmContext';

const ChecklistItemsTab = () => {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tipoActivo, setTipoActivo] = useState(TIPOS_EQUIPO[0].key);
  const [newNombre, setNewNombre] = useState('');
  const [newRequiereTexto, setNewRequiereTexto] = useState(false);
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
    await saveCheqItem({ tipo_equipo: tipoActivo, nombre, orden, activo: true, requiere_texto: newRequiereTexto });
    setNewNombre('');
    setNewRequiereTexto(false);
    await load();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ message: '¿Eliminar este ítem?', destructive: true }))) return;
    await deleteCheqItem(id);
    await load();
  };

  const handleToggle = async (item) => {
    await saveCheqItem({ id: item.id, activo: !item.activo });
    await load();
  };

  const handleToggleTexto = async (item) => {
    await saveCheqItem({ id: item.id, requiere_texto: !item.requiere_texto });
    await load();
  };

  const tipoLabel = TIPOS_EQUIPO.find(t => t.key === tipoActivo)?.label ?? tipoActivo;

  return (
    <div className="adm-panel adm-checklist-items">
      <div className="admin-list-header">
        <div>
          <h3>Ítems de checklists de equipo <span className="admin-count">{items.length}</span></h3>
          <p className="adm-panel-desc">Administrá los puntos de verificación para cada tipo de equipo.</p>
        </div>
      </div>

      <div className="adm-chips" role="tablist" aria-label="Tipo de equipo">
        {TIPOS_EQUIPO.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tipoActivo === t.key}
            className={`adm-chip${tipoActivo === t.key ? ' active' : ''}`}
            onClick={() => setTipoActivo(t.key)}
          >
            {t.label}
            <span className="adm-chip-count">{items.filter(i => i.tipo_equipo === t.key).length}</span>
          </button>
        ))}
      </div>

      <div className="adm-card adm-inline-form">
        <label className="adm-inline-field org-search adm-inline-input">
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          <input
            placeholder={`Nuevo ítem para ${tipoLabel}...`}
            aria-label={`Nuevo ítem para ${tipoLabel}`}
            value={newNombre}
            onChange={e => setNewNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </label>
        <label className="adm-check">
          <input
            type="checkbox"
            checked={newRequiereTexto}
            onChange={e => setNewRequiereTexto(e.target.checked)}
          />
          Con texto para completar
        </label>
        <button type="button" className="btn-add-admin" onClick={handleAdd} disabled={saving || !newNombre.trim()}>
          <Plus size={16} strokeWidth={1.5} /> Agregar
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : itemsDelTipo.length === 0 ? (
        <div className="adm-empty">No hay ítems para {tipoLabel}. Agregá el primero.</div>
      ) : (
        <ul className="adm-list">
          {itemsDelTipo.map(item => (
            <li key={item.id} className={`adm-row adm-row-compact${item.activo ? '' : ' muted'}`}>
              <GripVertical size={16} strokeWidth={1.5} className="adm-grip" aria-hidden="true" />
              <div className="adm-row-info">
                <div className="adm-row-title"><span>{item.nombre}</span></div>
              </div>
              <div className="adm-row-side">
                <button
                  type="button"
                  className={`adm-badge adm-toggle-badge ${item.requiere_texto ? 'info' : 'neutral'}`}
                  aria-pressed={item.requiere_texto}
                  title={item.requiere_texto ? 'Quitar texto libre' : 'Requerir texto libre al completar'}
                  onClick={() => handleToggleTexto(item)}
                >
                  <Type size={11} strokeWidth={1.5} /> Texto
                </button>
                <button
                  type="button"
                  className={`adm-badge adm-toggle-badge ${item.activo ? 'success' : 'neutral'}`}
                  aria-pressed={item.activo}
                  title={item.activo ? 'Desactivar' : 'Activar'}
                  onClick={() => handleToggle(item)}
                >
                  {item.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>
              <div className="adm-actions hover-reveal">
                <button type="button" className="adm-action danger" aria-label={`Eliminar ${item.nombre}`} onClick={() => handleDelete(item.id)}>
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChecklistItemsTab;
