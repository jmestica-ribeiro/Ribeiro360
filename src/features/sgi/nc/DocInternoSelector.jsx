import React, { useState, useMemo } from 'react';
import { Search, X, FileText } from 'lucide-react';

const TIPOS = ['Procedimiento', 'Manual', 'Instructivo', 'Registro', 'Formato', 'Otro'];

// value: [{id, titulo, codigo, tipo_documento}]
const DocInternoSelector = ({ documentos = [], value = [], onChange }) => {
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [open, setOpen] = useState(false);

  const selectedIds = new Set(value.map(d => d.id));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documentos.filter(d => {
      const matchTipo = !tipoFiltro || d.tipo_documento === tipoFiltro;
      const matchSearch = !q || d.titulo.toLowerCase().includes(q) || (d.codigo || '').toLowerCase().includes(q);
      return matchTipo && matchSearch && !selectedIds.has(d.id);
    });
  }, [documentos, search, tipoFiltro, selectedIds]);

  const handleSelect = (doc) => {
    onChange([...value, { id: doc.id, titulo: doc.titulo, codigo: doc.codigo, tipo_documento: doc.tipo_documento }]);
  };

  const handleRemove = (id) => {
    onChange(value.filter(d => d.id !== id));
  };

  return (
    <div className="dis-container">
      {/* Tags seleccionados */}
      {value.length > 0 && (
        <div className="nms-tags">
          {value.map(doc => (
            <div key={doc.id} className="nms-tag">
              <FileText size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              {doc.codigo && <span className="nms-tag-norma">{doc.codigo}</span>}
              <span className="nms-tag-punto" style={{ '--before': 'none' }}>{doc.titulo}</span>
              <button type="button" className="nms-tag-remove" onClick={() => handleRemove(doc.id)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toggle buscador */}
      {!open ? (
        <button type="button" className="nms-btn-add" onClick={() => setOpen(true)}>
          <FileText size={14} />
          Referenciar documento interno
        </button>
      ) : (
        <div className="nms-add-panel">
          {/* Filtro por tipo */}
          <div className="dis-tipo-row">
            <button
              type="button"
              className={`ncd-norma-chip${!tipoFiltro ? ' active' : ''}`}
              onClick={() => setTipoFiltro('')}
            >
              Todos
            </button>
            {TIPOS.map(t => (
              <button
                key={t}
                type="button"
                className={`ncd-norma-chip${tipoFiltro === t ? ' active' : ''}`}
                onClick={() => setTipoFiltro(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="dis-search-wrap">
            <Search size={14} className="dis-search-icon" />
            <input
              type="text"
              placeholder="Buscar por título o código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="dis-search-input"
              autoFocus
            />
            {search && (
              <button type="button" className="nms-tag-remove" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="dis-list">
            {filtered.length === 0 ? (
              <p className="dis-empty">No hay documentos que coincidan.</p>
            ) : (
              filtered.map(doc => (
                <button
                  key={doc.id}
                  type="button"
                  className="dis-item"
                  onClick={() => handleSelect(doc)}
                >
                  <div className="dis-item-info">
                    <span className="dis-item-titulo">{doc.titulo}</span>
                    <div className="dis-item-meta">
                      {doc.codigo && <span className="dis-item-codigo">{doc.codigo}</span>}
                      {doc.tipo_documento && <span className="dis-item-tipo">{doc.tipo_documento}</span>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="nms-add-actions">
            <button type="button" className="nms-btn-cancel" onClick={() => { setOpen(false); setSearch(''); setTipoFiltro(''); }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocInternoSelector;
