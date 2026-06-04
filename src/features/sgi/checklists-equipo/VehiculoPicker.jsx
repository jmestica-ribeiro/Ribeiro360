import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Truck, Search, X, ChevronRight, Loader } from 'lucide-react';
import { fetchVehiculos } from '../../../services/vehiculosService';
import './VehiculoPicker.css';

const VehiculoPicker = ({ value = null, onChange, tipoEquipo, disabled = false }) => {
  const [opciones, setOpciones]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const inputRef                  = useRef(null);

  useEffect(() => {
    setIsLoading(true);
    fetchVehiculos().then(({ data }) => {
      setOpciones(data ?? []);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const filtered = opciones.filter(v => {
    const q = search.toLowerCase();
    return (
      (v['Codigo'] ?? '').toLowerCase().includes(q) ||
      (v['Nombre'] ?? '').toLowerCase().includes(q) ||
      (v['Patente'] ?? '').toLowerCase().includes(q) ||
      (v['Marca'] ?? '').toLowerCase().includes(q)
    );
  });

  const selected = value ? opciones.find(v => v['Codigo'] === value) : null;

  const handleSelect = (v) => {
    onChange({
      interno_nro: v['Codigo'],
      nombre:      v['Nombre'],
      marca:       v['Marca'],
      patente:     v['Patente'],
      tipo_equipo: v['tipo_equipo'] ?? null,
    });
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ interno_nro: '', nombre: '', marca: '', patente: '' });
  };

  // ── Estado: seleccionado ────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className={`vpicker-hero selected${disabled ? ' disabled' : ''}`}>
        <div className="vpicker-hero-icon-wrap">
          <Truck size={32} />
        </div>
        <div className="vpicker-hero-info">
          <div className="vpicker-nombre-chips-row">
            <div className="vpicker-hero-codigo">{selected['Codigo']}</div>
            <div className="vpicker-hero-nombre">{selected['Nombre']}</div>
            <div className="vpicker-hero-chips">
              {selected['Modelo_Codigo'] && <span className="vpicker-chip familia">{selected['Modelo_Codigo']}</span>}
              {selected['Marca']   && <span className="vpicker-chip">{selected['Marca']}</span>}
              {selected['Patente'] && <span className="vpicker-chip patente">{selected['Patente']}</span>}
            </div>
          </div>
        </div>
        {!disabled && (
          <button className="vpicker-hero-clear" onClick={handleClear} title="Cambiar equipo">
            <X size={16} />
            <span>Cambiar</span>
          </button>
        )}
      </div>
    );
  }

  // ── Modal de selección ─────────────────────────────────────────────────────
  const modal = open && createPortal(
    <div className="vpicker-overlay" onClick={() => { setOpen(false); setSearch(''); }}>
      <div className="vpicker-modal" onClick={e => e.stopPropagation()}>

        <div className="vpicker-modal-header">
          <div className="vpicker-modal-title">
            <Truck size={18} />
            Seleccioná el equipo
          </div>
          <button className="vpicker-modal-close" onClick={() => { setOpen(false); setSearch(''); }}>
            <X size={18} />
          </button>
        </div>

        <div className="vpicker-search-bar">
          <Search size={15} />
          <input
            ref={inputRef}
            placeholder="Buscar por código, nombre, marca o patente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="vpicker-search-clear" onClick={() => setSearch('')}><X size={12} /></button>
          )}
        </div>

        <div className="vpicker-modal-count">
          {filtered.length} equipo{filtered.length !== 1 ? 's' : ''}
          {search && ` para "${search}"`}
        </div>

        <div className="vpicker-results">
          {filtered.length === 0 ? (
            <div className="vpicker-empty">Sin resultados para <strong>"{search}"</strong></div>
          ) : (
            filtered.slice(0, 120).map(v => (
              <button
                key={v['Codigo']}
                type="button"
                className="vpicker-result-row"
                onClick={() => handleSelect(v)}
              >
                <div className="vpicker-result-icon"><Truck size={14} /></div>
                <div className="vpicker-result-body">
                  <span className="vpicker-result-codigo">{v['Codigo']}</span>
                  <span className="vpicker-result-nombre">{v['Nombre']}</span>
                </div>
                <div className="vpicker-result-right">
                  {v['Modelo_Codigo'] && <span className="vpicker-chip sm familia">{v['Modelo_Codigo']}</span>}
                  {v['Marca']   && <span className="vpicker-chip sm">{v['Marca']}</span>}
                  {v['Patente'] && <span className="vpicker-chip sm patente">{v['Patente']}</span>}
                </div>
                <ChevronRight size={13} className="vpicker-result-arrow" />
              </button>
            ))
          )}
          {filtered.length > 120 && (
            <div className="vpicker-more">Mostrando 120 de {filtered.length} · Refiná la búsqueda</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );

  // ── Estado: sin selección ──────────────────────────────────────────────────
  return (
    <>
      <button
        type="button"
        className={`vpicker-hero empty${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}
        onClick={() => !disabled && !isLoading && setOpen(true)}
        disabled={disabled || isLoading}
      >
        <div className="vpicker-hero-icon-wrap muted">
          {isLoading ? <Loader size={28} className="vpicker-spin" /> : <Truck size={28} />}
        </div>
        <div className="vpicker-hero-prompt">
          <div className="vpicker-hero-prompt-title">
            {isLoading ? 'Cargando equipos...' : 'Seleccioná el equipo'}
          </div>
          <div className="vpicker-hero-prompt-sub">
            {isLoading ? '' : `${opciones.length} equipos disponibles · Buscá por código, nombre o patente`}
          </div>
        </div>
        {!isLoading && <ChevronRight size={18} className="vpicker-hero-arrow" />}
      </button>
      {modal}
    </>
  );
};

export default VehiculoPicker;
