import React from 'react';
import { X, Type, Image as ImageIcon, Video, Square, CreditCard } from 'lucide-react';

/**
 * Editor de bloques de contenido compartido entre OnboardingTab y CapacitacionesTab.
 *
 * @param {Array} blocks - lista de bloques actuales
 * @param {function} onUpdate - (id, field, value) => void
 * @param {function} onUpdateMeta - (id, key, value) => void
 * @param {function} onRemove - (id) => void
 * @param {function} onAdd - (tipo) => void
 */
const BlocksEditor = ({ blocks, onUpdate, onUpdateMeta, onRemove, onAdd }) => (
  <div className="blocks-editor-container">
    <div className="add-block-tools compact">
      <button onClick={() => onAdd('texto')}><Type size={14} /> Texto</button>
      <button onClick={() => onAdd('imagen')}><ImageIcon size={14} /> Imagen</button>
      <button onClick={() => onAdd('banner')}><Square size={14} /> Banner</button>
      <button onClick={() => onAdd('video')}><Video size={14} /> Video</button>
      <button onClick={() => onAdd('cards')}><CreditCard size={14} /> Cards</button>
    </div>

    <div className="blocks-list-mini">
      {blocks.map(block => (
        <div key={block.id} className="block-item-mini">
          <div className="block-item-header">
            <span className="block-type-label">{block.tipo}</span>
            <button className="btn-remove-block" onClick={() => onRemove(block.id)}><X size={12} /></button>
          </div>

          {block.tipo === 'texto' && (
            <textarea
              className="form-control"
              rows="3"
              placeholder="Texto..."
              value={block.contenido}
              onChange={e => onUpdate(block.id, 'contenido', e.target.value)}
            />
          )}

          {(block.tipo === 'imagen' || block.tipo === 'video') && (
            <input
              className="form-control"
              placeholder="URL..."
              value={block.contenido}
              onChange={e => onUpdate(block.id, 'contenido', e.target.value)}
            />
          )}

          {block.tipo === 'banner' && (
            <div className="banner-edit-mini">
              <input className="form-control" value={block.contenido} onChange={e => onUpdate(block.id, 'contenido', e.target.value)} placeholder="Título Banner" />
              <div className="color-pickers">
                <input type="color" value={block.metadata?.bg_color} onChange={e => onUpdateMeta(block.id, 'bg_color', e.target.value)} />
                <input type="color" value={block.metadata?.text_color} onChange={e => onUpdateMeta(block.id, 'text_color', e.target.value)} />
              </div>
            </div>
          )}

          {block.tipo === 'cards' && (
            <div className="cards-edit-mini">
              <button className="btn-add-sub" onClick={() => {
                const items = JSON.parse(block.contenido || '[]');
                onUpdate(block.id, 'contenido', JSON.stringify([...items, { label: '', text: '' }]));
              }}>+ Item</button>
              {JSON.parse(block.contenido || '[]').map((item, iIdx) => (
                <div key={iIdx} className="card-sub-item">
                  <input placeholder="Título" value={item.label} onChange={e => {
                    const items = JSON.parse(block.contenido);
                    items[iIdx].label = e.target.value;
                    onUpdate(block.id, 'contenido', JSON.stringify(items));
                  }} />
                  <button onClick={() => {
                    const items = JSON.parse(block.contenido).filter((_, idx) => idx !== iIdx);
                    onUpdate(block.id, 'contenido', JSON.stringify(items));
                  }}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default BlocksEditor;
