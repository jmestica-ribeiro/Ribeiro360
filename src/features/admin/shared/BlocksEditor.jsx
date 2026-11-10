import React, { useState, useRef } from 'react';
import {
  X, Copy, Plus, ChevronDown, Type, Image as ImageIcon, Video, Square, CreditCard,
  GripVertical, Paperclip, FileText, FileSpreadsheet, Upload,
  Minus, AlertTriangle, List, Trash2, Loader2,
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';

const FILE_ICON = { size: 24, strokeWidth: 1.5 };
const FILE_CONFIG = {
  pdf:  { label: 'PDF',        color: '#e53e3e', icon: <FileText {...FILE_ICON} /> },
  ppt:  { label: 'PowerPoint', color: '#d44b1e', icon: <FileText {...FILE_ICON} /> },
  pptx: { label: 'PowerPoint', color: '#d44b1e', icon: <FileText {...FILE_ICON} /> },
  doc:  { label: 'Word',       color: '#2b5be0', icon: <FileText {...FILE_ICON} /> },
  docx: { label: 'Word',       color: '#2b5be0', icon: <FileText {...FILE_ICON} /> },
  xls:  { label: 'Excel',      color: '#1a7f4b', icon: <FileSpreadsheet {...FILE_ICON} /> },
  xlsx: { label: 'Excel',      color: '#1a7f4b', icon: <FileSpreadsheet {...FILE_ICON} /> },
};
const DEFAULT_FILE_CONFIG = { label: 'Archivo', color: '#6b7280', icon: <Paperclip {...FILE_ICON} /> };

const CALLOUT_CONFIG = {
  info:    { label: 'ℹ️ Info' },
  warning: { label: '⚠️ Atención' },
  danger:  { label: '🚨 Importante' },
  success: { label: '✅ Consejo' },
};

const BLOCK_LABELS = {
  texto: 'Texto', imagen: 'Imagen', banner: 'Banner', video: 'Video',
  cards: 'Cards', archivo: 'Archivo', separador: 'Separador',
  callout: 'Alerta', acordeon: 'Acordeón',
};

const ADD_ICON = { size: 16, strokeWidth: 1.5 };
const ADD_BUTTONS = [
  ['texto', Type], ['imagen', ImageIcon], ['banner', Square], ['video', Video], ['cards', CreditCard],
  ['archivo', Paperclip], ['callout', AlertTriangle], ['acordeon', List], ['separador', Minus],
];

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
    <div className="blk-editor">
      <span className="blk-section-label">Agregar bloque</span>
      <div className="blk-add-bar">
        {ADD_BUTTONS.map(([tipo, Icon]) => (
          <button key={tipo} type="button" className="blk-add-btn" onClick={() => onAdd(tipo)}>
            <Icon {...ADD_ICON} /> {BLOCK_LABELS[tipo]}
          </button>
        ))}
      </div>

      <div className="blk-list">
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className={`blk-card${dragging === idx ? ' is-dragging' : ''}${dragOver === idx && dragging !== idx ? ' is-drop-target' : ''}`}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
          >
            <div className="blk-card-header">
              <span className="blk-grip" title="Arrastrar para reordenar" aria-hidden="true">
                <GripVertical size={16} strokeWidth={1.5} />
              </span>
              <span className="blk-index">{idx + 1}</span>
              <span className="adm-badge">{BLOCK_LABELS[block.tipo] || block.tipo}</span>
              <div className="blk-card-actions">
                <button
                  type="button"
                  className="adm-action"
                  title="Duplicar bloque"
                  aria-label="Duplicar bloque"
                  onClick={() => onDuplicate(block.id)}
                ><Copy size={16} strokeWidth={1.5} /></button>
                <button
                  type="button"
                  className="adm-action danger"
                  title="Eliminar bloque"
                  aria-label="Eliminar bloque"
                  onClick={() => onRemove(block.id)}
                ><Trash2 size={16} strokeWidth={1.5} /></button>
              </div>
            </div>

            <div className="blk-card-body">
              {block.tipo === 'texto' && (
                <RichTextEditor
                  value={block.contenido}
                  onChange={html => onUpdate(block.id, 'contenido', html)}
                />
              )}

              {(block.tipo === 'imagen' || block.tipo === 'video') && (
                <input
                  className="blk-input"
                  inputMode="url"
                  aria-label={block.tipo === 'imagen' ? 'URL de la imagen' : 'URL del video'}
                  placeholder={block.tipo === 'imagen' ? 'URL de la imagen…' : 'URL del video…'}
                  value={block.contenido}
                  onChange={e => onUpdate(block.id, 'contenido', e.target.value)}
                />
              )}

              {block.tipo === 'banner' && (() => {
                const bg = block.metadata?.bg_color || '#000000';
                const tc = block.metadata?.text_color || '#F2DC00';
                return (
                  <div className="blk-stack">
                    <div className="blk-banner-preview" style={{ background: bg, color: tc }}>
                      <span
                        className="blk-banner-title"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => onUpdate(block.id, 'contenido', e.currentTarget.textContent)}
                      >{block.contenido || 'Título del banner'}</span>
                      <span className="blk-banner-hint">Hacé clic para editar</span>
                    </div>
                    <div className="blk-color-row">
                      <label className="blk-color">
                        <input type="color" value={bg} onChange={e => onUpdateMeta(block.id, 'bg_color', e.target.value)} />
                        Fondo
                      </label>
                      <label className="blk-color">
                        <input type="color" value={tc} onChange={e => onUpdateMeta(block.id, 'text_color', e.target.value)} />
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
                  <div className="blk-cards-grid">
                    {items.map((item, iIdx) => (
                      <div key={iIdx} className="blk-mini-card">
                        <button
                          type="button"
                          className="adm-action danger blk-mini-remove"
                          aria-label="Quitar card"
                          onClick={() => updateItems(items.filter((_, i) => i !== iIdx))}
                        ><X size={14} strokeWidth={1.5} /></button>
                        <input
                          className="blk-ghost-title"
                          placeholder="Título…"
                          aria-label="Título de la card"
                          value={item.label}
                          onChange={e => {
                            const next = [...items];
                            next[iIdx] = { ...next[iIdx], label: e.target.value };
                            updateItems(next);
                          }}
                        />
                        <textarea
                          className="blk-ghost-text"
                          placeholder="Descripción…"
                          aria-label="Descripción de la card"
                          value={item.text}
                          rows={2}
                          onChange={e => {
                            const next = [...items];
                            next[iIdx] = { ...next[iIdx], text: e.target.value };
                            updateItems(next);
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="blk-dashed-btn"
                      onClick={() => updateItems([...items, { label: '', text: '' }])}
                    ><Plus size={16} strokeWidth={1.5} /> Agregar card</button>
                  </div>
                );
              })()}

              {block.tipo === 'separador' && (
                <input
                  className="blk-input"
                  placeholder="Título de sección (opcional)"
                  aria-label="Título de sección"
                  value={block.contenido}
                  onChange={e => onUpdate(block.id, 'contenido', e.target.value)}
                />
              )}

              {block.tipo === 'callout' && (() => {
                const nivel = CALLOUT_CONFIG[block.metadata?.nivel] ? block.metadata.nivel : 'info';
                return (
                  <div className="blk-stack">
                    <div className="blk-segmented" role="radiogroup" aria-label="Tipo de alerta">
                      {Object.entries(CALLOUT_CONFIG).map(([key, c]) => (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={nivel === key}
                          className={`blk-level blk-level--${key}${nivel === key ? ' active' : ''}`}
                          onClick={() => onUpdateMeta(block.id, 'nivel', key)}
                        >{c.label}</button>
                      ))}
                    </div>
                    <div className={`blk-callout blk-callout--${nivel}`}>
                      <span
                        className="blk-callout-text"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => onUpdate(block.id, 'contenido', e.currentTarget.textContent)}
                      >{block.contenido || 'Escribí el mensaje aquí…'}</span>
                    </div>
                  </div>
                );
              })()}

              {block.tipo === 'acordeon' && (() => {
                const items = JSON.parse(block.contenido || '[]');
                const updateItems = (next) => onUpdate(block.id, 'contenido', JSON.stringify(next));
                return (
                  <div className="blk-stack">
                    <div className="blk-accordion">
                      {items.map((item, iIdx) => (
                        <div key={iIdx} className="blk-accordion-item">
                          <div className="blk-accordion-head">
                            <ChevronDown size={16} strokeWidth={1.5} className="blk-accordion-chevron" aria-hidden="true" />
                            <input
                              className="blk-ghost-title"
                              placeholder="Pregunta o título…"
                              aria-label="Título del ítem"
                              value={item.pregunta}
                              onChange={e => {
                                const next = [...items];
                                next[iIdx] = { ...next[iIdx], pregunta: e.target.value };
                                updateItems(next);
                              }}
                            />
                            <button
                              type="button"
                              className="adm-action danger"
                              aria-label="Quitar ítem"
                              onClick={() => updateItems(items.filter((_, i) => i !== iIdx))}
                            ><X size={14} strokeWidth={1.5} /></button>
                          </div>
                          <textarea
                            className="blk-accordion-body"
                            placeholder="Respuesta o contenido…"
                            aria-label="Contenido del ítem"
                            value={item.respuesta}
                            rows={2}
                            onChange={e => {
                              const next = [...items];
                              next[iIdx] = { ...next[iIdx], respuesta: e.target.value };
                              updateItems(next);
                            }}
                          />
                        </div>
                      ))}
                      {items.length === 0 && <div className="blk-empty">Sin ítems aún</div>}
                    </div>
                    <button
                      type="button"
                      className="blk-dashed-btn"
                      onClick={() => updateItems([...items, { pregunta: '', respuesta: '' }])}
                    ><Plus size={16} strokeWidth={1.5} /> Agregar ítem</button>
                  </div>
                );
              })()}

              {block.tipo === 'archivo' && (() => {
                const ext = block.metadata?.ext?.toLowerCase() || '';
                const cfg = FILE_CONFIG[ext] || DEFAULT_FILE_CONFIG;
                const nombre = block.metadata?.nombre || '';
                const isUploading = uploadingBlocks[block.id];
                return (
                  <>
                    <input
                      type="file"
                      hidden
                      ref={el => { fileInputRefs.current[block.id] = el; }}
                      onChange={e => handleArchivoSelect(block.id, e.target.files?.[0])}
                    />
                    {block.contenido ? (
                      <div className="blk-file" style={{ '--tone': cfg.color }}>
                        <span className="blk-file-icon">{cfg.icon}</span>
                        <div className="blk-file-info">
                          <span className="blk-file-name">{nombre}</span>
                          <span className="blk-file-type">{cfg.label}</span>
                        </div>
                        <button type="button" className="blk-pill-btn" onClick={() => fileInputRefs.current[block.id]?.click()}>Cambiar</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="blk-dropzone"
                        onClick={() => fileInputRefs.current[block.id]?.click()}
                        disabled={isUploading}
                      >
                        {isUploading
                          ? <><Loader2 size={22} strokeWidth={1.5} className="blk-spin" /><span className="blk-dropzone-title">Subiendo…</span></>
                          : <><Upload size={22} strokeWidth={1.5} /><span className="blk-dropzone-title">Subir archivo</span><span className="blk-dropzone-hint">PDF, PPT, Word, Excel…</span></>
                        }
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlocksEditor;
