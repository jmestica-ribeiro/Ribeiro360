import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import NormaPuntoSelector from './NormaPuntoSelector';
import { NORMAS_ESTRUCTURA } from './normasData';

const NORMAS = Object.keys(NORMAS_ESTRUCTURA);

// value: [{norma, punto}]
const NormaMultiSelector = ({ value = [], onChange }) => {
  const [adding, setAdding] = useState(false);
  const [draftNorma, setDraftNorma] = useState('');
  const [draftPunto, setDraftPunto] = useState('');

  const handleAdd = () => {
    if (!draftNorma) return;
    onChange([...value, { norma: draftNorma, punto: draftPunto }]);
    setDraftNorma('');
    setDraftPunto('');
    setAdding(false);
  };

  const handleRemove = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleCancel = () => {
    setDraftNorma('');
    setDraftPunto('');
    setAdding(false);
  };

  return (
    <div className="nms-container">
      {/* Tags de puntos ya agregados */}
      {value.length > 0 && (
        <div className="nms-tags">
          {value.map((item, idx) => (
            <div key={idx} className="nms-tag">
              <span className="nms-tag-norma">{item.norma}</span>
              {item.punto && <span className="nms-tag-punto">{item.punto}</span>}
              <button type="button" className="nms-tag-remove" onClick={() => handleRemove(idx)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Panel de agregar */}
      {adding ? (
        <div className="nms-add-panel">
          <div className="ncd-form-group">
            <label>Norma</label>
            <div className="ncd-norma-chips">
              {NORMAS.map(n => (
                <button
                  key={n}
                  type="button"
                  className={`ncd-norma-chip${draftNorma === n ? ' active' : ''}`}
                  onClick={() => { setDraftNorma(n); setDraftPunto(''); }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {draftNorma && (
            <div className="ncd-form-group">
              <label>Punto</label>
              <NormaPuntoSelector
                norma={draftNorma}
                value={draftPunto}
                onChange={setDraftPunto}
              />
            </div>
          )}

          <div className="nms-add-actions">
            <button
              type="button"
              className="nms-btn-confirm"
              onClick={handleAdd}
              disabled={!draftNorma}
            >
              Agregar
            </button>
            <button type="button" className="nms-btn-cancel" onClick={handleCancel}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="nms-btn-add" onClick={() => setAdding(true)}>
          <Plus size={14} />
          Agregar norma / punto
        </button>
      )}
    </div>
  );
};

export default NormaMultiSelector;
