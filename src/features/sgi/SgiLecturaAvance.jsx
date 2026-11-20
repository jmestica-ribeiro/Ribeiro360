import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle, Clock, Download, RefreshCw, Search, Users } from 'lucide-react';
import { fetchAvanceLecturaSgi } from '../../services/sgiService';
import { LoadingSpinner, EmptyState, Select } from '../../components/common';
import './SgiLecturaAvance.css';

const SIN_AREA = 'Sin área';
const fmtFechaHora = (iso) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function descargarCsv(nombreArchivo, filas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + filas.map(f => f.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Log de lectura de un documento de lectura obligatoria: avance general, por área y por usuario.
 * Visible para admins y usuarios con permiso de carga SGI.
 */
const SgiLecturaAvance = ({ versionId, versionNumero, documento }) => {
  const [avance, setAvance] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendientes'); // 'pendientes' | 'leidos' | 'todos'
  const [busqueda, setBusqueda] = useState('');
  const [area, setArea] = useState('');

  const cargar = async () => {
    setLoading(true);
    const { data, error: err } = await fetchAvanceLecturaSgi(versionId);
    setError(err ? (err.message || 'Error desconocido') : null);
    setAvance(data);
    setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (versionId) cargar(); }, [versionId]);

  const porArea = useMemo(() => {
    const m = new Map();
    (avance?.usuarios ?? []).forEach(u => {
      const k = u.department || SIN_AREA;
      const e = m.get(k) || { area: k, total: 0, leidos: 0 };
      e.total += 1;
      if (u.leido_at) e.leidos += 1;
      m.set(k, e);
    });
    return [...m.values()].sort((a, b) => pct(a.leidos, a.total) - pct(b.leidos, b.total) || a.area.localeCompare(b.area));
  }, [avance]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (avance?.usuarios ?? [])
      .filter(u => filtro === 'todos' || (filtro === 'leidos' ? !!u.leido_at : !u.leido_at))
      .filter(u => !area || (u.department || SIN_AREA) === area)
      .filter(u => !q || [u.full_name, u.email, u.department, u.job_title].some(v => v?.toLowerCase().includes(q)))
      .sort((a, b) => (filtro === 'leidos' ? new Date(b.leido_at) - new Date(a.leido_at) : 0));
  }, [avance, filtro, busqueda, area]);

  const exportar = () => {
    const filas = [['Nombre', 'Email', 'Área', 'Puesto', 'Sucursal', 'Estado', 'Fecha de lectura']];
    (avance?.usuarios ?? []).forEach(u => filas.push([
      u.full_name, u.email, u.department, u.job_title, u.office_location,
      u.leido_at ? 'Leído' : 'Pendiente', u.leido_at ? fmtFechaHora(u.leido_at) : '',
    ]));
    const base = (documento?.codigo || documento?.titulo || 'documento').replace(/[^\w-]+/g, '_');
    descargarCsv(`lectura_${base}_rev${versionNumero ?? ''}.csv`, filas);
  };

  if (!versionId) return null;

  const total = avance?.total ?? 0;
  const leidos = avance?.leidos ?? 0;
  const porcentaje = pct(leidos, total);

  return (
    <section className="sgi-lect" aria-labelledby="sgi-lect-title">
      <header className="sgi-lect-head">
        <div className="sgi-lect-head-title">
          <BookOpenCheck size={16} />
          <h3 id="sgi-lect-title">Log de lectura</h3>
          <span className="sgi-lect-rev">Rev. {versionNumero}</span>
        </div>
        <div className="sgi-lect-head-actions">
          <button type="button" className="sgi-lect-btn" onClick={cargar} disabled={loading} title="Actualizar">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
          </button>
          <button type="button" className="sgi-lect-btn" onClick={exportar} disabled={!avance?.usuarios?.length}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </header>

      {loading && !avance ? (
        <div className="sgi-lect-loading"><LoadingSpinner /></div>
      ) : error ? (
        <p className="sgi-lect-error">No se pudo cargar el avance de lectura: {error}</p>
      ) : (
        <>
          {/* KPIs + barra general */}
          <div className="sgi-lect-kpis">
            <div className="sgi-lect-kpi main">
              <span className="sgi-lect-kpi-value">{porcentaje}%</span>
              <span className="sgi-lect-kpi-label">de avance</span>
            </div>
            <div className="sgi-lect-kpi ok">
              <CheckCircle size={16} />
              <span className="sgi-lect-kpi-value">{leidos}</span>
              <span className="sgi-lect-kpi-label">leyeron</span>
            </div>
            <div className="sgi-lect-kpi pend">
              <Clock size={16} />
              <span className="sgi-lect-kpi-value">{total - leidos}</span>
              <span className="sgi-lect-kpi-label">pendientes</span>
            </div>
            <div className="sgi-lect-kpi">
              <Users size={16} />
              <span className="sgi-lect-kpi-value">{total}</span>
              <span className="sgi-lect-kpi-label">usuarios</span>
            </div>
          </div>
          <div className="sgi-lect-bar" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de lectura">
            <span style={{ width: `${porcentaje}%` }} />
          </div>

          <div className="sgi-lect-body">
            {/* Detalle por usuario */}
            <div className="sgi-lect-users">
              <div className="sgi-lect-toolbar">
                <div className="sgi-lect-seg" role="tablist" aria-label="Filtrar por estado">
                  {[['pendientes', `Pendientes (${total - leidos})`], ['leidos', `Leyeron (${leidos})`], ['todos', 'Todos']].map(([k, l]) => (
                    <button key={k} type="button" role="tab" aria-selected={filtro === k} className={filtro === k ? 'active' : ''} onClick={() => setFiltro(k)}>{l}</button>
                  ))}
                </div>
                <label className="sgi-lect-search">
                  <Search size={14} />
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar persona o área…" aria-label="Buscar persona o área" />
                </label>
                <Select
                  size="sm"
                  value={area}
                  onChange={v => setArea(v || '')}
                  placeholder="Todas las áreas"
                  clearable
                  options={porArea.map(a => ({ value: a.area, label: a.area }))}
                  aria-label="Filtrar por área"
                />
              </div>

              {lista.length === 0 ? (
                <EmptyState
                  icon={filtro === 'pendientes' ? <CheckCircle size={22} /> : <Users size={22} />}
                  message={filtro === 'pendientes' && !busqueda && !area ? '¡Todos confirmaron la lectura!' : 'No hay usuarios para este filtro.'}
                />
              ) : (
                <ul className="sgi-lect-list">
                  {lista.map(u => (
                    <li key={u.id} className="sgi-lect-user">
                      {u.avatar_url
                        ? <img className="sgi-lect-avatar" src={u.avatar_url} alt="" />
                        : <span className="sgi-lect-avatar">{(u.full_name || '?').charAt(0)}</span>}
                      <span className="sgi-lect-user-info">
                        <span className="sgi-lect-user-name">{u.full_name}</span>
                        <span className="sgi-lect-user-meta">{[u.department, u.job_title].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                      {u.leido_at
                        ? <span className="sgi-lect-state ok"><CheckCircle size={12} /> {fmtFechaHora(u.leido_at)}</span>
                        : <span className="sgi-lect-state pend"><Clock size={12} /> Pendiente</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default SgiLecturaAvance;
