import React, { useEffect, useState, useMemo, useRef } from 'react';
import { CheckCircle, Clock, TrendingUp, Calendar, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, Legend, ReferenceLine, LabelList
} from 'recharts';
import '../Explorar.css';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const colorPct = (pct) => pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444';

const LazySection = ({ children, minHeight = 200 }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? children : <div style={{ minHeight }} />}
    </div>
  );
};

const LazyIframe = ({ title, src, height, bg }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ background: bg, minHeight: height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', padding: '24px' }}>
      {visible
        ? <iframe title={title} width="100%" height={height} src={src} allowFullScreen style={{ border: 'none', display: 'block' }} />
        : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#aaa' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" fill="#d1d5db" /><rect x="14" y="3" width="7" height="7" rx="1" fill="#d1d5db" opacity="0.6" /><rect x="3" y="14" width="7" height="7" rx="1" fill="#d1d5db" opacity="0.6" /><rect x="14" y="14" width="7" height="7" rx="1" fill="#d1d5db" /></svg>
          <span style={{ fontSize: '12px' }}>Cargando tablero...</span>
        </div>
      }
    </div>
  );
};

const BarraCumplimiento = ({ completaron, total }) => {
  const pct = total > 0 ? Math.round((completaron / total) * 100) : 0;
  const color = colorPct(pct);
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
          <Users size={13} /> {completaron} / {total}
        </span>
        <span style={{ fontSize: '14px', fontWeight: '800', color }}>{pct}%</span>
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
        <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: '4px', transition: 'width 0.4s' }} />
      </div>
    </div>
  );
};

