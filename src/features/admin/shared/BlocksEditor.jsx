import React, { useState, useRef } from 'react';
import {
  X, Copy, Plus, ChevronDown, Type, Image as ImageIcon, Video, Square, CreditCard,
  GripVertical, Paperclip, FileText, FileSpreadsheet, Upload,
  Minus, AlertTriangle, List
} from 'lucide-react';
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

const CALLOUT_CONFIG = {
  info:    { color: '#2b5be0', bg: '#eff4ff', border: '#c7d7fd', label: 'ℹ️ Info' },
  warning: { color: '#92400e', bg: '#fffbeb', border: '#fde68a', label: '⚠️ Atención' },
  danger:  { color: '#991b1b', bg: '#fff5f5', border: '#fecaca', label: '🚨 Importante' },
  success: { color: '#14532d', bg: '#f0fff4', border: '#bbf7d0', label: '✅ Consejo' },
};

const BLOCK_LABELS = {
  texto: 'Texto', imagen: 'Imagen', banner: 'Banner', video: 'Video',
  cards: 'Cards', archivo: 'Archivo', separador: 'Separador',
  callout: 'Alerta', acordeon: 'Acordeón',
};

const BlocksEditor = ({ blocks, onUpdate, onUpdateMeta, onRemove, onAdd, onReorder, onDuplicate, onUploadArchivo }) => {
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
        <button onClick={() => onAdd('callout')}><AlertTriangle size={14} /> Alerta</button>
        <button onClick={() => onAdd('acordeon')}><List size={14} /> Acordeón</button>
        <button onClick={() => onAdd('separador')}><Minus size={14} /> Separador</button>
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
              <span className="block-type-label">{BLOCK_LABELS[block.tipo] || block.tipo}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                <button
                  className="btn-remove-block"
                  title="Duplicar bloque"
                  onClick={() => onDuplicate(block.id)}
                  style={{ color: '#94a3b8' }}
                ><Copy size={12} /></button>
                <button className="btn-remove-block" onClick={() => onRemove(block.id)}><X size={12} /></button>
              </div>
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

            {block.tipo === 'banner' && (() => {
              const bg = block.metadata?.bg_color || '#000000';
              const tc = block.metadata?.text_color || '#F2DC00';
              return (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Preview live */}
                  <div style={{ background: bg, borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => onUpdate(block.id, 'contenido', e.currentTarget.textContent)}
                      style={{ color: tc, fontSize: 20, fontWeight: 800, outline: 'none', display: 'block', minWidth: 40, cursor: 'text' }}
                    >{block.contenido || 'Título del banner'}</span>
                    <span style={{ color: tc, fontSize: 11, opacity: 0.5, marginTop: 6, display: 'block' }}>Hacé clic para editar</span>
                  </div>
                  {/* Color controls */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <input type="color" value={bg} onChange={e => onUpdateMeta(block.id, 'bg_color', e.target.value)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2 }} />
                      Fondo
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <input type="color" value={tc} onChange={e => onUpdateMeta(block.id, 'text_color', e.target.value)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2 }} />
                      Texto
                    </label>
                  </div>
                </div>
              );
            })()}

            {block.tipo === 'cards' && (() => {
              const items = JSON.parse(block.contenido || '[]');
              const updateItems = (next) => onUpdate(block.id, 'contenido', JSON.stringify(next));
              return (
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                    {items.map((item, iIdx) => (
                      <div key={iIdx} style={{ background: '#f9fafb', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          onClick={() => updateItems(items.filter((_, i) => i !== iIdx))}
                          style={{ position: 'absolute', top: 8, right: 8, background: '#fee2e2', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', padding: 0 }}
                        ><X size={10} /></button>
                        <input
                          placeholder="Título…"
                          value={item.label}
                          style={{ fontWeight: 800, fontSize: 13, border: 'none', borderBottom: '1.5px solid #e5e7eb', background: 'transparent', outline: 'none', padding: '2px 0', color: 'var(--text-main)', width: '100%' }}
                          onChange={e => {
                            const next = [...items];
                            next[iIdx] = { ...next[iIdx], label: e.target.value };
                            updateItems(next);
                          }}
                        />
                        <textarea
                          placeholder="Descripción…"
                          value={item.text}
                          rows={2}
                          style={{ fontSize: 12, border: 'none', background: 'transparent', outline: 'none', resize: 'none', color: '#6b7280', lineHeight: 1.5, padding: 0, width: '100%' }}
                          onChange={e => {
                            const next = [...items];
                            next[iIdx] = { ...next[iIdx], text: e.target.value };
                            updateItems(next);
                          }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => updateItems([...items, { label: '', text: '' }])}
                      style={{ background: 'none', border: '2px dashed var(--border-color)', borderRadius: 12, padding: '16px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    ><Plus size={15} /> Agregar card</button>
                  </div>
                </div>
              );
            })()}

            {block.tipo === 'separador' && (
              <div style={{ padding: '10px 16px' }}>
                <input
                  className="form-control"
                  placeholder="Título de sección (opcional)"
                  value={block.contenido}
                  onChange={e => onUpdate(block.id, 'contenido', e.target.value)}
                />
              </div>
            )}

            {block.tipo === 'callout' && (() => {
              const nivel = block.metadata?.nivel || 'info';
              const cfg = CALLOUT_CONFIG[nivel];
              return (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Selector de nivel */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(CALLOUT_CONFIG).map(([key, c]) => (
                      <button
                        key={key}
                        onClick={() => onUpdateMeta(block.id, 'nivel', key)}
                        style={{
                          fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                          border: `1.5px solid ${nivel === key ? c.color : '#e5e7eb'}`,
                          background: nivel === key ? c.bg : 'transparent',
                          color: nivel === key ? c.color : '#9ca3af',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >{c.label}</button>
                    ))}
                  </div>
                  {/* Preview live */}
                  <div style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.color}`, borderRadius: '0 10px 10px 0', padding: '14px 18px' }}>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => onUpdate(block.id, 'contenido', e.currentTarget.textContent)}
                      style={{ color: cfg.color, fontSize: 14, fontWeight: 500, outline: 'none', display: 'block', minHeight: 20, cursor: 'text', lineHeight: 1.6 }}
                    >{block.contenido || 'Escribí el mensaje aquí…'}</span>
                  </div>
                </div>
              );
            })()}

            {block.tipo === 'acordeon' && (() => {
              const items = JSON.parse(block.contenido || '[]');
              const updateItems = (next) => onUpdate(block.id, 'contenido', JSON.stringify(next));
              return (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
                    {items.map((item, iIdx) => (
                      <div key={iIdx} style={{ borderBottom: iIdx < items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                        {/* Header editable */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--bg-card)' }}>
                          <ChevronDown size={15} style={{ color: '#ccc', flexShrink: 0 }} />
                          <input
                            placeholder="Pregunta o título…"
                            value={item.pregunta}
                            style={{ flex: 1, fontWeight: 700, fontSize: 13, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)' }}
                            onChange={e => {
                              const next = [...items];
                              next[iIdx] = { ...next[iIdx], pregunta: e.target.value };
                              updateItems(next);
                            }}
                          />
                          <button
                            onClick={() => updateItems(items.filter((_, i) => i !== iIdx))}
                            style={{ background: '#fee2e2', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', padding: 0, flexShrink: 0 }}
                          ><X size={10} /></button>
                        </div>
                        {/* Body editable */}
                        <textarea
                          placeholder="Respuesta o contenido…"
                          value={item.respuesta}
                          rows={2}
                          style={{ width: '100%', fontSize: 13, padding: '12px 16px 14px 42px', border: 'none', borderTop: '1px solid var(--border-color)', background: '#fafafa', outline: 'none', resize: 'vertical', color: '#6b7280', lineHeight: 1.6, boxSizing: 'border-box' }}
                          onChange={e => {
                            const next = [...items];
                            next[iIdx] = { ...next[iIdx], respuesta: e.target.value };
                            updateItems(next);
                          }}
                        />
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#bbb', fontSize: 13 }}>Sin ítems aún</div>
                    )}
                  </div>
                  <button
                    onClick={() => updateItems([...items, { pregunta: '', respuesta: '' }])}
                    style={{ background: 'none', border: '2px dashed var(--border-color)', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  ><Plus size={14} /> Agregar ítem</button>
                </div>
              );
            })()}

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
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, background: cfg.bg, border: `1.5px solid ${cfg.color}22`, borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ color: cfg.color, flexShrink: 0, lineHeight: 0 }}>{cfg.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.label}</div>
                      </div>
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0, width: 'auto' }} onClick={() => fileInputRefs.current[block.id]?.click()}>Cambiar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRefs.current[block.id]?.click()}
                      disabled={isUploading}
                      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', border: '2px dashed var(--border-color)', borderRadius: 10, background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
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
