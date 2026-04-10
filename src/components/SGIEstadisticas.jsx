import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  BarChart2, FileText, AlertCircle, CheckCircle, Clock, TrendingUp, RefreshCw,
  ClipboardList, FolderOpen, Filter, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  const [categorias, setCategorias] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

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
      const [{ data: docsData }, { data: ncData }, { data: acData }, { data: catData }] = await Promise.all([
        supabase.from('sgi_documentos').select('id, tipo_documento, categoria_id, created_at, activo').eq('activo', true),
        supabase.from('nc_hallazgos').select('id, tipo, estado, gerencia, paso_actual, fecha, created_at'),
        supabase.from('nc_acciones').select('id, estado, hallazgo_id, fecha_vencimiento, avance'),
        supabase.from('sgi_categorias').select('id, nombre, color').eq('activo', true).is('parent_id', null),
      ]);
      setDocs(docsData || []);
      setHallazgos(ncData || []);
      setAcciones(acData || []);
      setCategorias(catData || []);
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

  return (
    <div className="sgi-container">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="sgi-page-header">
        <div className="sgi-header-icon" style={{ background: '#3B82F618' }}>
          <BarChart2 size={24} color="#3B82F6" />
        </div>
        <div>
          <h2>Estadísticas SGI</h2>
          <p>Panel de control del Sistema de Gestión Integrado</p>
        </div>
        <button className="sgi-stat-refresh-btn" onClick={fetchAll} disabled={loading} title="Actualizar datos">
          <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          {lastUpdated && <span>Actualizado {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 1 — RESUMEN GENERAL
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sgi-stat-section">
        <SectionHeader
          icon={BarChart2}
          color="#3B82F6"
          title="Resumen general"
          description="Indicadores clave del SGI en tiempo real"
        />
        <div className="sgi-stat-kpis">
          <StatCard icon={FileText}    label="Documentos activos"  value={loading ? null : totalDocs}        color="#3B82F6" />
          <StatCard icon={AlertCircle} label="Total hallazgos"     value={loading ? null : totalNC}          color="#E71D36" />
          <StatCard icon={Clock}       label="NC abiertas"         value={loading ? null : abiertas}         color="#F59E0B"
            sub={totalNC ? `${Math.round(abiertas / totalNC * 100)}% del total` : null} />
          <StatCard icon={CheckCircle} label="NC cerradas"         value={loading ? null : cerradas}         color="#10B981" />
          <StatCard icon={TrendingUp}  label="Acciones en curso"   value={loading ? null : accionesAbiertas} color="#8B5CF6" />
          <StatCard icon={CheckCircle} label="Acciones cerradas"   value={loading ? null : accionesCerradas} color="#10B981" />
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
          SECCIÓN 3 — DOCUMENTOS SGI
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sgi-stat-section" style={{ display: tabActiva === 'docs' ? undefined : 'none' }}>
        <SectionHeader
          icon={FolderOpen}
          color="#F2DC00"
          title="Documentos SGI"
          description="Distribución del repositorio documental por tipo y categoría"
        />

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

    </div>
  );
}