const CustomTooltipBar = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: '220px' }}>
      <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '10px', color: '#333' }}>{d.mesNombre}</div>
      {d.items.map(it => (
        <div key={it.titulo} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{it.titulo}</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>{it.nombreCurso}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#999' }}>{it.completaron} / {it.total} personas</span>
            <span style={{ fontSize: '13px', fontWeight: '900', color: colorPct(it.pct) }}>{it.pct}%</span>
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '4px', marginTop: '5px', overflow: 'hidden' }}>
            <div style={{ background: colorPct(it.pct), height: '100%', width: `${it.pct}%`, borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const PortalCMASS = () => {
  const [planes, setPlanes] = useState([]);
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [cumplimiento, setCumplimiento] = useState([]);
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [selectedMes, setSelectedMes] = useState(0); // 0 = todos
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [planesRes, itemsRes, coursesRes, cumplimientoRes] = await Promise.all([
        supabase.from('paf_planes').select('*').order('anio'),
        supabase.from('paf_items').select('*, categoria:cursos_categorias(nombre, color)').order('mes').order('orden'),
        supabase.from('cursos').select('id, titulo, es_paf, paf_item_id, categoria:cursos_categorias(nombre, color)'),
        supabase.from('paf_cumplimiento').select('*'),
      ]);
      if (planesRes.data) {
        setPlanes(planesRes.data);
        const anioActual = new Date().getFullYear();
        const tieneActual = planesRes.data.find(p => p.anio === anioActual);
        if (!tieneActual && planesRes.data.length > 0) setSelectedAnio(planesRes.data[planesRes.data.length - 1].anio);
      }
      if (itemsRes.data) setItems(itemsRes.data);
      if (coursesRes.data) setCourses(coursesRes.data);
      if (cumplimientoRes.data) setCumplimiento(cumplimientoRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const plan = planes.find(p => p.anio === selectedAnio);
  const itemsDelPlan = plan ? items.filter(i => i.plan_id === plan.id) : [];
  const mesActual = new Date().getMonth() + 1;
  const cursosDelPlan = courses.filter(c => c.es_paf && itemsDelPlan.find(i => i.id === c.paf_item_id));
  const cumplimientosDelPlan = cumplimiento.filter(cu => cursosDelPlan.find(c => c.id === cu.curso_id));
  const ejecutadas = itemsDelPlan.filter(i => courses.find(c => c.paf_item_id === i.id));
  const pendientes = itemsDelPlan.filter(i => !courses.find(c => c.paf_item_id === i.id));

  const pctGlobal = cumplimientosDelPlan.length > 0
    ? Math.round(cumplimientosDelPlan.reduce((acc, cu) => acc + (cu.total_destinatarios > 0 ? cu.completaron / cu.total_destinatarios : 0), 0) / cumplimientosDelPlan.length * 100)
    : 0;
  const totalCompletaron = cumplimientosDelPlan.reduce((acc, cu) => acc + Number(cu.completaron), 0);

  // Datos para el gráfico de barras por mes
  const chartData = useMemo(() => {
    return MESES.map((mes, idx) => {
      const mesNum = idx + 1;
      const itemsMes = itemsDelPlan.filter(i => i.mes === mesNum);
      const cursosConStats = itemsMes
        .map(item => {
          const curso = courses.find(c => c.paf_item_id === item.id);
          const stats = curso ? cumplimiento.find(cu => cu.curso_id === curso.id) : null;
          if (!stats) return null;
          const pct = stats.total_destinatarios > 0 ? Math.round(stats.completaron / stats.total_destinatarios * 100) : 0;
          return { titulo: item.titulo, nombreCurso: curso.titulo, pct, completaron: Number(stats.completaron), total: Number(stats.total_destinatarios) };
        })
        .filter(Boolean);

      if (cursosConStats.length === 0) return null;
      const pctPromedio = Math.round(cursosConStats.reduce((a, c) => a + c.pct, 0) / cursosConStats.length);
      return { mes, mesNombre: MESES_FULL[idx], mesNum, pct: pctPromedio, items: cursosConStats };
    }).filter(Boolean);
  }, [itemsDelPlan, courses, cumplimiento]);

  // Items filtrados por mes seleccionado
  const itemsFiltrados = selectedMes === 0
    ? itemsDelPlan
    : itemsDelPlan.filter(i => i.mes === selectedMes);

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: '#aaa' }}>Cargando...</div>;

  if (planes.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#aaa' }}>
        <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.3, display: 'block' }} />
        <p style={{ fontWeight: '600' }}>No hay planes PAF cargados</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Selector de año */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #f0f0f0' }}>
        {planes.sort((a, b) => a.anio - b.anio).map(p => (
          <button key={p.anio} onClick={() => { setSelectedAnio(p.anio); setSelectedMes(0); }} style={{
            padding: '8px 22px', border: 'none', background: 'none',
            fontWeight: '700', fontSize: '15px', cursor: 'pointer',
            color: selectedAnio === p.anio ? '#4361ee' : '#aaa',
            borderBottom: selectedAnio === p.anio ? '2px solid #4361ee' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s',
          }}>{p.anio}</button>
        ))}
      </div>

      {/* Banner de progreso */}
      <div style={{ background: 'linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)', borderRadius: '18px', padding: '28px 32px', color: '#fff', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px', fontWeight: '500' }}>Cumplimiento de personal · PAF {selectedAnio}</div>
          <div style={{ fontSize: '52px', fontWeight: '900', lineHeight: 1 }}>{pctGlobal}%</div>
          <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '6px' }}>{totalCompletaron} certificaciones obtenidas</div>
        </div>
        <div style={{ flex: 2, minWidth: '220px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ background: '#fff', height: '100%', width: `${pctGlobal}%`, borderRadius: '8px', transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: '28px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: '800' }}>{itemsDelPlan.length}</div>
              <div style={{ fontSize: '11px', opacity: 0.75 }}>Planificadas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#a7f3d0' }}>{ejecutadas.length}</div>
              <div style={{ fontSize: '11px', opacity: 0.75 }}>Disponibles</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#fde68a' }}>{pendientes.length}</div>
              <div style={{ fontSize: '11px', opacity: 0.75 }}>Pendientes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de barras por mes */}
      {chartData.length > 0 && (
        <LazySection minHeight={300}>
          <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: '800', fontSize: '15px', color: '#333', margin: 0 }}>
                Cumplimiento del personal por mes
              </h3>
              {chartData.length > 0 && (() => {
                const totalC = chartData.reduce((a, d) => a + d.items.reduce((b, it) => b + it.completaron, 0), 0);
                const totalD = chartData.reduce((a, d) => a + d.items.reduce((b, it) => b + it.total, 0), 0);
                const pctTotal = totalD > 0 ? Math.round(totalC / totalD * 100) : 0;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{totalC} / {totalD} personas · promedio anual</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: colorPct(pctTotal) }}>{pctTotal}%</span>
                  </div>
                );
              })()}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={32} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <ReferenceLine y={100} stroke="#16a34a" strokeDasharray="6 4" strokeWidth={2} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fontWeight: 600, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#f5f7ff' }} />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="pct" position="top" formatter={v => `${v}%`} style={{ fontSize: '11px', fontWeight: '800', fill: '#555' }} />
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={colorPct(entry.pct)} opacity={selectedMes === 0 || selectedMes === entry.mesNum ? 1 : 0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setSelectedMes(0)}
                style={{ padding: '5px 14px', borderRadius: '20px', border: '1.5px solid', fontSize: '12px', fontWeight: '700', cursor: 'pointer', borderColor: selectedMes === 0 ? '#4361ee' : '#e0e0e0', background: selectedMes === 0 ? '#4361ee' : '#fff', color: selectedMes === 0 ? '#fff' : '#555' }}
              >Todos</button>
              {chartData.map(d => {
                const totalCompletaronMes = d.items.reduce((a, c) => a + c.completaron, 0);
                const totalDestinatariosMes = d.items.reduce((a, c) => a + c.total, 0);
                const activo = selectedMes === d.mesNum;
                return (
                  <button
                    key={d.mesNum}
                    onClick={() => setSelectedMes(activo ? 0 : d.mesNum)}
                    style={{ padding: '6px 14px', borderRadius: '20px', border: '1.5px solid', fontSize: '12px', cursor: 'pointer', borderColor: activo ? colorPct(d.pct) : '#e0e0e0', background: activo ? colorPct(d.pct) : '#fff', color: activo ? '#fff' : '#555', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span style={{ fontWeight: '700' }}>{d.mes}</span>
                    <span style={{ opacity: 0.85, fontSize: '11px' }}>{totalCompletaronMes}/{totalDestinatariosMes}</span>
                    <span style={{ fontWeight: '900' }}>{d.pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </LazySection>
      )}

      {/* Detalle por mes (filtrado) */}
      <LazySection minHeight={400}>
        <div>
          <h3 style={{ fontWeight: '800', fontSize: '16px', marginBottom: '16px', color: '#333' }}>
            {selectedMes === 0 ? 'Detalle por mes' : `Detalle · ${MESES_FULL[selectedMes - 1]}`}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {(selectedMes === 0 ? MESES_FULL : [MESES_FULL[selectedMes - 1]]).map((nombreMes, idx) => {
              const mes = selectedMes === 0 ? idx + 1 : selectedMes;
              const itemsMes = itemsFiltrados.filter(i => i.mes === mes);
              if (itemsMes.length === 0) return null;
              const completadosMes = itemsMes.filter(i => courses.find(c => c.paf_item_id === i.id)).length;
              const esMesActual = mes === mesActual && selectedAnio === new Date().getFullYear();
              return (
                <div key={mes} style={{ borderRadius: '12px', border: '1.5px solid', borderColor: esMesActual ? '#4361ee' : '#e5e7eb', overflow: 'hidden', boxShadow: esMesActual ? '0 0 0 3px #e8ecff' : 'none' }}>
                  <div style={{ padding: '14px 18px', background: esMesActual ? '#f0f4ff' : '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: esMesActual ? '#4361ee' : '#555' }}>{nombreMes}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: completadosMes === itemsMes.length ? '#d1fae5' : '#f3f4f6', color: completadosMes === itemsMes.length ? '#16a34a' : '#666' }}>
                      {completadosMes}/{itemsMes.length} cursos
                    </span>
                  </div>
                  <div style={{ padding: '14px' }}>
                    {itemsMes.map(item => {
                      const curso = courses.find(c => c.paf_item_id === item.id);
                      const stats = curso ? cumplimiento.find(cu => cu.curso_id === curso.id) : null;
                      return (
                        <div key={item.id} style={{ padding: '12px 14px', borderRadius: '10px', marginBottom: '8px', background: curso ? '#f8fffe' : '#fff', border: '1px solid', borderColor: curso ? '#bbf7d0' : '#ececec' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {curso ? <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0 }} /> : <Clock size={16} color="#f59e0b" style={{ flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.3' }}>{item.titulo}</div>
                              {item.categoria && (
                                <span style={{ fontSize: '11px', fontWeight: '700', color: item.categoria.color, background: item.categoria.color + '20', borderRadius: '20px', padding: '1px 8px', display: 'inline-block', marginTop: '3px' }}>{item.categoria.nombre}</span>
                              )}
                            </div>
                            {!curso && <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', flexShrink: 0 }}>Sin curso</span>}
                          </div>
                          {stats && <BarraCumplimiento completaron={Number(stats.completaron)} total={Number(stats.total_destinatarios)} />}
                          {curso && !stats && <div style={{ marginTop: '6px', fontSize: '12px', color: '#bbb' }}>Sin datos aún</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </LazySection>

      {/* Tableros Power BI */}
      <div style={{ marginTop: '8px' }}>
        {/* Header sección */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)',
          borderRadius: '20px',
          padding: '32px 36px',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decoración de fondo */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '120px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <div style={{ position: 'absolute', top: '20px', right: '60px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(96,165,250,0.15)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" fill="#60a5fa" /><rect x="14" y="3" width="7" height="7" rx="1" fill="#93c5fd" opacity="0.7" /><rect x="3" y="14" width="7" height="7" rx="1" fill="#93c5fd" opacity="0.7" /><rect x="14" y="14" width="7" height="7" rx="1" fill="#60a5fa" opacity="0.5" /></svg>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#93c5fd', letterSpacing: '0.05em' }}>POWER BI</span>
              </div>
            </div>
            <h2 style={{ color: '#fff', fontWeight: '900', fontSize: '22px', margin: '0 0 6px 0' }}>Tableros de Gestión</h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: 0 }}>Indicadores en tiempo real del área CMASS</p>
          </div>
        </div>

        {/* Cards de tableros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Tablero 1 */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #e5e7eb', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>QR Incidentes e Inspecciones</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>Power Apps y Forms</div>
              </div>
            </div>
            <LazyIframe title="CMASS V2" width="1024" height="600" src="https://app.powerbi.com/view?r=eyJrIjoiZTA4ZjNiYzEtZWM3ZS00YTQ2LTkxZDktNDZiMzFjMjBhYWU3IiwidCI6ImRhZmUzYmM1LTYzNzItNDM5Ni04NDUyLWM3MDdmM2VjZjRiZiJ9" bg="#f8faff" />
          </div>

          {/* Tablero 2 */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #e5e7eb', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2.5" /><path d="M12 7v5l3 3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>Análisis de Horas Hombre</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>Total, por área y hs extra</div>
              </div>
            </div>
            <LazyIframe title="HH" width="1024" height="600" src="https://app.powerbi.com/view?r=eyJrIjoiYTE0NjQyYzMtMjRjOS00OTJiLTk2OGUtNjE1ZjYwM2U0N2I5IiwidCI6ImRhZmUzYmM1LTYzNzItNDM5Ni04NDUyLWM3MDdmM2VjZjRiZiJ9" bg="#f0fdf9" />
          </div>

          {/* Tablero 3 */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #e5e7eb', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ background: 'linear-gradient(135deg, #4a1942 0%, #7c3aed 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 20V10l8-7 8 7v10H4z" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>Gerenciamiento de Viajes</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>Análisis de Riesgos y conductores</div>
              </div>
            </div>
            <LazyIframe title="Tablero 3" width="1024" height="600" src="https://app.powerbi.com/view?r=eyJrIjoiZjZmZGNkMDMtYzYyNC00NTc5LWFiMzctNmJmMDUzYzgyODAyIiwidCI6ImRhZmUzYmM1LTYzNzItNDM5Ni04NDUyLWM3MDdmM2VjZjRiZiJ9" bg="#faf5ff" />
          </div>

        </div>
      </div>

      {/* Pendientes del mes actual */}
      {pendientes.filter(i => i.mes === mesActual && selectedAnio === new Date().getFullYear()).length > 0 && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <TrendingUp size={16} color="#b45309" />
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#b45309' }}>Pendientes este mes</span>
          </div>
          {pendientes.filter(i => i.mes === mesActual).map(item => (
            <div key={item.id} style={{ fontSize: '13px', color: '#78350f', padding: '6px 0', borderBottom: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={12} color="#f59e0b" /> {item.titulo}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default PortalCMASS;
