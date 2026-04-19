import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, AlertCircle } from 'lucide-react';
import { fetchNcHallazgosAbiertos, fetchNcGerencias, fetchNcHallazgos } from '../../../services/sgiService';
import './NoConformidades.css';

const PASOS = [
  { paso: 1, label: 'Registrar el Hallazgo' },
  { paso: 2, label: 'Designar el equipo de Análisis' },
  { paso: 3, label: 'Análisis de Causa Raíz' },
  { paso: 4, label: 'Plan de Trabajo' },
  { paso: 5, label: 'Verificar la Eficacia' },
];

const TIPO_FILTERS = [
  { label: 'Todos', value: null },
  { label: 'NC',         value: 'NC',         color: '#E71D36' },
  { label: 'OBS',        value: 'OBS',        color: '#F59E0B' },
  { label: 'OM',         value: 'OM',         color: '#3B82F6' },
  { label: 'Fortaleza',  value: 'Fortaleza',  color: '#10B981' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function SkeletonRow() {
  return (
    <tr className="nc-skeleton-row">
      {[60, 80, 90, 220, 130, 100, 80, 80].map((w, i) => (
        <td key={i}>
          <div className="nc-skeleton-cell" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

export default function NoConformidades() {
  const navigate = useNavigate();
  const [hallazgos, setHallazgos] = useState([]);
  const [allAbiertos, setAllAbiertos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState(null);
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [pasoFilter, setPasoFilter] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [gerenciaFilter, setGerenciaFilter] = useState('');
  const [gerencias, setGerencias] = useState([]);

  // Fetch para el resumen: siempre todos los abiertos, sin filtros
  useEffect(() => {
    fetchNcHallazgosAbiertos().then(({ data }) => setAllAbiertos(data));
  }, []);

  // Fetch gerencias disponibles
  useEffect(() => {
    fetchNcGerencias().then(({ data }) => setGerencias(data));
  }, []);

  const fetchHallazgos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchNcHallazgos({
        tipo: tipoFilter,
        estado: estadoFilter,
        fechaDesde,
        fechaHasta,
        paso: pasoFilter,
        gerencia: gerenciaFilter,
      });
      if (error) throw error;
      setHallazgos(data);
    } catch (err) {
      console.error('Error fetching hallazgos:', err);
    } finally {
      setLoading(false);
    }
  }, [tipoFilter, estadoFilter, fechaDesde, fechaHasta, pasoFilter, gerenciaFilter]);

  useEffect(() => {
    fetchHallazgos();
  }, [fetchHallazgos]);

  // Contar sobre todos los abiertos, independiente de filtros
  const countByPaso = PASOS.map(({ paso }) =>
    allAbiertos.filter(h => (h.paso_actual || 1) === paso).length
  );
  const totalAbiertos = allAbiertos.length;

  return (
    <div className="nc-container">
      {/* Header */}
      <div className="nc-page-header">
        <div className="nc-header-icon">
          <ClipboardList size={24} />
        </div>
        <div className="nc-header-text">
          <h2>No Conformidades</h2>
          <p>Gestión de hallazgos, observaciones y mejoras del SGI</p>
        </div>
        <div className="nc-header-actions">
          <button className="nc-btn-primary" onClick={() => navigate('/sgi/nc/nuevo')}>
            <Plus size={16} />
            Nueva NC
          </button>
        </div>
      </div>

      {/* Resumen por paso */}
      <div className="nc-paso-summary">
        <div
          className={`nc-paso-summary-card nc-paso-total${pasoFilter === null ? ' nc-paso-active' : ''}`}
          onClick={() => { setPasoFilter(null); setEstadoFilter('todos'); }}
        >
          <div className="nc-paso-summary-badge nc-paso-total-badge">∑</div>
          <span className="nc-paso-summary-count">{totalAbiertos}</span>
          <span className="nc-paso-summary-label">Total abiertos</span>
        </div>
        {PASOS.map(({ paso, label }, i) => (
          <div
            key={paso}
            className={`nc-paso-summary-card${pasoFilter === paso ? ' nc-paso-active' : ''}${countByPaso[i] === 0 ? ' nc-paso-empty' : ''}`}
            onClick={() => { setPasoFilter(pasoFilter === paso ? null : paso); setEstadoFilter('abierto'); }}
          >
            <div className="nc-paso-summary-badge">{paso}</div>
            <span className="nc-paso-summary-count">{countByPaso[i]}</span>
            <span className="nc-paso-summary-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="nc-toolbar">
        {/* Tipo filter pills */}
        <div className="nc-filter-pills">
          {TIPO_FILTERS.map(f => (
            <button
              key={f.label}
              className={`nc-pill${tipoFilter === f.value ? ' active' : ''}`}
              onClick={() => setTipoFilter(f.value)}
            >
              {f.color && <span className="nc-pill-dot" style={{ background: f.color }} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Right-side controls */}
        <div className="nc-toolbar-right">
          {/* Rango de fechas */}
          <div className="nc-daterange">
            <input
              type="date"
              className="nc-daterange-input"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              title="Desde"
            />
            <span className="nc-daterange-sep">→</span>
            <input
              type="date"
              className="nc-daterange-input"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              title="Hasta"
            />
            {(fechaDesde || fechaHasta) && (
              <button className="nc-filter-clear" onClick={() => { setFechaDesde(''); setFechaHasta(''); }} title="Limpiar fechas">✕</button>
            )}
          </div>

          {/* Gerencia */}
          <div className="nc-select-wrap">
            <select
              className="nc-filter-select"
              value={gerenciaFilter}
              onChange={e => setGerenciaFilter(e.target.value)}
            >
              <option value="">Todas las gerencias</option>
              {gerencias.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {gerenciaFilter && (
              <button className="nc-filter-clear" onClick={() => setGerenciaFilter('')} title="Limpiar gerencia">✕</button>
            )}
          </div>

          {/* Estado */}
          <div className="nc-estado-toggle">
            {[
              { label: 'Todos',   value: 'todos' },
              { label: 'Abierto', value: 'abierto' },
              { label: 'Cerrado', value: 'cerrado' },
            ].map(e => (
              <button
                key={e.value}
                className={`nc-estado-btn${estadoFilter === e.value ? ' active' : ''}`}
                onClick={() => setEstadoFilter(e.value)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="nc-table-wrapper">
        <table className="nc-table">
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
            ) : hallazgos.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="nc-empty">
                    <div className="nc-empty-icon">
                      <AlertCircle size={26} />
                    </div>
                    <p>No hay hallazgos registrados</p>
                    <span>
                      {tipoFilter || estadoFilter !== 'todos'
                        ? 'Intenta cambiar los filtros aplicados'
                        : 'Crea el primer hallazgo con el botón "Nueva NC"'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              hallazgos.map(h => {
                const paso = h.paso_actual || 1;
                const pct = Math.round((paso / 5) * 100);
                return (
                  <tr key={h.id} onClick={() => navigate(`/sgi/nc/${h.id}`)}>
                    <td>
                      <span className={`nc-tipo-badge ${h.tipo}`}>{h.tipo}</span>
                    </td>
                    <td>
                      <span className="nc-numero">{h.numero || '—'}</span>
                    </td>
                    <td>
                      <span className="nc-fecha">{formatDate(h.fecha)}</span>
                    </td>
                    <td>
                      <span className="nc-desc">{h.descripcion || '—'}</span>
                    </td>
                    <td>
                      <span className="nc-gerencia">{h.gerencia || '—'}</span>
                    </td>
                    <td>
                      <span className="nc-emisor">{h.emisor?.full_name || '—'}</span>
                    </td>
                    <td>
                      <div className="nc-paso-cell">
                        <div className="nc-paso-label">Paso {paso}/5</div>
                        <div className="nc-paso-bar-bg">
                          <div className="nc-paso-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`nc-estado-badge ${h.estado || 'abierto'}`}>
                        {h.estado === 'cerrado' ? 'Cerrado' : 'Abierto'}
                      </span>
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
