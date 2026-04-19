import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, AlertCircle } from 'lucide-react';
import { fetchIncidentesAbiertos, fetchIncidentesGerencias, fetchIncidentes } from '../../../services/sgiService';
import './Incidentes.css';

const PASOS = [
  { paso: 1, label: 'Registrar el Incidente' },
  { paso: 2, label: 'Designar el equipo de Análisis' },
  { paso: 3, label: 'Registrar el análisis de Causa Raíz' },
  { paso: 4, label: 'Registrar el Plan de Trabajo' },
  { paso: 5, label: 'Cerrar las Acciones' },
  { paso: 6, label: 'Verificar la eficacia las Acciones' },
];


const TIPO_INCIDENTE_FILTERS = [
  { label: 'Personal',   value: 'Personal' },
  { label: 'Vehicular',  value: 'Vehicular' },
  { label: 'Ambiental',  value: 'Ambiental' },
  { label: 'Industrial', value: 'Industrial' },
];

const CLASIFICACION_FILTERS = [
  { label: 'Relevante', value: 'Relevante', color: '#F59E0B' },
  { label: 'Crítica',   value: 'Crítica',   color: '#E71D36' },
  { label: 'Mayor',     value: 'Mayor',     color: '#8B5CF6' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function SkeletonRow() {
  return (
    <tr className="inc-skeleton-row">
      {[70, 100, 110, 220, 130, 110, 100, 90].map((w, i) => (
        <td key={i}>
          <div className="inc-skeleton-cell" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

export default function Incidentes() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState([]);
  const [allAbiertos, setAllAbiertos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [pasoFilter, setPasoFilter] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [gerenciaFilter, setGerenciaFilter] = useState('');
  const [gerencias, setGerencias] = useState([]);
  const [tipoIncidenteFilter, setTipoIncidenteFilter] = useState(null);
  const [clasificacionFilter, setClasificacionFilter] = useState(null);

  useEffect(() => {
    fetchIncidentesAbiertos().then(({ data }) => setAllAbiertos(data ?? []));
  }, []);

  useEffect(() => {
    fetchIncidentesGerencias().then(({ data }) => setGerencias(data ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchIncidentes({
        estado: estadoFilter,
        fechaDesde,
        fechaHasta,
        paso: pasoFilter,
        gerencia: gerenciaFilter,
        tipoIncidente: tipoIncidenteFilter,
        clasificacion: clasificacionFilter,
      });
      if (error) throw error;
      setIncidentes(data ?? []);
    } catch (err) {
      console.error('Error fetching incidentes:', err);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, fechaDesde, fechaHasta, pasoFilter, gerenciaFilter, tipoIncidenteFilter, clasificacionFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const countByPaso = PASOS.map(({ paso }) =>
    allAbiertos.filter(h => (h.paso_actual || 1) === paso).length
  );
  const totalAbiertos = allAbiertos.length;

  return (
    <div className="inc-container">
      {/* Header */}
      <div className="inc-page-header">
        <div className="inc-header-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="inc-header-text">
          <h2>Incidentes</h2>
          <p>Gestión y seguimiento de accidentes, incidentes y casi accidentes</p>
        </div>
        <div className="inc-header-actions">
          <button className="inc-btn-primary" onClick={() => navigate('/sgi/incidentes/nuevo')}>
            <Plus size={16} />
            Nuevo Incidente
          </button>
        </div>
      </div>

      {/* Resumen por paso */}
      <div className="inc-paso-summary">
        <div
          className={`inc-paso-summary-card inc-paso-total${pasoFilter === null ? ' inc-paso-active' : ''}`}
          onClick={() => { setPasoFilter(null); setEstadoFilter('todos'); }}
        >
          <div className="inc-paso-summary-badge inc-paso-total-badge">∑</div>
          <span className="inc-paso-summary-count">{totalAbiertos}</span>
          <span className="inc-paso-summary-label">Total abiertos</span>
        </div>
        {PASOS.map(({ paso, label }, i) => (
          <div
            key={paso}
            className={`inc-paso-summary-card${pasoFilter === paso ? ' inc-paso-active' : ''}${countByPaso[i] === 0 ? ' inc-paso-empty' : ''}`}
            onClick={() => { setPasoFilter(pasoFilter === paso ? null : paso); setEstadoFilter('abierto'); }}
          >
            <div className="inc-paso-summary-badge">{paso}</div>
            <span className="inc-paso-summary-count">{countByPaso[i]}</span>
            <span className="inc-paso-summary-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="inc-toolbar">
        <div className="inc-toolbar-row1">
          <div className="inc-toolbar-right">
          <div className="inc-daterange">
            <input
              type="date"
              className="inc-daterange-input"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              title="Desde"
            />
            <span className="inc-daterange-sep">→</span>
            <input
              type="date"
              className="inc-daterange-input"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              title="Hasta"
            />
            {(fechaDesde || fechaHasta) && (
              <button className="inc-filter-clear" onClick={() => { setFechaDesde(''); setFechaHasta(''); }} title="Limpiar fechas">✕</button>
            )}
          </div>

          <div className="inc-select-wrap">
            <select
              className="inc-filter-select"
              value={gerenciaFilter}
              onChange={e => setGerenciaFilter(e.target.value)}
            >
              <option value="">Todas las gerencias</option>
              {gerencias.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {gerenciaFilter && (
              <button className="inc-filter-clear" onClick={() => setGerenciaFilter('')} title="Limpiar gerencia">✕</button>
            )}
          </div>

          <div className="inc-estado-toggle">
            {[
              { label: 'Todos',   value: 'todos' },
              { label: 'Abierto', value: 'abierto' },
              { label: 'Cerrado', value: 'cerrado' },
            ].map(e => (
              <button
                key={e.value}
                className={`inc-estado-btn${estadoFilter === e.value ? ' active' : ''}`}
                onClick={() => setEstadoFilter(e.value)}
              >
                {e.label}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="inc-filter-pills inc-filter-pills-clasif">
          {TIPO_INCIDENTE_FILTERS.map(f => (
            <button
              key={f.value}
              className={`inc-pill inc-pill-sm${tipoIncidenteFilter === f.value ? ' active' : ''}`}
              onClick={() => setTipoIncidenteFilter(tipoIncidenteFilter === f.value ? null : f.value)}
            >
              {f.label}
            </button>
          ))}
          <span className="inc-filter-divider" />
          {CLASIFICACION_FILTERS.map(f => (
            <button
              key={f.value}
              className={`inc-pill inc-pill-sm${clasificacionFilter === f.value ? ' active' : ''}`}
              onClick={() => setClasificacionFilter(clasificacionFilter === f.value ? null : f.value)}
              style={clasificacionFilter === f.value ? { borderColor: f.color, color: f.color, background: `${f.color}18` } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="inc-table-wrapper">
        <table className="inc-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Nro.</th>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Gerencia</th>
              <th>Emisor</th>
              <th>Progreso</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : incidentes.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="inc-empty">
                    <div className="inc-empty-icon">
                      <AlertCircle size={26} />
                    </div>
                    <p>No hay incidentes registrados</p>
                    <span>
                      {estadoFilter !== 'todos'
                        ? 'Intenta cambiar los filtros aplicados'
                        : 'Registrá el primer incidente con el botón "Nuevo Incidente"'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              incidentes.map(h => {
                const paso = h.paso_actual || 1;
                const pct = Math.round((paso / PASOS.length) * 100);
                return (
                  <tr key={h.id} onClick={() => navigate(`/sgi/incidentes/${h.id}`)}>
                    <td>
                      <span className={`inc-tipo-badge ${h.tipo?.replace(' ', '-')}`}>{h.tipo}</span>
                    </td>
                    <td>
                      <span className="inc-numero">{h.numero || '—'}</span>
                    </td>
                    <td>
                      <span className="inc-fecha">{formatDate(h.fecha)}</span>
                    </td>
                    <td>
                      <span className="inc-desc">{h.descripcion || '—'}</span>
                    </td>
                    <td>
                      <span className="inc-gerencia">{h.gerencia || '—'}</span>
                    </td>
                    <td>
                      <span className="inc-emisor">{h.emisor_nombre || '—'}</span>
                    </td>
                    <td>
                      <div className="inc-paso-cell">
                        <div className="inc-paso-label">Paso {paso}/{PASOS.length}</div>
                        <div className="inc-paso-bar-bg">
                          <div className="inc-paso-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`inc-estado-badge ${h.estado}`}>{h.estado}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
