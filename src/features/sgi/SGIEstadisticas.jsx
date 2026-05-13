import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  BarChart2, FileText, AlertCircle, CheckCircle, Clock, TrendingUp, RefreshCw,
  ClipboardList, FolderOpen, Filter, X, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchSgiEstadisticasData } from '../../services/sgiService';
import './SGIEstadisticas.css';

// ── Paleta ────────────────────────────────────────────────────────────────────
const COLORS = {
  abierto: '#F59E0B',
  cerrado: '#10B981',
};
const PIE_PALETTE = ['#F2DC00', '#1A1A1A', '#3B82F6', '#10B981', '#E71D36', '#F59E0B', '#8B5CF6', '#EC4899'];

// ── Tooltip personalizado ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="sgi-stat-tooltip">
      {label && <p className="sgi-stat-tooltip-label">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="sgi-stat-card">
      <div className="sgi-stat-card-icon" style={{ background: color + '18', color }}>
        <Icon size={22} />
      </div>
      <div className="sgi-stat-card-body">
        <span className="sgi-stat-card-value">{value ?? '—'}</span>
        <span className="sgi-stat-card-label">{label}</span>
        {sub && <span className="sgi-stat-card-sub">{sub}</span>}
      </div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, color, title, description }) {
  return (
    <div className="sgi-stat-section-header">
      <div className="sgi-stat-section-icon" style={{ background: color + '18', color }}>
        <Icon size={18} />
      </div>
      <div>
        <h3 className="sgi-stat-section-title">{title}</h3>
        {description && <p className="sgi-stat-section-desc">{description}</p>}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ChartSkeleton({ height = 260 }) {
  return <div className="sgi-stat-skeleton" style={{ height }} />;
}

// ── Component principal ───────────────────────────────────────────────────────
export default function SGIEstadisticas() {
  const [tabActiva, setTabActiva] = useState('nc');
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [hallazgos, setHallazgos] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [accionesInc, setAccionesInc] = useState([]);
  const [incidentes, setIncidentes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Filtros Incidentes ────────────────────────────────────────────────────────
  const [filtroIncEstado, setFiltroIncEstado]         = useState('');
  const [filtroIncTipo, setFiltroIncTipo]             = useState('');
  const [filtroIncClasif, setFiltroIncClasif]         = useState('');
  const [filtroIncGerencia, setFiltroIncGerencia]     = useState('');
  const [filtroIncAnio, setFiltroIncAnio]             = useState('');

  // ── Filtros NC ────────────────────────────────────────────────────────────────
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroGerencia, setFiltroGerencia] = useState('');
  const [filtroModo, setFiltroModo] = useState('periodo'); // 'periodo' | 'rango'
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { documentos, hallazgos, acciones, categorias, accionesInc, incidentes } = await fetchSgiEstadisticasData();
      setDocs(documentos);
      setHallazgos(hallazgos);
      setAcciones(acciones);
      setAccionesInc(accionesInc);
      setIncidentes(incidentes);
      setCategorias(categorias);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Derivaciones ─────────────────────────────────────────────────────────────

  // Opciones únicas para los selects de filtro
  const gerenciasUnicas = useMemo(() =>
    [...new Set(hallazgos.map(h => h.gerencia).filter(Boolean))].sort(),
    [hallazgos]
  );
  const aniosUnicos = useMemo(() => {
    const set = new Set(hallazgos.map(h => (h.fecha || h.created_at || '').slice(0, 4)).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [hallazgos]);

  // Hallazgos filtrados
  const hallazgosFiltrados = useMemo(() => {
    return hallazgos.filter(h => {
      if (filtroTipo && h.tipo !== filtroTipo) return false;
      if (filtroEstado && h.estado !== filtroEstado) return false;
      if (filtroGerencia && h.gerencia !== filtroGerencia) return false;
      const fecha = (h.fecha || h.created_at || '').slice(0, 10);
      if (filtroModo === 'periodo') {
        if (filtroAnio && !fecha.startsWith(filtroAnio)) return false;
        if (filtroMes && filtroAnio && fecha !== `${filtroAnio}-${filtroMes}`.slice(0, 7) &&
            !fecha.startsWith(`${filtroAnio}-${filtroMes}`)) return false;
      } else {
        if (filtroDesde && fecha < filtroDesde) return false;
        if (filtroHasta && fecha > filtroHasta) return false;
      }
      return true;
    });
  }, [hallazgos, filtroTipo, filtroEstado, filtroGerencia, filtroModo, filtroAnio, filtroMes, filtroDesde, filtroHasta]);

  const hayFiltrosActivos = filtroTipo || filtroEstado || filtroGerencia ||
    (filtroModo === 'periodo' ? (filtroAnio || filtroMes) : (filtroDesde || filtroHasta));

  const limpiarFiltros = () => {
    setFiltroTipo(''); setFiltroEstado(''); setFiltroGerencia('');
    setFiltroAnio(''); setFiltroMes(''); setFiltroDesde(''); setFiltroHasta('');
  };

  const totalDocs = docs.length;
  const totalNC = hallazgosFiltrados.length;
  const abiertas = hallazgosFiltrados.filter(h => h.estado === 'abierto').length;
  const cerradas = hallazgosFiltrados.filter(h => h.estado === 'cerrado').length;
  const accionesAbiertas = acciones.filter(a => a.estado !== 'cerrada').length;
  const accionesCerradas = acciones.filter(a => a.estado === 'cerrada').length;

  const tiposDoc = Object.entries(
    docs.reduce((acc, d) => {
      const t = d.tipo_documento || 'Sin tipo';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const catMap = Object.fromEntries(categorias.map(c => [c.id, c]));
  const docsPorCat = Object.entries(
    docs.reduce((acc, d) => {
      const cat = catMap[d.categoria_id];
      const name = cat ? cat.nombre : 'Sin categoría';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const ncPorTipo = ['NC', 'OBS', 'OM', 'Fortaleza'].map(tipo => ({
    name: tipo,
    Abiertos: hallazgosFiltrados.filter(h => h.tipo === tipo && h.estado === 'abierto').length,
    Cerrados: hallazgosFiltrados.filter(h => h.tipo === tipo && h.estado === 'cerrado').length,
  }));

  const ncPorGerencia = Object.entries(
    hallazgosFiltrados.reduce((acc, h) => {
      const g = h.gerencia || 'Sin área';
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const estadoPie = [
    { name: 'Abiertos', value: abiertas, color: COLORS.abierto },
    { name: 'Cerrados', value: cerradas, color: COLORS.cerrado },
  ].filter(d => d.value > 0);

  const accionesPie = [
    { name: 'Pendiente',  value: acciones.filter(a => a.estado === 'pendiente').length,  color: '#F59E0B' },
    { name: 'En proceso', value: acciones.filter(a => a.estado === 'en_proceso').length, color: '#3B82F6' },
    { name: 'Cerrada',    value: acciones.filter(a => a.estado === 'cerrada').length,    color: '#10B981' },
  ].filter(d => d.value > 0);

  const porPaso = [1, 2, 3, 4, 5].map(p => ({
    name: `Paso ${p}`,
    value: hallazgosFiltrados.filter(h => h.estado === 'abierto' && h.paso_actual === p).length,
  }));

  const evolucion = (() => {
    // Si hay filtro de periodo/rango, adaptamos el eje temporal
    const meses = [];
    if (filtroModo === 'periodo' && filtroAnio && filtroMes) {
      // Un solo mes — mostramos semanas
      const anio = parseInt(filtroAnio);
      const mes = parseInt(filtroMes) - 1;
      const diasEnMes = new Date(anio, mes + 1, 0).getDate();
      for (let sem = 1; sem <= 5; sem++) {
        const desde = (sem - 1) * 7 + 1;
        const hasta = Math.min(sem * 7, diasEnMes);
        if (desde > diasEnMes) break;
        const count = hallazgosFiltrados.filter(h => {
          const d = new Date((h.fecha || h.created_at || '').slice(0, 10));
          return d.getFullYear() === anio && d.getMonth() === mes &&
            d.getDate() >= desde && d.getDate() <= hasta;
        }).length;
        meses.push({ name: `Sem ${sem}`, Hallazgos: count });
      }
    } else if (filtroModo === 'periodo' && filtroAnio && !filtroMes) {
      // Año completo — mostramos 12 meses
      for (let m = 0; m < 12; m++) {
        const key = `${filtroAnio}-${String(m + 1).padStart(2, '0')}`;
        const label = new Date(parseInt(filtroAnio), m, 1).toLocaleDateString('es-AR', { month: 'short' });
        const count = hallazgosFiltrados.filter(h => (h.fecha || h.created_at || '').startsWith(key)).length;
        meses.push({ name: label, Hallazgos: count });
      }
    } else {
      // Default: últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        const count = hallazgosFiltrados.filter(h => (h.fecha || h.created_at || '').startsWith(key)).length;
        meses.push({ name: label, Hallazgos: count });
      }
    }
    return meses;
  })();

  const avgAvance = acciones.length
    ? Math.round(acciones.reduce((s, a) => s + (a.avance || 0), 0) / acciones.length)
    : 0;
  const radialData = [{ name: 'Avance', value: avgAvance, fill: '#3B82F6' }];

  // ── Derivaciones Incidentes ───────────────────────────────────────────────────
  const incidentesFiltrados = useMemo(() => incidentes.filter(h => {
    if (filtroIncEstado  && h.estado        !== filtroIncEstado)  return false;
    if (filtroIncTipo    && h.tipo_incidente !== filtroIncTipo)    return false;
    if (filtroIncClasif  && h.clasificacion  !== filtroIncClasif)  return false;
    if (filtroIncGerencia && h.gerencia      !== filtroIncGerencia) return false;
    if (filtroIncAnio    && !(h.fecha || h.created_at || '').startsWith(filtroIncAnio)) return false;
    return true;
  }), [incidentes, filtroIncEstado, filtroIncTipo, filtroIncClasif, filtroIncGerencia, filtroIncAnio]);

  const gerenciasInc = useMemo(() =>
    [...new Set(incidentes.map(h => h.gerencia).filter(Boolean))].sort(), [incidentes]);
  const aniosInc = useMemo(() => {
    const set = new Set(incidentes.map(h => (h.fecha || h.created_at || '').slice(0, 4)).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [incidentes]);

  const incPorTipoChart = ['Personal', 'Vehicular', 'Ambiental', 'Industrial'].map(t => ({
    name: t,
    Abiertos: incidentesFiltrados.filter(h => h.tipo_incidente === t && h.estado === 'abierto').length,
    Cerrados: incidentesFiltrados.filter(h => h.tipo_incidente === t && h.estado === 'cerrado').length,
  }));

  const CLASIF_COLORS_MAP = { Ninguna:'#6B7280', Menor:'#10B981', Relevante:'#F59E0B', Crítica:'#E71D36', Mayor:'#8B5CF6' };
  const incPorClasif = ['Ninguna','Menor','Relevante','Crítica','Mayor'].map(c => ({
    name: c, value: incidentesFiltrados.filter(h => (h.clasificacion || 'Ninguna') === c).length, color: CLASIF_COLORS_MAP[c],
  })).filter(d => d.value > 0);

  const incPorGerencia = Object.entries(
    incidentesFiltrados.reduce((acc, h) => { const g = h.gerencia || 'Sin área'; acc[g] = (acc[g]||0)+1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8);

  const incEstadoPie = [
    { name: 'Abiertos', value: incidentesFiltrados.filter(h => h.estado === 'abierto').length,  color: COLORS.abierto },
    { name: 'Cerrados', value: incidentesFiltrados.filter(h => h.estado === 'cerrado').length, color: COLORS.cerrado },
  ].filter(d => d.value > 0);

  const incEvolucion = (() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i, 1);
      const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('es-AR', { month:'short', year:'2-digit' });
      meses.push({ name: label, Incidentes: incidentesFiltrados.filter(h => (h.fecha||h.created_at||'').startsWith(key)).length });
    }
    return meses;
  })();

  const incPorPaso = [1,2,3,4,5,6].map(p => ({
    name: `Paso ${p}`, value: incidentesFiltrados.filter(h => h.estado === 'abierto' && h.paso_actual === p).length,
  }));

  return (
    <div className="sgi-container">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #111827 0%, #1e3a5f 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decoración de fondo */}
        <div style={{ position:'absolute', right:-40, top:-40, width:200, height:200, borderRadius:'50%', background:'rgba(242,220,0,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:60, bottom:-60, width:140, height:140, borderRadius:'50%', background:'rgba(59,130,246,0.08)', pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ background:'#f2dc00', borderRadius:12, width:48, height:48, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BarChart2 size={24} color="#111827" />
          </div>
          <div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:'#fff', letterSpacing:-0.5 }}>Estadísticas SGI</h2>
            <p style={{ margin:'3px 0 0', fontSize:13, color:'rgba(255,255,255,0.55)' }}>Panel de control · Sistema de Gestión Integrado</p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
          {[
            { label: 'Hallazgos NC', value: hallazgos.length, color: '#f2dc00' },
            { label: 'Incidentes',   value: incidentes.length, color: '#a78bfa' },
            { label: 'Docs. activos', value: docs.length,      color: '#60a5fa' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:26, fontWeight:900, color, lineHeight:1 }}>{loading ? '—' : value}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{label}</div>
            </div>
          ))}
          <div style={{ width:1, height:36, background:'rgba(255,255,255,0.12)' }} />
          <button onClick={fetchAll} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:500 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' })}` : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TABS — NC / DOCUMENTOS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sgi-tabs-bar">
        <button
          className={`sgi-tab-btn${tabActiva === 'nc' ? ' active' : ''}`}
          onClick={() => setTabActiva('nc')}
        >
          <ClipboardList size={16} />
          No Conformidades
        </button>
        <button
          className={`sgi-tab-btn${tabActiva === 'docs' ? ' active' : ''}`}
          onClick={() => setTabActiva('docs')}
        >
          <FolderOpen size={16} />
          Documentación SGI
        </button>
        <button
          className={`sgi-tab-btn${tabActiva === 'incidentes' ? ' active' : ''}`}
          onClick={() => setTabActiva('incidentes')}
        >
          <AlertCircle size={16} />
          Incidentes
        </button>
        <button
          className={`sgi-tab-btn${tabActiva === 'acciones' ? ' active' : ''}`}
          onClick={() => setTabActiva('acciones')}
        >
          <TrendingUp size={16} />
          Acciones
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 2 — NO CONFORMIDADES
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sgi-stat-section" style={{ display: tabActiva === 'nc' ? undefined : 'none' }}>
        <SectionHeader
          icon={ClipboardList}
          color="#E71D36"
          title="No Conformidades"
          description="Hallazgos, estados, tipos y distribución por área"
        />

        {/* ── Filtros ── */}
        <div className="sgi-nc-filtros">
          <div className="sgi-nc-filtros-row">
            <div className="sgi-nc-filtro-group">
              <label>Tipo</label>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="">Todos</option>
                {['NC', 'OBS', 'OM', 'Fortaleza'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sgi-nc-filtro-group">
              <label>Estado</label>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="abierto">Abierto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div className="sgi-nc-filtro-group">
              <label>Área / Gerencia</label>
              <select value={filtroGerencia} onChange={e => setFiltroGerencia(e.target.value)}>
                <option value="">Todas</option>
                {gerenciasUnicas.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="sgi-nc-filtro-group sgi-nc-filtro-group--modo">
              <label>Período</label>
              <div className="sgi-nc-modo-toggle">
                <button className={filtroModo === 'periodo' ? 'active' : ''} onClick={() => setFiltroModo('periodo')}>Mes / Año</button>
                <button className={filtroModo === 'rango' ? 'active' : ''} onClick={() => setFiltroModo('rango')}>Rango</button>
              </div>
            </div>
            {filtroModo === 'periodo' ? (
              <>
                <div className="sgi-nc-filtro-group">
                  <label>Año</label>
                  <select value={filtroAnio} onChange={e => { setFiltroAnio(e.target.value); setFiltroMes(''); }}>
                    <option value="">Todos</option>
                    {aniosUnicos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="sgi-nc-filtro-group">
                  <label>Mes</label>
                  <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} disabled={!filtroAnio}>
                    <option value="">Todos</option>
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                      <option key={m} value={m}>
                        {new Date(2000, i, 1).toLocaleDateString('es-AR', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="sgi-nc-filtro-group">
                  <label>Desde</label>
                  <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
                </div>
                <div className="sgi-nc-filtro-group">
                  <label>Hasta</label>
                  <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
                </div>
              </>
            )}
            {hayFiltrosActivos && (
              <button className="sgi-nc-filtro-clear" onClick={limpiarFiltros} title="Limpiar filtros">
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
          {hayFiltrosActivos && (
            <p className="sgi-nc-filtros-result">
              <Filter size={12} /> Mostrando <strong>{totalNC}</strong> hallazgo{totalNC !== 1 ? 's' : ''} con los filtros aplicados
            </p>
          )}
        </div>

        {/* Fila 2a: Evolución mensual + Estado (pie) */}
        <div className="sgi-stat-row">
          <div className="sgi-stat-panel sgi-stat-panel--wide">
            <h3 className="sgi-stat-panel-title">Evolución mensual de hallazgos</h3>
            <p className="sgi-stat-panel-sub">Últimos 6 meses</p>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={evolucion} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Hallazgos" stroke="#E71D36" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#E71D36' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="sgi-stat-panel">
            <h3 className="sgi-stat-panel-title">Estado general</h3>
            <p className="sgi-stat-panel-sub">Abiertos vs cerrados</p>
            {loading ? <ChartSkeleton height={200} /> : estadoPie.length === 0 ? (
              <div className="sgi-stat-empty">Sin datos</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={estadoPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                      paddingAngle={3} dataKey="value" animationDuration={700}>
                      {estadoPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="sgi-stat-legend">
                  {estadoPie.map(e => (
                    <span key={e.name} className="sgi-stat-legend-item">
                      <span className="sgi-stat-legend-dot" style={{ background: e.color }} />
                      {e.name}: <strong>{e.value}</strong>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fila 2b: Por tipo (stacked) + Por paso */}
        <div className="sgi-stat-row">
          <div className="sgi-stat-panel sgi-stat-panel--wide">
            <h3 className="sgi-stat-panel-title">Hallazgos por tipo</h3>
            <p className="sgi-stat-panel-sub">NC · OBS · OM · Fortaleza — abiertos y cerrados</p>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={ncPorTipo} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Abiertos" stackId="a" fill={COLORS.abierto} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Cerrados" stackId="a" fill={COLORS.cerrado} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="sgi-stat-panel">
            <h3 className="sgi-stat-panel-title">NC abiertas por paso</h3>
            <p className="sgi-stat-panel-sub">Dónde están las NC en el flujo de trabajo</p>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={porPaso} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Hallazgos" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fila 2c: Por gerencia + Acciones correctivas */}
        <div className="sgi-stat-row">
          <div className="sgi-stat-panel sgi-stat-panel--wide">
            <h3 className="sgi-stat-panel-title">Hallazgos por gerencia / área</h3>
            <p className="sgi-stat-panel-sub">Top 8 áreas con mayor cantidad de hallazgos</p>
            {loading ? <ChartSkeleton /> : ncPorGerencia.length === 0 ? (
              <div className="sgi-stat-empty">Sin datos de gerencia registrados</div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={ncPorGerencia} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Hallazgos" radius={[0, 4, 4, 0]}>
                    {ncPorGerencia.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="sgi-stat-panel">
            <h3 className="sgi-stat-panel-title">Acciones correctivas</h3>
            <p className="sgi-stat-panel-sub">Estado y avance promedio</p>
            {loading ? <ChartSkeleton height={200} /> : accionesPie.length === 0 ? (
              <div className="sgi-stat-empty">Sin acciones registradas</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={accionesPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                      paddingAngle={3} dataKey="value" animationDuration={700}>
                      {accionesPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="sgi-stat-legend">
                  {accionesPie.map(e => (
                    <span key={e.name} className="sgi-stat-legend-item">
                      <span className="sgi-stat-legend-dot" style={{ background: e.color }} />
                      {e.name}: <strong>{e.value}</strong>
                    </span>
                  ))}
                </div>
              </>
            )}

            {!loading && acciones.length > 0 && (
              <div className="sgi-stat-avance">
                <p className="sgi-stat-avance-label">Avance promedio de acciones</p>
                <div className="sgi-stat-avance-row">
                  <ResponsiveContainer width={100} height={100}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={48}
                      data={radialData} startAngle={90} endAngle={90 - 360 * (avgAvance / 100)}>
                      <RadialBar dataKey="value" cornerRadius={6} fill="#3B82F6"
                        background={{ fill: 'var(--border-color)' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <span className="sgi-stat-avance-pct">{avgAvance}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN — INCIDENTES
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sgi-stat-section" style={{ display: tabActiva === 'incidentes' ? undefined : 'none' }}>
        <SectionHeader icon={AlertCircle} color="#8B5CF6" title="Incidentes" description="Accidentes, incidentes y casi accidentes — estados, tipos, criticidad y distribución por área" />

        {/* Filtros */}
        <div className="sgi-nc-filtros">
          <div className="sgi-nc-filtros-row">
            <div className="sgi-nc-filtro-group">
              <label>Estado</label>
              <select value={filtroIncEstado} onChange={e => setFiltroIncEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="abierto">Abierto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div className="sgi-nc-filtro-group">
              <label>Tipo</label>
              <select value={filtroIncTipo} onChange={e => setFiltroIncTipo(e.target.value)}>
                <option value="">Todos</option>
                {['Personal','Vehicular','Ambiental','Industrial'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sgi-nc-filtro-group">
              <label>Criticidad</label>
              <select value={filtroIncClasif} onChange={e => setFiltroIncClasif(e.target.value)}>
                <option value="">Todas</option>
                {['Ninguna','Menor','Relevante','Crítica','Mayor'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sgi-nc-filtro-group">
              <label>Gerencia</label>
              <select value={filtroIncGerencia} onChange={e => setFiltroIncGerencia(e.target.value)}>
                <option value="">Todas</option>
                {gerenciasInc.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="sgi-nc-filtro-group">
              <label>Año</label>
              <select value={filtroIncAnio} onChange={e => setFiltroIncAnio(e.target.value)}>
                <option value="">Todos</option>
                {aniosInc.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {(filtroIncEstado||filtroIncTipo||filtroIncClasif||filtroIncGerencia||filtroIncAnio) && (
              <button className="sgi-nc-filtro-clear" onClick={() => { setFiltroIncEstado(''); setFiltroIncTipo(''); setFiltroIncClasif(''); setFiltroIncGerencia(''); setFiltroIncAnio(''); }}>
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="sgi-stat-kpis">
          <StatCard icon={AlertCircle} label="Total incidentes"  value={loading ? null : incidentesFiltrados.length} color="#8B5CF6" />
          <StatCard icon={Clock}       label="Abiertos"          value={loading ? null : incidentesFiltrados.filter(h=>h.estado==='abierto').length}  color="#F59E0B"
            sub={incidentesFiltrados.length ? `${Math.round(incidentesFiltrados.filter(h=>h.estado==='abierto').length/incidentesFiltrados.length*100)}% del total` : null} />
          <StatCard icon={CheckCircle} label="Cerrados"          value={loading ? null : incidentesFiltrados.filter(h=>h.estado==='cerrado').length} color="#10B981" />
          <StatCard icon={AlertCircle} label="Críticos"          value={loading ? null : incidentesFiltrados.filter(h=>h.clasificacion==='Crítica').length}  color="#E71D36" />
          <StatCard icon={TrendingUp}  label="Rectificativas"    value={loading ? null : accionesInc.filter(a=>a.tipo==='rectificativa').length} color="#3B82F6" />
        </div>

        {/* Evolución + Estado */}
        <div className="sgi-stat-row">
          <div className="sgi-stat-panel sgi-stat-panel--wide">
            <h3 className="sgi-stat-panel-title">Evolución mensual</h3>
            <p className="sgi-stat-panel-sub">Últimos 6 meses</p>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={incEvolucion} margin={{ top:10, right:20, bottom:0, left:-10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize:12, fill:'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Incidentes" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r:4, fill:'#8B5CF6' }} activeDot={{ r:6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="sgi-stat-panel">
            <h3 className="sgi-stat-panel-title">Estado general</h3>
            <p className="sgi-stat-panel-sub">Abiertos vs cerrados</p>
            {loading ? <ChartSkeleton height={200} /> : incEstadoPie.length === 0 ? <div className="sgi-stat-empty">Sin datos</div> : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={incEstadoPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" animationDuration={700}>
                      {incEstadoPie.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="sgi-stat-legend">
                  {incEstadoPie.map(e => <span key={e.name} className="sgi-stat-legend-item"><span className="sgi-stat-legend-dot" style={{ background:e.color }} />{e.name}: <strong>{e.value}</strong></span>)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Por tipo + Por criticidad */}
        <div className="sgi-stat-row">
          <div className="sgi-stat-panel sgi-stat-panel--wide">
            <h3 className="sgi-stat-panel-title">Por tipo de incidente</h3>
            <p className="sgi-stat-panel-sub">Personal · Vehicular · Ambiental · Industrial</p>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={incPorTipoChart} margin={{ top:10, right:20, bottom:0, left:-10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize:12, fill:'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:12 }} />
                  <Bar dataKey="Abiertos" stackId="a" fill={COLORS.abierto} radius={[0,0,4,4]} />
                  <Bar dataKey="Cerrados" stackId="a" fill={COLORS.cerrado} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="sgi-stat-panel">
            <h3 className="sgi-stat-panel-title">Por criticidad</h3>
            <p className="sgi-stat-panel-sub">Ninguna · Menor · Relevante · Crítica · Mayor</p>
            {loading ? <ChartSkeleton height={200} /> : incPorClasif.length === 0 ? <div className="sgi-stat-empty">Sin datos</div> : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={incPorClasif} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" animationDuration={700}>
                      {incPorClasif.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="sgi-stat-legend">
                  {incPorClasif.map(e => <span key={e.name} className="sgi-stat-legend-item"><span className="sgi-stat-legend-dot" style={{ background:e.color }} />{e.name}: <strong>{e.value}</strong></span>)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Por gerencia + Por paso */}
        <div className="sgi-stat-row">
          <div className="sgi-stat-panel sgi-stat-panel--wide">
            <h3 className="sgi-stat-panel-title">Por gerencia / área</h3>
            <p className="sgi-stat-panel-sub">Top 8 áreas con mayor cantidad de incidentes</p>
            {loading ? <ChartSkeleton /> : incPorGerencia.length === 0 ? <div className="sgi-stat-empty">Sin datos de gerencia</div> : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={incPorGerencia} layout="vertical" margin={{ top:4, right:20, bottom:4, left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize:12, fill:'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize:11, fill:'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Incidentes" radius={[0,4,4,0]}>
                    {incPorGerencia.map((_,i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="sgi-stat-panel">
            <h3 className="sgi-stat-panel-title">Incidentes abiertos por paso</h3>
            <p className="sgi-stat-panel-sub">Dónde están en el flujo de gestión</p>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={incPorPaso} layout="vertical" margin={{ top:4, right:20, bottom:4, left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize:12, fill:'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="name" width={56} tick={{ fontSize:12, fill:'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Incidentes" fill="#8B5CF6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 3 — DOCUMENTOS SGI
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sgi-stat-section" style={{ display: tabActiva === 'docs' ? undefined : 'none' }}>
        <SectionHeader
          icon={FolderOpen}
          color="#F2DC00"
          title="Documentos SGI"
          description="Distribución del repositorio documental por tipo y categoría"
        />

        {/* KPIs repositorio documental */}
        <div className="sgi-stat-kpis" style={{ maxWidth: 700, margin: '0 auto 24px' }}>
          <StatCard icon={FolderOpen}    label="Carpetas raíz"    value={loading ? '—' : categorias.filter(c => !c.parent_id).length} color="#F2DC00" />
          <StatCard icon={FolderOpen}    label="Subcarpetas"      value={loading ? '—' : categorias.filter(c => c.parent_id).length}  color="#F59E0B" />
          <StatCard icon={ClipboardList} label="Total categorías" value={loading ? '—' : categorias.length}                           color="#3B82F6" />
          <StatCard icon={FileText}      label="Documentos activos" value={loading ? '—' : totalDocs}                                 color="#10B981" />
        </div>

        {/* Desglose por carpeta raíz */}
        {!loading && categorias.length > 0 && (() => {
          const raices = categorias.filter(c => !c.parent_id);
          const subcatMap = categorias.reduce((acc, c) => {
            if (c.parent_id) { acc[c.parent_id] = (acc[c.parent_id] || 0) + 1; }
            return acc;
          }, {});
          const docsMap = docs.reduce((acc, d) => {
            const cat = catMap[d.categoria_id];
            if (!cat) return acc;
            const rootId = cat.parent_id ? cat.parent_id : cat.id;
            acc[rootId] = (acc[rootId] || 0) + 1;
            return acc;
          }, {});
          return (
            <div className="sgi-docs-carpetas">
              {raices.map((r, i) => (
                <div key={r.id} className="sgi-docs-carpeta-card">
                  <div className="sgi-docs-carpeta-color" style={{ background: r.color || PIE_PALETTE[i % PIE_PALETTE.length] }} />
                  <div className="sgi-docs-carpeta-body">
                    <span className="sgi-docs-carpeta-nombre">{r.nombre}</span>
                    <div className="sgi-docs-carpeta-meta">
                      <span>{subcatMap[r.id] || 0} subcarpetas</span>
                      <span>·</span>
                      <span>{docsMap[r.id] || 0} docs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        <div className="sgi-stat-row">
          <div className="sgi-stat-panel">
            <h3 className="sgi-stat-panel-title">Documentos por tipo</h3>
            <p className="sgi-stat-panel-sub">Procedimientos, manuales, instructivos, etc.</p>
            {loading ? <ChartSkeleton height={200} /> : tiposDoc.length === 0 ? (
              <div className="sgi-stat-empty">Sin documentos</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={tiposDoc} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                      paddingAngle={2} dataKey="value" animationDuration={700}>
                      {tiposDoc.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="sgi-stat-legend sgi-stat-legend--wrap">
                  {tiposDoc.map((e, i) => (
                    <span key={e.name} className="sgi-stat-legend-item">
                      <span className="sgi-stat-legend-dot" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                      {e.name}: <strong>{e.value}</strong>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="sgi-stat-panel sgi-stat-panel--wide">
            <h3 className="sgi-stat-panel-title">Documentos por categoría</h3>
            <p className="sgi-stat-panel-sub">Cantidad de documentos en cada carpeta principal</p>
            {loading ? <ChartSkeleton /> : docsPorCat.length === 0 ? (
              <div className="sgi-stat-empty">Sin documentos</div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={docsPorCat} margin={{ top: 10, right: 20, bottom: 30, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    angle={-25} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Documentos" radius={[4, 4, 0, 0]}>
                    {docsPorCat.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN — ACCIONES (NC + Incidentes)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sgi-stat-section" style={{ display: tabActiva === 'acciones' ? undefined : 'none' }}>
        <SectionHeader
          icon={TrendingUp}
          color="#3B82F6"
          title="Acciones Correctivas"
          description="Resumen consolidado de acciones de No Conformidades e Incidentes"
        />

        {(() => {
          const ncTotal      = acciones.length;
          const ncPendientes = acciones.filter(a => a.estado === 'pendiente').length;
          const ncEnProceso  = acciones.filter(a => a.estado === 'en_proceso' || a.estado === 'proceso').length;
          const ncCerradas   = acciones.filter(a => a.estado === 'cerrada').length;

          const incTotal      = accionesInc.length;
          const incPendientes = accionesInc.filter(a => a.estado === 'pendiente').length;
          const incEnProceso  = accionesInc.filter(a => a.estado === 'en_proceso').length;
          const incCerradas   = accionesInc.filter(a => a.estado === 'cerrada').length;
          const incRectif     = accionesInc.filter(a => a.tipo === 'rectificativa').length;

          const totalGeneral  = ncTotal + incTotal;
          const totalCerradas = ncCerradas + incCerradas;
          const pctCierre     = totalGeneral > 0 ? Math.round((totalCerradas / totalGeneral) * 100) : 0;

          const vencidasHoy = new Date().toISOString().split('T')[0];
          const vencidasNC  = acciones.filter(a => a.fecha_vencimiento && a.fecha_vencimiento < vencidasHoy && a.estado !== 'cerrada').length;
          const vencidasInc = accionesInc.filter(a => a.fecha_vencimiento && a.fecha_vencimiento < vencidasHoy && a.estado !== 'cerrada').length;

          const porEstadoData = [
            { name: 'Pendiente',  nc: ncPendientes, inc: incPendientes },
            { name: 'En Proceso', nc: ncEnProceso,  inc: incEnProceso },
            { name: 'Cerrada',    nc: ncCerradas,   inc: incCerradas },
          ];

          return (
            <>
              <div className="sgi-stat-kpis">
                <StatCard icon={TrendingUp}   label="Total acciones"          value={totalGeneral}                 color="#3B82F6" />
                <StatCard icon={ClipboardList} label="Acciones de NC"         value={ncTotal}                      color="#F2DC00" sub={`${ncTotal > 0 ? Math.round(ncCerradas/ncTotal*100) : 0}% cerradas`} />
                <StatCard icon={AlertCircle}  label="Acciones de Incidentes"  value={incTotal}                     color="#8B5CF6" sub={`${incTotal > 0 ? Math.round(incCerradas/incTotal*100) : 0}% cerradas`} />
                <StatCard icon={CheckCircle}  label="Cerradas (total)"        value={totalCerradas}                color="#10B981" sub={`${pctCierre}% de cierre`} />
                <StatCard icon={Clock}        label="Pendientes"              value={ncPendientes + incPendientes} color="#F59E0B" />
                <StatCard icon={AlertCircle}  label="Vencidas"                value={vencidasNC + vencidasInc}     color="#E71D36" />
              </div>

              <div className="sgi-stat-row">
                <div className="sgi-stat-panel">
                  <h3 className="sgi-stat-panel-title">Estado por origen</h3>
                  <p className="sgi-stat-panel-sub">Comparativa NC vs Incidentes</p>
                  {loading ? <ChartSkeleton height={220} /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={porEstadoData} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="nc"  name="No Conformidades" fill="#F2DC00" radius={[4,4,0,0]} />
                        <Bar dataKey="inc" name="Incidentes"        fill="#3B82F6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="sgi-stat-panel">
                  <h3 className="sgi-stat-panel-title">Distribución general</h3>
                  <p className="sgi-stat-panel-sub">Proporción por estado del total de acciones</p>
                  {loading ? <ChartSkeleton height={220} /> : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Cerradas',   value: totalCerradas },
                              { name: 'En Proceso', value: ncEnProceso + incEnProceso },
                              { name: 'Pendientes', value: ncPendientes + incPendientes },
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                            paddingAngle={2} dataKey="value" animationDuration={700}
                          >
                            {['#10B981', '#3B82F6', '#F59E0B'].map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                        {[['#10B981','Cerradas',totalCerradas],['#3B82F6','En Proceso',ncEnProceso+incEnProceso],['#F59E0B','Pendientes',ncPendientes+incPendientes]].map(([c,l,v]) => (
                          <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                            <span style={{ width:10, height:10, borderRadius:'50%', background:c, display:'inline-block' }} />
                            <span style={{ color:'var(--text-muted)' }}>{l}</span>
                            <strong>{v}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="sgi-stat-row">
                <div className="sgi-stat-panel">
                  <h3 className="sgi-stat-panel-title">No Conformidades</h3>
                  <p className="sgi-stat-panel-sub">{ncTotal} acciones · {ncCerradas} cerradas · {vencidasNC} vencidas</p>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginTop:10 }}>
                    <thead><tr style={{ borderBottom:'2px solid var(--border-color)' }}>
                      <th style={{ textAlign:'left',  padding:'6px 8px', color:'var(--text-muted)', fontWeight:600 }}>Estado</th>
                      <th style={{ textAlign:'right', padding:'6px 8px', color:'var(--text-muted)', fontWeight:600 }}>Cantidad</th>
                      <th style={{ textAlign:'right', padding:'6px 8px', color:'var(--text-muted)', fontWeight:600 }}>Avance prom.</th>
                    </tr></thead>
                    <tbody>
                      {[
                        { estado:'pendiente',  label:'Pendiente',  color:'#F59E0B' },
                        { estado:'en_proceso', label:'En Proceso', color:'#3B82F6' },
                        { estado:'cerrada',    label:'Cerrada',    color:'#10B981' },
                      ].map(({ estado, label, color }) => {
                        const rows = acciones.filter(a => a.estado === estado || (estado === 'en_proceso' && a.estado === 'proceso'));
                        const avg  = rows.length > 0 ? Math.round(rows.reduce((s,a) => s+(a.avance||0),0)/rows.length) : 0;
                        return (
                          <tr key={estado} style={{ borderBottom:'1px solid var(--border-color)' }}>
                            <td style={{ padding:'8px' }}><span style={{ background:color+'20', color, borderRadius:4, padding:'2px 8px', fontWeight:600, fontSize:11 }}>{label}</span></td>
                            <td style={{ padding:'8px', textAlign:'right', fontWeight:700 }}>{rows.length}</td>
                            <td style={{ padding:'8px', textAlign:'right', color:'var(--text-muted)' }}>{avg}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="sgi-stat-panel">
                  <h3 className="sgi-stat-panel-title">Incidentes</h3>
                  <p className="sgi-stat-panel-sub">{incTotal} acciones · {incCerradas} cerradas · {incRectif} rectificativas · {vencidasInc} vencidas</p>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginTop:10 }}>
                    <thead><tr style={{ borderBottom:'2px solid var(--border-color)' }}>
                      <th style={{ textAlign:'left',  padding:'6px 8px', color:'var(--text-muted)', fontWeight:600 }}>Estado</th>
                      <th style={{ textAlign:'right', padding:'6px 8px', color:'var(--text-muted)', fontWeight:600 }}>Cantidad</th>
                      <th style={{ textAlign:'right', padding:'6px 8px', color:'var(--text-muted)', fontWeight:600 }}>Avance prom.</th>
                    </tr></thead>
                    <tbody>
                      {[
                        { estado:'pendiente',  label:'Pendiente',  color:'#F59E0B' },
                        { estado:'en_proceso', label:'En Proceso', color:'#3B82F6' },
                        { estado:'cerrada',    label:'Cerrada',    color:'#10B981' },
                      ].map(({ estado, label, color }) => {
                        const rows = accionesInc.filter(a => a.estado === estado);
                        const avg  = rows.length > 0 ? Math.round(rows.reduce((s,a) => s+(a.avance||0),0)/rows.length) : 0;
                        return (
                          <tr key={estado} style={{ borderBottom:'1px solid var(--border-color)' }}>
                            <td style={{ padding:'8px' }}><span style={{ background:color+'20', color, borderRadius:4, padding:'2px 8px', fontWeight:600, fontSize:11 }}>{label}</span></td>
                            <td style={{ padding:'8px', textAlign:'right', fontWeight:700 }}>{rows.length}</td>
                            <td style={{ padding:'8px', textAlign:'right', color:'var(--text-muted)' }}>{avg}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Listado exportable */}
              {(() => {
                const fmt = d => d ? new Date(d).toLocaleDateString('es-AR') : '—';
                const hoy = new Date().toISOString().split('T')[0];

                const filas = [
                  ...acciones.map(a => ({
                    origen:       'No Conformidad',
                    referencia:   a.hallazgo?.numero || '—',
                    gerencia:     a.hallazgo?.gerencia || '—',
                    tipo:         a.hallazgo?.tipo || '—',
                    codigo:       '—',
                    descripcion:  a.descripcion || '—',
                    responsable:  a.responsable?.full_name || '—',
                    estado:       a.estado || '—',
                    avance:       `${a.avance || 0}%`,
                    vencimiento:  fmt(a.fecha_vencimiento),
                    vencida:      a.fecha_vencimiento && a.fecha_vencimiento < hoy && a.estado !== 'cerrada' ? 'Sí' : 'No',
                    rectificativa: '—',
                  })),
                  ...accionesInc.map(a => ({
                    origen:       'Incidente',
                    referencia:   a.incidente?.numero || '—',
                    gerencia:     a.incidente?.gerencia || '—',
                    tipo:         a.incidente?.tipo_incidente || '—',
                    codigo:       a.codigo || '—',
                    descripcion:  a.descripcion || '—',
                    responsable:  a.responsable?.full_name || '—',
                    estado:       a.estado || '—',
                    avance:       `${a.avance || 0}%`,
                    vencimiento:  fmt(a.fecha_vencimiento),
                    vencida:      a.fecha_vencimiento && a.fecha_vencimiento < hoy && a.estado !== 'cerrada' ? 'Sí' : 'No',
                    rectificativa: a.tipo === 'rectificativa' ? 'Sí' : 'No',
                  })),
                ];

                const exportarExcel = () => {
                  const ws = XLSX.utils.json_to_sheet(filas.map(f => ({
                    'Origen':          f.origen,
                    'Referencia':      f.referencia,
                    'Gerencia':        f.gerencia,
                    'Tipo':            f.tipo,
                    'Código':          f.codigo,
                    'Descripción':     f.descripcion,
                    'Responsable':     f.responsable,
                    'Estado':          f.estado,
                    'Avance':          f.avance,
                    'Vencimiento':     f.vencimiento,
                    'Vencida':         f.vencida,
                    'Rectificativa':   f.rectificativa,
                  })));
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Acciones');
                  XLSX.writeFile(wb, `acciones_${new Date().toISOString().split('T')[0]}.xlsx`);
                };

                return (
                  <div className="sgi-stat-panel" style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <h3 className="sgi-stat-panel-title">Listado completo de acciones</h3>
                        <p className="sgi-stat-panel-sub">{filas.length} acciones en total</p>
                      </div>
                      <button onClick={exportarExcel} style={{ display:'flex', alignItems:'center', gap:7, background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                        <Download size={15} /> Exportar Excel
                      </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr style={{ background:'var(--bg-hover)', borderBottom:'2px solid var(--border-color)' }}>
                            {['Origen','Referencia','Gerencia','Código','Descripción','Responsable','Estado','Avance','Vencimiento','Vencida','Rectif.'].map(h => (
                              <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:'var(--text-muted)', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filas.map((f, i) => {
                            const estadoColor = { pendiente:'#F59E0B', en_proceso:'#3B82F6', cerrada:'#10B981', proceso:'#3B82F6' }[f.estado] || '#9ca3af';
                            return (
                              <tr key={i} style={{ borderBottom:'1px solid var(--border-color)', background: i%2===0 ? 'transparent' : 'var(--bg-hover)' }}>
                                <td style={{ padding:'7px 10px' }}><span style={{ fontSize:11, fontWeight:600, color: f.origen==='Incidente' ? '#8B5CF6' : '#d97706' }}>{f.origen}</span></td>
                                <td style={{ padding:'7px 10px', fontWeight:700, color:'var(--text-main)', whiteSpace:'nowrap' }}>{f.referencia}</td>
                                <td style={{ padding:'7px 10px', color:'var(--text-muted)' }}>{f.gerencia}</td>
                                <td style={{ padding:'7px 10px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{f.codigo}</td>
                                <td style={{ padding:'7px 10px', color:'var(--text-main)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={f.descripcion}>{f.descripcion}</td>
                                <td style={{ padding:'7px 10px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{f.responsable}</td>
                                <td style={{ padding:'7px 10px' }}><span style={{ background:estadoColor+'20', color:estadoColor, borderRadius:4, padding:'2px 7px', fontWeight:600, fontSize:11 }}>{f.estado.replace('_',' ')}</span></td>
                                <td style={{ padding:'7px 10px', fontWeight:700, color: f.avance==='100%' ? '#10B981' : 'var(--text-main)' }}>{f.avance}</td>
                                <td style={{ padding:'7px 10px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{f.vencimiento}</td>
                                <td style={{ padding:'7px 10px', textAlign:'center' }}>{f.vencida==='Sí' ? <span style={{ color:'#E71D36', fontWeight:700 }}>Sí</span> : <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                                <td style={{ padding:'7px 10px', textAlign:'center' }}>{f.rectificativa==='Sí' ? <span style={{ color:'#DC2626', fontWeight:700 }}>Sí</span> : <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          );
        })()}
      </div>

    </div>
  );
}
