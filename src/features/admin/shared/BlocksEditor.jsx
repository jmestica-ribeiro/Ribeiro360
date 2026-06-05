import React, { useState, useRef } from 'react';
import { X, Type, Image as ImageIcon, Video, Square, CreditCard, GripVertical, Paperclip, FileText, FileSpreadsheet, Upload } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

const FILE_CONFIG = {
  pdf:  { label: 'PDF',        color: '#e53e3e', bg: '#fff5f5', icon: <FileText size={28} /> },
  ppt:  { label: 'PowerPoint', color: '#d44b1e', bg: '#fff3ee', icon: <FileText size={28} /> },
  pptx: { label: 'PowerPoint', color: '#d44b1e', bg: '#fff3ee', icon: <FileText size={28} /> },
  doc:  { label: 'Word',       color: '#2b5be0', bg: '#eff4ff', icon: <FileText size={28} /> },
  docx: { label: 'Word',       color: '#2b5be0', bg: '#eff4ff', icon: <FileText size={28} /> },
  xls:  { label: 'Excel',      color: '#1a7f4b', bg: '#f0fff6', icon: <FileSpreadsheet size={28} /> },
  xlsx: { label: 'Excel',      color: '#1a7f4b', bg: '#f0fff6', icon: <FileSpreadsheet size={28} /> },
};
const DEFAULT_FILE_CONFIG = { label: 'Archivo', color: '#6b7280', bg: '#f9fafb', icon: <Paperclip size={28} /> };

const BlocksEditor = ({ blocks, onUpdate, onUpdateMeta, onRemove, onAdd, onReorder, onUploadArchivo }) => {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [uploadingBlocks, setUploadingBlocks] = useState({});
  const fileInputRefs = useRef({});

  const handleDragStart = (idx) => { setDragging(idx); };
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOver(idx); };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragging === null || dragging === idx) { setDragOver(null); return; }
    const reordered = [...blocks];
    const [moved] = reordered.splice(dragging, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragging(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const handleArchivoSelect = async (blockId, file) => {
    if (!file || !onUploadArchivo) return;
    setUploadingBlocks(prev => ({ ...prev, [blockId]: true }));
    const { url, error } = await onUploadArchivo(file);
    setUploadingBlocks(prev => ({ ...prev, [blockId]: false }));
    if (error || !url) return;
    const ext = file.name.split('.').pop().toLowerCase();
    onUpdate(blockId, 'contenido', url);
    onUpdateMeta(blockId, 'nombre', file.name);
    onUpdateMeta(blockId, 'ext', ext);
  };

  return (
    <div className="blocks-editor-container">
      <div className="add-block-tools compact">
        <button onClick={() => onAdd('texto')}><Type size={14} /> Texto</button>
        <button onClick={() => onAdd('imagen')}><ImageIcon size={14} /> Imagen</button>
        <button onClick={() => onAdd('banner')}><Square size={14} /> Banner</button>
        <button onClick={() => onAdd('video')}><Video size={14} /> Video</button>
        <button onClick={() => onAdd('cards')}><CreditCard size={14} /> Cards</button>
        <button onClick={() => onAdd('archivo')}><Paperclip size={14} /> Archivo</button>
      </div>

      <div className="blocks-list-mini">
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className="block-item-mini"
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            style={{
              opacity: dragging === idx ? 0.4 : 1,
              border: dragOver === idx ? '2px dashed var(--primary-color)' : undefined,
              transition: 'opacity 0.15s',
            }}
          >
            <div className="block-item-header">
              <GripVertical size={14} style={{ cursor: 'grab', color: '#ccc', flexShrink: 0 }} />
              <span className="block-type-label">{block.tipo}</span>
              <button className="btn-remove-block" onClick={() => onRemove(block.id)}><X size={12} /></button>
            </div>

            {block.tipo === 'texto' && (
              <RichTextEditor
                value={block.contenido}
                onChange={html => onUpdate(block.id, 'contenido', html)}
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
                      const items = JSON.parse(block.contenido).filter((_, i) => i !== iIdx);
                      onUpdate(block.id, 'contenido', JSON.stringify(items));
                    }}><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}

            {block.tipo === 'archivo' && (() => {
              const ext = block.metadata?.ext?.toLowerCase() || '';
              const cfg = FILE_CONFIG[ext] || DEFAULT_FILE_CONFIG;
              const nombre = block.metadata?.nombre || '';
              const isUploading = uploadingBlocks[block.id];
              return (
                <div style={{ padding: '12px 16px' }}>
                  <input
                    type="file"
                    ref={el => { fileInputRefs.current[block.id] = el; }}
                    style={{ display: 'none' }}
                    onChange={e => handleArchivoSelect(block.id, e.target.files?.[0])}
                  />
                  {block.contenido ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: cfg.bg, border: `1.5px solid ${cfg.color}22`, borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.label}</div>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                        onClick={() => fileInputRefs.current[block.id]?.click()}
                      >Cambiar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRefs.current[block.id]?.click()}
                      disabled={isUploading}
                      style={{
                        width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        padding: '24px 16px', border: '2px dashed var(--border-color)', borderRadius: 10,
                        background: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'border-color 0.15s',
                      }}
                    >
                      {isUploading
                        ? <><svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" /></svg><span style={{ fontSize: 13, fontWeight: 600 }}>Subiendo...</span></>
                        : <><Upload size={22} /><span style={{ fontSize: 13, fontWeight: 600 }}>Subir archivo</span><span style={{ fontSize: 11 }}>PDF, PPT, Word, Excel…</span></>
                      }
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlocksEditor;
