import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import './Select.css';

const normalize = (options = []) =>
  options.map(o => (o !== null && typeof o === 'object' ? o : { value: o, label: String(o) }));

function useIsMobile(query = '(max-width: 640px)') {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

/**
 * Select custom accesible.
 *  options: Array<string | { value, label, description?, icon?, disabled?, group? }>
 *  value: valor (o array si multiple)    onChange(value)  <- recibe el valor, no un evento
 *  searchable: combobox con filtro       multiple: chips removibles
 *  name: renderiza <input type="hidden"> para submit nativo
 *  size: 'sm' | 'md'   error: boolean|string   disabled   placeholder   clearable
 */
export function Select({
  options, value, onChange, multiple = false, searchable, placeholder = 'Seleccionar…',
  disabled = false, error = false, name, size = 'md', clearable = false,
  emptyText = 'Sin resultados', className = '', panelClassName = '', id, 'aria-label': ariaLabel,
}) {
  const opts = useMemo(() => normalize(options), [options]);
  const isSearchable = searchable ?? opts.length > 8;
  const isMobile = useIsMobile();
  const uid = useId();
  const listId = `${uid}-list`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const typeBuf = useRef({ s: '', t: 0 });

  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : (value === undefined || value === null || value === '' ? [] : [value]);
  const isSelected = (v) => selectedValues.some(s => s === v);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    return opts.filter(o => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(q));
  }, [opts, query]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openMenu = () => {
    if (disabled) return;
    const first = Math.max(0, filtered.findIndex(o => isSelected(o.value) && !o.disabled));
    setActive(first);
    setOpen(true);
  };

  const commit = (opt) => {
    if (!opt || opt.disabled) return;
    if (multiple) {
      onChange(isSelected(opt.value) ? selectedValues.filter(v => v !== opt.value) : [...selectedValues, opt.value]);
      if (isSearchable) { setQuery(''); inputRef.current?.focus(); }
    } else {
      onChange(opt.value);
      close();
    }
  };

  // Posicionamiento (desktop): flip, ancho del trigger, reposiciona en scroll/resize
  useLayoutEffect(() => {
    if (!open || isMobile) return undefined;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 8;
      const above = r.top - 8;
      const up = below < 220 && above > below;
      const maxW = Math.min(360, window.innerWidth - 16);
      const wantW = Math.max(r.width, 240);
      const alignRight = r.left + Math.min(wantW, maxW) > window.innerWidth - 8;
      setPos({
        ...(alignRight
          ? { right: Math.max(8, window.innerWidth - r.right) }
          : { left: Math.max(8, r.left) }),
        minWidth: r.width,
        width: 'max-content',
        maxWidth: maxW,
        maxHeight: Math.max(160, Math.min(320, up ? above : below)),
        ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, isMobile]);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return undefined;
    const on = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      close(false);
    };
    document.addEventListener('mousedown', on);
    document.addEventListener('touchstart', on);
    return () => { document.removeEventListener('mousedown', on); document.removeEventListener('touchstart', on); };
  }, [open, close]);

  // Foco al input de búsqueda y bloqueo de scroll del body si es sheet
  useEffect(() => {
    if (!open) return undefined;
    if (isSearchable) setTimeout(() => inputRef.current?.focus(), 0);
    if (isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [open, isSearchable, isMobile]);

  // Mantener visible la opción activa
  useEffect(() => {
    if (open) document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, uid]);

  const move = (dir, from = active) => {
    if (!filtered.length) return;
    let i = from;
    for (let n = 0; n < filtered.length; n += 1) {
      i = (i + dir + filtered.length) % filtered.length;
      if (!filtered[i].disabled) { setActive(i); return; }
    }
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); move(-1); break;
      case 'Home': e.preventDefault(); move(1, -1); break;
      case 'End': e.preventDefault(); move(-1, 0); break;
      case 'Enter': e.preventDefault(); commit(filtered[active]); break;
      case ' ': if (!isSearchable) { e.preventDefault(); commit(filtered[active]); } break;
      case 'Escape': e.preventDefault(); close(); break;
      case 'Tab': close(false); break;
      default:
        if (!isSearchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const now = e.timeStamp;
          const b = typeBuf.current;
          b.s = now - b.t > 600 ? e.key.toLowerCase() : b.s + e.key.toLowerCase();
          b.t = now;
          const idx = filtered.findIndex(o => !o.disabled && String(o.label).toLowerCase().startsWith(b.s));
          if (idx >= 0) setActive(idx);
        }
    }
  };

  const selectedOpts = selectedValues.map(v => opts.find(o => o.value === v)).filter(Boolean);
  const hasValue = selectedOpts.length > 0;

  const renderTriggerContent = () => {
    if (!hasValue) return <span className="sel-placeholder">{placeholder}</span>;
    if (multiple) {
      return (
        <span className="sel-chips">
          {selectedOpts.map(o => (
            <span key={String(o.value)} className="sel-chip">
              {o.label}
              <span
                role="button"
                aria-label={`Quitar ${o.label}`}
                className="sel-chip-x"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(selectedValues.filter(v => v !== o.value)); }}
              ><X size={12} /></span>
            </span>
          ))}
        </span>
      );
    }
    const o = selectedOpts[0];
    return (
      <span className="sel-value">
        {o.icon && <span className="sel-opt-icon">{o.icon}</span>}
        <span className="sel-ellipsis">{o.label}</span>
      </span>
    );
  };

  const activeId = open && filtered[active] ? `${uid}-opt-${active}` : undefined;

  const list = (
    <ul id={listId} role="listbox" aria-multiselectable={multiple || undefined} className="sel-list" aria-label={ariaLabel}>
      {filtered.length === 0 && <li className="sel-empty" role="presentation">{emptyText}</li>}
      {filtered.map((o, i) => {
        const showGroup = o.group && o.group !== filtered[i - 1]?.group;
        const sel = isSelected(o.value);
        return (
          <React.Fragment key={String(o.value)}>
            {showGroup && <li role="presentation" className="sel-group">{o.group}</li>}
            <li
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={sel}
              aria-disabled={o.disabled || undefined}
              className={`sel-opt${i === active ? ' active' : ''}${sel ? ' selected' : ''}${o.disabled ? ' disabled' : ''}`}
              onMouseEnter={() => !o.disabled && setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(o)}
            >
              {o.icon && <span className="sel-opt-icon">{o.icon}</span>}
              <span className="sel-opt-text">
                <span className="sel-opt-label">{o.label}</span>
                {o.description && <span className="sel-opt-desc">{o.description}</span>}
              </span>
              {sel && <Check size={16} className="sel-check" />}
            </li>
          </React.Fragment>
        );
      })}
    </ul>
  );

  const searchBox = isSearchable && (
    <div className="sel-search">
      <Search size={15} />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActive(0); }}
        onKeyDown={onKeyDown}
        placeholder="Buscar…"
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        autoComplete="off"
      />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={!isSearchable ? activeId : undefined}
        aria-disabled={disabled || undefined}
        aria-invalid={error ? true : undefined}
        aria-label={ariaLabel}
        className={`sel-trigger sel-${size}${open ? ' open' : ''}${error ? ' error' : ''}${disabled ? ' disabled' : ''} ${className}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        {renderTriggerContent()}
        {clearable && hasValue && !disabled && (
          <span
            role="button"
            aria-label="Limpiar"
            className="sel-clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); onChange(multiple ? [] : ''); }}
          ><X size={14} /></span>
        )}
        <ChevronDown size={16} className="sel-chevron" />
      </div>
      {name && <input type="hidden" name={name} value={multiple ? selectedValues.join(',') : (selectedValues[0] ?? '')} />}
      {typeof error === 'string' && error && <p className="sel-error-msg">{error}</p>}

      {open && createPortal(
        isMobile ? (
          <div className="sel-sheet-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
            <div className={`sel-sheet ${panelClassName}`} ref={panelRef} role="presentation">
              <div className="sel-sheet-grip" />
              {searchBox}
              {list}
              {multiple && <button type="button" className="sel-sheet-done" onClick={() => close()}>Listo</button>}
            </div>
          </div>
        ) : (
          <div
            ref={panelRef}
            className={`sel-panel ${panelClassName}`}
            style={pos ? { ...pos, position: 'fixed' } : { visibility: 'hidden', position: 'fixed' }}
          >
            {searchBox}
            {list}
          </div>
        ),
        document.body
      )}
    </>
  );
}

export const Combobox = (props) => <Select {...props} searchable />;
export const MultiSelect = (props) => <Select {...props} multiple />;

export default Select;
