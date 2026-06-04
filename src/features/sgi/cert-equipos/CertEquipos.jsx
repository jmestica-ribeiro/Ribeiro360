import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ClipboardCheck, Plus, Search, Pencil, Trash2, X, Save, AlertTriangle, CheckCircle, Clock, Paperclip, ExternalLink, Upload, Table2, CalendarDays, ChevronLeft, ChevronRight, MapPin, Tag, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchEquiposMedicion, saveEquipoMedicion, deleteEquipoMedicion,
  uploadCeqAdjunto, getCeqAdjuntoSignedUrl,
} from '../../../services/sgiService';
import { LoadingSpinner, EmptyState } from '../../../components/common';
import './CertEquipos.css';

const TIPOS_EQUIPO = [
  'Alcoholímetro', 'Anemómetro', 'Decibelímetro', 'Detector de Gas',
  'Luxómetro', 'Medidor altura cables', 'Telurímetro',
];

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  tipo: '', marca: '', modelo: '', nro_serie: '', ubicacion: '',
  intervalo_verificacion: 'Anual', nro_certificado: '',
  fecha_ultima_calibracion: '', fecha_verificacion_interna: '',
  fecha_proxima_verificacion: '', realizado_por: '', observaciones: '',
  adjunto_url: '',
};

const ESTADO_CONFIG = {
  vigente:    { label: 'Vigente',    color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  por_vencer: { label: 'Por vencer', color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  vencido:    { label: 'Vencido',    color: '#ef4444', bg: '#fee2e2', icon: AlertTriangle },
  sin_fecha:  { label: 'Sin fecha',  color: '#94a3b8', bg: '#f1f5f9', icon: Clock },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function diasHastaVencimiento(dateStr) {
  if (!dateStr) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const proxima = new Date(dateStr);
  return Math.floor((proxima - hoy) / (1000 * 60 * 60 * 24));
}

function DiasChip({ dateStr, estado }) {
  const dias = diasHastaVencimiento(dateStr);
  if (dias === null) return null;
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.sin_fecha;
  const label = dias < 0
    ? `hace ${Math.abs(dias)}d`
    : dias === 0 ? 'hoy' : `${dias}d`;
  return (
    <span className="ceq-dias-chip" style={{ color: cfg.color, background: cfg.bg }}>
      {label}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.sin_fecha;
  const Icon = cfg.icon;
  return (
    <span className="ceq-badge" style={{ color: cfg.color, background: cfg.bg }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

function AdjuntoLink({ path }) {
  const [loading, setLoading] = useState(false);
  const handleOpen = async () => {
    if (!path) return;
    setLoading(true);
    const { data } = await getCeqAdjuntoSignedUrl(path);
    setLoading(false);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };
  if (!path) return <span className="ceq-text-muted">—</span>;
  const filename = path.split('/').pop();
  return (
    <button className="ceq-adjunto-link" onClick={handleOpen} disabled={loading} title={filename}>
      {loading ? <LoadingSpinner size={12} /> : <Paperclip size={12} />}
      <span>{filename}</span>
      <ExternalLink size={10} />
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr className="ceq-skeleton-row">
      {[20, 110, 160, 100, 110, 90, 80].map((w, i) => (
        <td key={i}><div className="ceq-skeleton-cell" style={{ width: w }} /></td>
      ))}
    </tr>
  );
}

export default function CertEquipos() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const fileRef = useRef(null);

  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('');
  const [ubicacionFilter, setUbicacionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('fecha_proxima_verificacion');
  const [sortDir, setSortDir] = useState('asc');
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const [vista, setVista] = useState('tabla');
  const [calMonth, setCalMonth] = useState(() => {
    const h = new Date(); return { year: h.getFullYear(), month: h.getMonth() };
  });
  const [tooltip, setTooltip] = useState(null); // { dateKey, x, y }

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingFile, setPendingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchEquiposMedicion();
    setEquipos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, estadoFilter, tipoFilter, ubicacionFilter]);

  const ubicaciones = useMemo(() =>
    [...new Set(equipos.map(e => e.ubicacion).filter(Boolean))].sort(),
  [equipos]);

  const filtered = useMemo(() => {
    const rows = equipos.filter(e => {
      if (estadoFilter !== 'todos' && e.estado !== estadoFilter) return false;
      if (tipoFilter && e.tipo !== tipoFilter) return false;
      if (ubicacionFilter && e.ubicacion !== ubicacionFilter) return false;
      const term = search.toLowerCase();
      if (term && ![e.tipo, e.marca, e.modelo, e.nro_serie, e.ubicacion, e.realizado_por, e.nro_certificado]
        .some(v => v?.toLowerCase().includes(term))) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [equipos, search, estadoFilter, tipoFilter, ubicacionFilter, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeFilters = [tipoFilter, ubicacionFilter, estadoFilter !== 'todos' ? estadoFilter : ''].filter(Boolean).length;

  const clearFilters = () => { setTipoFilter(''); setUbicacionFilter(''); setEstadoFilter('todos'); setSearch(''); };

  const openNew = () => { setEditingId(null); setForm(EMPTY_FORM); setPendingFile(null); setModalOpen(true); };
  const openEdit = (equipo) => {
    setEditingId(equipo.id);
    const { estado, ...rest } = equipo;
    setForm({ ...EMPTY_FORM, ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? ''])) });
    setPendingFile(null); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); setPendingFile(null); };

  const calcProximaVerificacion = (fechaUltima, intervalo) => {
    if (!fechaUltima) return '';
    const d = new Date(fechaUltima);
    if (intervalo === 'Semestral') d.setMonth(d.getMonth() + 6);
    else if (intervalo === 'Quinquenal') d.setFullYear(d.getFullYear() + 5);
    else d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value };
      if (name === 'fecha_ultima_calibracion' || name === 'intervalo_verificacion') {
        updated.fecha_proxima_verificacion = calcProximaVerificacion(
          name === 'fecha_ultima_calibracion' ? value : f.fecha_ultima_calibracion,
          name === 'intervalo_verificacion' ? value : f.intervalo_verificacion,
        );
      }
      return updated;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.tipo.trim()) return;
    setSaving(true);
    let adjunto_url = form.adjunto_url || null;
    if (pendingFile) {
      const equipoId = editingId ?? crypto.randomUUID();
      const { path, error: uploadErr } = await uploadCeqAdjunto(equipoId, pendingFile);
      if (!uploadErr) adjunto_url = path;
    }
    const payload = {
      ...form, adjunto_url,
      intervalo_verificacion: form.intervalo_verificacion || 'Anual',
      fecha_ultima_calibracion: form.fecha_ultima_calibracion || null,
      fecha_verificacion_interna: form.fecha_verificacion_interna || null,
      fecha_proxima_verificacion: form.fecha_proxima_verificacion || null,
      created_by: profile?.id ?? null,
      ...(editingId ? { id: editingId } : {}),
    };
    const { error } = await saveEquipoMedicion(payload);
    setSaving(false);
    if (!error) { closeModal(); load(); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteEquipoMedicion(deleteTarget);
    setDeleteTarget(null); load();
  };

  const counts = {
    vigente:    equipos.filter(e => e.estado === 'vigente').length,
    por_vencer: equipos.filter(e => e.estado === 'por_vencer').length,
    vencido:    equipos.filter(e => e.estado === 'vencido').length,
  };

  const vencimientosPorFecha = useMemo(() => {
    const map = {};
    for (const eq of equipos) {
      if (!eq.fecha_proxima_verificacion) continue;
      if (!map[eq.fecha_proxima_verificacion]) map[eq.fecha_proxima_verificacion] = [];
      map[eq.fecha_proxima_verificacion].push(eq);
    }
    return map;
  }, [equipos]);

  const calDays = useMemo(() => {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay + 6) % 7;
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calMonth]);

  const prevMonth = () => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const todayStr = new Date().toISOString().split('T')[0];

  const [expandedId, setExpandedId] = useState(null);
  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);
  const colSpan = isAdmin ? 8 : 7;

  return (
    <div className="ceq-page">

      {/* Header */}
      <div className="ceq-header">
        <div className="ceq-header-left">
          <div className="ceq-header-icon-wrap">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <h1 className="ceq-title">Cert. Equipos de Medición</h1>
            <p className="ceq-subtitle">{equipos.length} equipos registrados · Control de calibraciones y vencimientos</p>
          </div>
        </div>
        <div className="ceq-header-actions">
          <div className="ceq-view-toggle">
            <button className={`ceq-view-btn${vista === 'tabla' ? ' active' : ''}`} onClick={() => setVista('tabla')} title="Vista tabla"><Table2 size={15} /></button>
            <button className={`ceq-view-btn${vista === 'calendario' ? ' active' : ''}`} onClick={() => setVista('calendario')} title="Vista calendario"><CalendarDays size={15} /></button>
          </div>
          {isAdmin && (
            <button className="ceq-btn-primary" onClick={openNew}>
              <Plus size={15} /> Nuevo equipo
            </button>
          )}
        </div>
      </div>

      {/* KPI chips */}
      <div className="ceq-kpis">
        {['vigente', 'por_vencer', 'vencido'].map(est => {
          const cfg = ESTADO_CONFIG[est];
          const Icon = cfg.icon;
          return (
            <button
              key={est}
              className={`ceq-kpi${estadoFilter === est ? ' active' : ''}`}
              style={{ '--kpi-color': cfg.color, '--kpi-bg': cfg.bg }}
              onClick={() => setEstadoFilter(estadoFilter === est ? 'todos' : est)}
            >
              <Icon size={15} />
              <span className="ceq-kpi-count">{counts[est]}</span>
              <span className="ceq-kpi-label">{cfg.label}</span>
            </button>
          );
        })}
        <span className="ceq-kpi-total">{equipos.length} total</span>
      </div>

      {/* Toolbar */}
      <div className="ceq-filters-panel">
        <div className="ceq-filters-row">
          <div className="ceq-search-wrap">
            <Search size={14} className="ceq-search-icon" />
            <input
              className="ceq-search"
              placeholder="Buscar marca, modelo, N° serie…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="ceq-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
          </div>

          <div className="ceq-tipo-chips">
            <button
              className={`ceq-tipo-chip${tipoFilter === '' ? ' active' : ''}`}
              onClick={() => setTipoFilter('')}
            >Todos</button>
            {TIPOS_EQUIPO.map(t => (
              <button
                key={t}
                className={`ceq-tipo-chip${tipoFilter === t ? ' active' : ''}`}
                onClick={() => setTipoFilter(tipoFilter === t ? '' : t)}
              >{t}</button>
            ))}
          </div>

          {activeFilters > 0 && (
            <button className="ceq-clear-filters" onClick={clearFilters}>
              <X size={12} /> Limpiar
            </button>
          )}
        </div>

        {ubicaciones.length > 0 && (
          <div className="ceq-ubicacion-row">
            <span className="ceq-ubicacion-label"><MapPin size={11} /> Ubicación</span>
            <div className="ceq-ubicacion-scroll">
              {ubicaciones.map(u => (
                <button
                  key={u}
                  className={`ceq-ubicacion-chip${ubicacionFilter === u ? ' active' : ''}`}
                  onClick={() => setUbicacionFilter(ubicacionFilter === u ? '' : u)}
                >{u}</button>
              ))}
            </div>
          </div>
        )}

        {(search || tipoFilter || ubicacionFilter || estadoFilter !== 'todos') && (
          <p className="ceq-result-count">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} · mostrando página {page} de {totalPages}
          </p>
        )}
      </div>

      {/* Vista Calendario */}
      {vista === 'calendario' && (
        <div className="ceq-cal-wrap" onMouseLeave={() => setTooltip(null)}>
          <div className="ceq-cal-nav">
            <button className="ceq-icon-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span className="ceq-cal-title">{MONTH_NAMES[calMonth.month]} {calMonth.year}</span>
            <button className="ceq-icon-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
          </div>
          <div className="ceq-cal-grid">
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
              <div key={d} className="ceq-cal-dow">{d}</div>
            ))}
            {calDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="ceq-cal-cell ceq-cal-cell--empty" />;
              const mm = String(calMonth.month + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateKey = `${calMonth.year}-${mm}-${dd}`;
              const eqs = vencimientosPorFecha[dateKey] ?? [];
              const isToday = dateKey === todayStr;
              return (
                <div
                  key={dateKey}
                  className={`ceq-cal-cell${isToday ? ' ceq-cal-cell--today' : ''}${eqs.length ? ' ceq-cal-cell--has-events' : ''}`}
                  onMouseEnter={eqs.length ? (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const wrap = e.currentTarget.closest('.ceq-cal-wrap').getBoundingClientRect();
                    setTooltip({ dateKey, x: rect.left - wrap.left, y: rect.bottom - wrap.top });
                  } : undefined}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span className="ceq-cal-day">{day}</span>
                  {eqs.length > 0 && (
                    <div className="ceq-cal-events">
                      {eqs.slice(0, 2).map(eq => (
                        <span key={eq.id} className="ceq-cal-event-pill" style={{ borderLeftColor: ESTADO_CONFIG[eq.estado]?.color ?? '#94a3b8' }}>
                          <span className="ceq-cal-event-tipo">{eq.tipo}</span>
                          {eq.ubicacion && <span className="ceq-cal-event-loc">{eq.ubicacion}</span>}
                        </span>
                      ))}
                      {eqs.length > 2 && (
                        <span className="ceq-cal-event-more">+{eqs.length - 2} más</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tooltip */}
          {tooltip && vencimientosPorFecha[tooltip.dateKey] && (
            <div
              className="ceq-cal-tooltip"
              style={{ left: tooltip.x, top: tooltip.y }}
              onMouseEnter={() => {}}
              onMouseLeave={() => setTooltip(null)}
            >
              <p className="ceq-cal-tooltip-date">{formatDate(tooltip.dateKey)}</p>
              {vencimientosPorFecha[tooltip.dateKey].map(eq => (
                <div key={eq.id} className="ceq-cal-tooltip-row">
                  <span className="ceq-cal-tooltip-dot" style={{ background: ESTADO_CONFIG[eq.estado]?.color }} />
                  <div className="ceq-cal-tooltip-info">
                    <span className="ceq-cal-tooltip-tipo">{eq.tipo}</span>
                    <span className="ceq-cal-tooltip-sub">{[eq.marca, eq.modelo].filter(Boolean).join(' ')}{eq.nro_serie ? ` · #${eq.nro_serie}` : ''}</span>
                    {eq.ubicacion && <span className="ceq-cal-tooltip-sub">{eq.ubicacion}</span>}
                  </div>
                  <EstadoBadge estado={eq.estado} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      {vista === 'tabla' && (
        <>
          <div className="ceq-table-wrap">
            <table className="ceq-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }} />
                  {[
                    { col: 'tipo',                      label: 'Tipo' },
                    { col: 'marca',                     label: 'Marca / Modelo' },
                    { col: 'nro_serie',                 label: 'N° Serie' },
                    { col: 'ubicacion',                 label: 'Ubicación' },
                    { col: 'fecha_proxima_verificacion',label: 'Próx. Verificación' },
                    { col: 'estado',                    label: 'Estado' },
                  ].map(({ col, label }) => (
                    <th key={col} className="ceq-th-sortable" onClick={() => handleSort(col)}>
                      <span>{label}</span>
                      {sortCol === col
                        ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        : <ChevronsUpDown size={12} className="ceq-sort-idle" />}
                    </th>
                  ))}
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  : paginated.length === 0
                    ? (
                      <tr>
                        <td colSpan={colSpan} className="ceq-empty-cell">
                          <EmptyState message="No hay equipos que coincidan con los filtros" />
                        </td>
                      </tr>
                    )
                    : paginated.map(eq => {
                      const isExpanded = expandedId === eq.id;
                      return (
                        <React.Fragment key={eq.id}>
                          <tr
                            className={`ceq-row ceq-row--${eq.estado}${isExpanded ? ' ceq-row--expanded' : ''}`}
                            onClick={() => toggleExpand(eq.id)}
                          >
                            <td className="ceq-expand-cell">
                              <ChevronRight size={14} className={`ceq-expand-icon${isExpanded ? ' open' : ''}`} />
                            </td>
                            <td><span className="ceq-tipo-pill">{eq.tipo || '—'}</span></td>
                            <td>
                              <span className="ceq-marca">{eq.marca || '—'}</span>
                              {eq.modelo && <span className="ceq-modelo"> {eq.modelo}</span>}
                            </td>
                            <td className="ceq-mono ceq-serie">{eq.nro_serie || '—'}</td>
                            <td>
                              {eq.ubicacion
                                ? <span className="ceq-ubicacion"><MapPin size={11} />{eq.ubicacion}</span>
                                : <span className="ceq-text-muted">—</span>}
                            </td>
                            <td className="ceq-date ceq-date--proxima">
                              <span style={{ color: ESTADO_CONFIG[eq.estado]?.color }}>
                                {formatDate(eq.fecha_proxima_verificacion)}
                              </span>
                              <DiasChip dateStr={eq.fecha_proxima_verificacion} estado={eq.estado} />
                            </td>
                            <td><EstadoBadge estado={eq.estado} /></td>
                            {isAdmin && (
                              <td className="ceq-actions" onClick={e => e.stopPropagation()}>
                                <button className="ceq-icon-btn" title="Editar" onClick={() => openEdit(eq)}><Pencil size={13} /></button>
                                <button className="ceq-icon-btn ceq-icon-btn--danger" title="Eliminar" onClick={() => setDeleteTarget(eq.id)}><Trash2 size={13} /></button>
                              </td>
                            )}
                          </tr>
                          {isExpanded && (
                            <tr className="ceq-row-detail">
                              <td colSpan={colSpan}>
                                <div className="ceq-detail-grid">
                                  <div className="ceq-detail-item">
                                    <span className="ceq-detail-label">Intervalo</span>
                                    <span className="ceq-intervalo">{eq.intervalo_verificacion || '—'}</span>
                                  </div>
                                  <div className="ceq-detail-item">
                                    <span className="ceq-detail-label">N° Certificado</span>
                                    <span className="ceq-mono">{eq.nro_certificado || '—'}</span>
                                  </div>
                                  <div className="ceq-detail-item">
                                    <span className="ceq-detail-label">Últ. Calibración</span>
                                    <span>{formatDate(eq.fecha_ultima_calibracion)}</span>
                                  </div>
                                  <div className="ceq-detail-item">
                                    <span className="ceq-detail-label">Verif. Interna</span>
                                    <span>{formatDate(eq.fecha_verificacion_interna)}</span>
                                  </div>
                                  <div className="ceq-detail-item">
                                    <span className="ceq-detail-label">Realizado por</span>
                                    <span>{eq.realizado_por || '—'}</span>
                                  </div>
                                  <div className="ceq-detail-item">
                                    <span className="ceq-detail-label">Adjunto</span>
                                    <AdjuntoLink path={eq.adjunto_url} />
                                  </div>
                                  {eq.observaciones && (
                                    <div className="ceq-detail-item ceq-detail-item--full">
                                      <span className="ceq-detail-label">Observaciones</span>
                                      <span className="ceq-detail-obs">{eq.observaciones}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                }
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="ceq-pagination">
              <button className="ceq-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={15} />
              </button>
              <div className="ceq-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === '…'
                    ? <span key={`dots-${i}`} className="ceq-page-dots">…</span>
                    : <button key={p} className={`ceq-page-num${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  )
                }
              </div>
              <button className="ceq-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight size={15} />
              </button>
              <span className="ceq-page-info">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
            </div>
          )}
        </>
      )}

      {/* Modal alta / edición */}
      {modalOpen && (
        <div className="ceq-modal-overlay" onClick={closeModal}>
          <div className="ceq-modal" onClick={e => e.stopPropagation()}>
            <div className="ceq-modal-header">
              <h2>{editingId ? 'Editar equipo' : 'Nuevo equipo'}</h2>
              <button className="ceq-icon-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <form className="ceq-form" onSubmit={handleSave}>
              <div className="ceq-form-grid">
                <label className="ceq-field ceq-field--required">
                  <span>Tipo</span>
                  <select name="tipo" value={form.tipo} onChange={handleChange} required>
                    <option value="">Seleccioná un tipo…</option>
                    {TIPOS_EQUIPO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="ceq-field">
                  <span>Marca</span>
                  <input name="marca" value={form.marca} onChange={handleChange} placeholder="Ej: Fluke" />
                </label>
                <label className="ceq-field">
                  <span>Modelo</span>
                  <input name="modelo" value={form.modelo} onChange={handleChange} />
                </label>
                <label className="ceq-field">
                  <span>N° Serie / ID Equipo</span>
                  <input name="nro_serie" value={form.nro_serie} onChange={handleChange} />
                </label>
                <label className="ceq-field">
                  <span>Ubicación</span>
                  <input name="ubicacion" value={form.ubicacion} onChange={handleChange} />
                </label>
                <label className="ceq-field">
                  <span>Intervalo de verificación</span>
                  <select name="intervalo_verificacion" value={form.intervalo_verificacion} onChange={handleChange}>
                    <option value="Anual">Anual</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Quinquenal">Quinquenal</option>
                  </select>
                </label>
                <label className="ceq-field">
                  <span>N° Certificado</span>
                  <input name="nro_certificado" value={form.nro_certificado} onChange={handleChange} />
                </label>
                <label className="ceq-field">
                  <span>Fecha última calibración</span>
                  <input name="fecha_ultima_calibracion" type="date" value={form.fecha_ultima_calibracion} onChange={handleChange} />
                </label>
                <label className="ceq-field">
                  <span>Fecha verificación interna</span>
                  <input name="fecha_verificacion_interna" type="date" value={form.fecha_verificacion_interna} onChange={handleChange} />
                </label>
                <label className="ceq-field">
                  <span>Fecha próxima verificación</span>
                  <input name="fecha_proxima_verificacion" type="date" value={form.fecha_proxima_verificacion} readOnly className="ceq-input-readonly" placeholder="Se calcula automáticamente" />
                </label>
                <label className="ceq-field">
                  <span>Realizado por (proveedor)</span>
                  <input name="realizado_por" value={form.realizado_por} onChange={handleChange} placeholder="Nombre del proveedor" />
                </label>
                <label className="ceq-field">
                  <span>Adjunto (certificado / informe)</span>
                  <div className="ceq-file-wrap">
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="ceq-file-input" onChange={e => { const f = e.target.files?.[0]; if (f) setPendingFile(f); }} />
                    <button type="button" className="ceq-file-btn" onClick={() => fileRef.current?.click()}>
                      <Upload size={14} />
                      {pendingFile ? pendingFile.name : (form.adjunto_url ? 'Reemplazar archivo' : 'Seleccionar archivo')}
                    </button>
                    {form.adjunto_url && !pendingFile && (
                      <span className="ceq-file-current"><Paperclip size={12} /> {form.adjunto_url.split('/').pop()}</span>
                    )}
                  </div>
                </label>
                <label className="ceq-field ceq-field--full">
                  <span>Observaciones</span>
                  <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} />
                </label>
              </div>
              <div className="ceq-form-footer">
                <button type="button" className="ceq-btn-ghost" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="ceq-btn-primary" disabled={saving}>
                  {saving ? <LoadingSpinner size={14} /> : <Save size={14} />}
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteTarget && (
        <div className="ceq-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="ceq-modal ceq-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="ceq-modal-header">
              <h2>Eliminar equipo</h2>
              <button className="ceq-icon-btn" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            </div>
            <p className="ceq-confirm-text">¿Estás seguro? Esta acción no se puede deshacer.</p>
            <div className="ceq-form-footer">
              <button className="ceq-btn-ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="ceq-btn-danger" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
