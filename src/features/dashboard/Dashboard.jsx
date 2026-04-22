import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PlayCircle, Clock, Award, ArrowRight, BarChart2, BookOpen, Folder, Monitor, FileText, Link as LinkIcon, ExternalLink, Globe, CheckCircle2, XCircle, Trophy, Calendar, Users, GraduationCap } from 'lucide-react';
import BannerNovedades from './BannerNovedades';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { visMatchesProfile, courseIsVisible, eventoIsVisible } from '../../lib/visibilidad';
import './Dashboard.css';

const DashboardChart = lazy(() => import('./DashboardChart'));

const cache = {
  accesos: { data: null, time: 0 },
  resultados: { data: null, time: 0 },
  eventos: { data: null, time: 0 },
  cursos: { data: null, time: 0 },
  globalStats: { data: null, time: 0 },
};
const CACHE_TTL = 3 * 60 * 1000; // 3 minutos de expiración

const parseDuration = (str) => {
  if (!str) return 0;
  let hours = 0;
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  if (hMatch) hours += parseInt(hMatch[1]);
  if (mMatch) hours += parseInt(mMatch[1]) / 60;
  return hours;
};

// Convierte cualquier nombre de lucide (kebab-case o PascalCase) a su componente
const getLucideIcon = (name, size = 24) => {
  if (!name) return <LinkIcon size={size} />;
  // Convierte kebab-case a PascalCase: "bar-chart-2" → "BarChart2"
  const pascal = name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
  const Icon = LucideIcons[pascal];
  return Icon ? <Icon size={size} /> : <LinkIcon size={size} />;
};


const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const userEmail = user?.email;
  const [stats, setStats] = useState({ cursos: 0, certificados: 0, horas: 0 });
  const [globalStats, setGlobalStats] = useState({ usuarios: 0, cursos: 0, certificados: 0 });
  const [accesos, setAccesos] = useState([]);
  const [cursoPendiente, setCursoPendiente] = useState(null);
  const [enrichedCourses, setEnrichedCourses] = useState([]);
  const [cursosLoaded, setCursosLoaded] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [proximosEventos, setProximosEventos] = useState(null); // null = loading
  const [novedades, setNovedades] = useState([]);

  useEffect(() => {
    if (!userEmail) return;

    const now = Date.now();

    const fetchAccesos = async () => {
      if (cache.accesos.data && (now - cache.accesos.time < CACHE_TTL)) {
        setAccesos(cache.accesos.data);
        return;
      }
      const { data } = await supabase.from('accesos_rapidos').select('*').eq('activo', true).order('numero_orden', { ascending: true });
      const finalData = data || [];
      cache.accesos = { data: finalData, time: Date.now() };
      setAccesos(finalData);
    };

    const fetchResultados = async () => {
      if (cache.resultados.data && (now - cache.resultados.time < CACHE_TTL)) {
        setResultados(cache.resultados.data);
        return;
      }
      const { data } = await supabase.from('cursos_resultados')
        .select('*, curso:cursos(titulo, categoria:cursos_categorias(color))')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(5);
      const finalData = data || [];
      cache.resultados = { data: finalData, time: Date.now() };
      setResultados(finalData);
    };

    const fetchEventos = async () => {
      if (cache.eventos.data && (now - cache.eventos.time < CACHE_TTL)) {
        setProximosEventos(cache.eventos.data);
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const [eventosRes, eventosVisRes] = await Promise.all([
        supabase.from('eventos').select('*, categoria:eventos_categorias(nombre, color), area:areas(nombre, color)').gte('fecha', today).order('fecha', { ascending: true }).limit(10),
        supabase.from('eventos_visibilidad').select('*'),
      ]);
      const filteredEventos = (eventosRes.data || []).filter(e => eventoIsVisible(e.id, eventosVisRes.data, profile)).slice(0, 3);
      cache.eventos = { data: filteredEventos, time: Date.now() };
      setProximosEventos(filteredEventos);
    };

    const fetchCursos = async () => {
      if (cache.cursos.data && (now - cache.cursos.time < CACHE_TTL)) {
        setStats(cache.cursos.data.stats);
        setEnrichedCourses(cache.cursos.data.enrichedCourses);
        setCursoPendiente(cache.cursos.data.cursoPendiente);
        setCursosLoaded(true);
        return;
      }
      const [coursesRes, certsRes, progressRes, cursosVisRes, cursosDestRes] = await Promise.all([
        supabase.from('cursos').select('*, categoria:cursos_categorias(nombre, color), modulos:cursos_modulos(count)'),
        supabase.from('cursos_resultados').select('id, curso_id').eq('user_email', userEmail).eq('aprobado', true),
        supabase.from('cursos_progreso').select('curso_id').eq('user_email', userEmail).eq('completado', true),
        supabase.from('cursos_visibilidad').select('*'),
        supabase.from('cursos_destinatarios').select('curso_id').eq('user_id', user?.id),
      ]);

      const destCursoIds = new Set((cursosDestRes.data || []).map(d => d.curso_id));
      const allCourses = (coursesRes.data || []).filter(c => courseIsVisible(c.id, destCursoIds, cursosVisRes.data, profile));
      const certificados = certsRes.data?.length || 0;
      const completedCourseIds = new Set((certsRes.data || []).map(r => r.curso_id));
      const minutosCompletados = allCourses
        .filter(c => completedCourseIds.has(c.id))
        .reduce((acc, c) => acc + (parseInt(c.duracion_estimada) || 0), 0);
      const horasRaw = parseFloat((minutosCompletados / 60).toFixed(2));
      setStats({ cursos: allCourses.length, certificados, horas: horasRaw });

      const progressMap = {};
      (progressRes.data || []).forEach(p => {
        progressMap[p.curso_id] = (progressMap[p.curso_id] || 0) + 1;
      });

      const enriched = allCourses.map(course => {
        const totalModulos = course.modulos?.[0]?.count || 0;
        const completados = progressMap[course.id] || 0;
        const progressPct = totalModulos > 0 ? Math.round((completados / totalModulos) * 100) : 0;
        return { ...course, totalModulos, progressPct };
      });

      const recentFive = [...enriched]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setEnrichedCourses(recentFive);

      const inProgress = enriched.find(c => c.progressPct > 0 && c.progressPct < 100);
      const notStarted = enriched.find(c => c.progressPct === 0);
      const resCursoPendiente = inProgress || notStarted || false;
      const resStats = { cursos: allCourses.length, certificados, horas: horasRaw };

      cache.cursos = {
        data: { stats: resStats, enrichedCourses: recentFive, cursoPendiente: resCursoPendiente },
        time: Date.now()
      };

      setStats(resStats);
      setEnrichedCourses(recentFive);
      setCursoPendiente(resCursoPendiente);
      setCursosLoaded(true);
    };

    const fetchGlobalStats = async () => {
      if (cache.globalStats.data && (now - cache.globalStats.time < CACHE_TTL)) {
        setGlobalStats(cache.globalStats.data);
        return;
      }
      const [usuariosRes, cursosRes, certsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('cursos').select('id', { count: 'exact', head: true }),
        supabase.from('cursos_resultados').select('id', { count: 'exact', head: true }).eq('aprobado', true),
      ]);
      const data = {
        usuarios: usuariosRes.count || 0,
        cursos: cursosRes.count || 0,
        certificados: certsRes.count || 0,
      };
      cache.globalStats = { data, time: Date.now() };
      setGlobalStats(data);
    };

    fetchAccesos();
    fetchResultados();
    fetchEventos();
    fetchCursos();
    fetchGlobalStats();

    // Novedades (sin cache — cambian frecuentemente)
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('novedades')
      .select('id, titulo, imagen_url, link_url, orden, fecha_hasta')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error('[novedades]', error.message); return; }
        const visibles = (data || []).filter(n => !n.fecha_hasta || n.fecha_hasta >= today);
        setNovedades(visibles);
      });

  }, [userEmail, profile]);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay },
  });

  return (
    <div className="dashboard">

      {/* Hero Section */}
      <motion.section className="hero" {...fadeUp(0)}>
        <div className="hero-content">
          <div className="hero-tag">Ribeiro 360</div>
          <h1>Hola, <span>{profile?.full_name?.split(' ')[0] ?? 'bienvenido'}</span> 👋</h1>
          <p>Acá vas a encontrar todo lo que necesitás para tu día a día.</p>
          <button className="btn-hero" onClick={() => navigate('/explorar')}>
            Explorar Recursos
            <ArrowRight size={16} />
          </button>
          <div className="hero-deco-circle hero-deco-1" />
          <div className="hero-deco-circle hero-deco-2" />
          <div className="hero-deco-circle hero-deco-3" />
        </div>
      </motion.section>

      {/* Quick Access */}
      {accesos.length > 0 && (
        <motion.section className="section" {...fadeUp(0.1)}>
          <div className="section-header">
            <h2>Accesos Rápidos</h2>
          </div>
          <div className="quick-access-grid">
            {accesos.map((acceso, i) => (
              <a key={acceso.id} href={acceso.url} className="quick-card" target="_blank" rel="noopener noreferrer" style={{ '--i': i }}>
                <span className="quick-card-shimmer" style={{ animationDelay: `${i * 0.5 + 0.5}s` }} />
                <div className="quick-card-top">
                  <span className="quick-card-num">0{i + 1}.</span>
                  <span className="quick-card-label">{acceso.titulo}</span>
                </div>
                <div className="quick-icon">
                  {getLucideIcon(acceso.icono)}
                </div>
                <div className="quick-card-bottom">
                  <span className="quick-card-action">Abrir</span>
                  <div className="quick-card-dots">
                    {[...Array(9)].map((_, d) => <span key={d} className="dot" />)}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </motion.section>
      )}

      {/* Próximos Eventos */}
      <motion.section className="section" {...fadeUp(0.15)}>
        <div className="section-header">
          <h2>Próximos Eventos</h2>
          <button className="view-all" onClick={() => navigate('/eventos')}>Ver calendario</button>
        </div>

        {proximosEventos === null ? (
          <div style={{ display: 'flex', gap: '16px' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: '88px', borderRadius: '12px' }} />)}
          </div>
        ) : proximosEventos.length === 0 ? (
          <div className="no-pending-course" style={{ padding: '32px' }}>
            <Calendar size={32} />
            <p>No hay eventos próximos</p>
          </div>
        ) : (
          <div className="proximos-eventos-grid">
            {proximosEventos.map(ev => {
              const fecha = new Date(ev.fecha + 'T00:00:00');
              return (
                <div key={ev.id} className="proximo-evento-card" style={{ borderTopColor: ev.categoria?.color || '#e5e7eb' }}>
                  <div className="proximo-evento-fecha">
                    <span className="proximo-dia">{fecha.getDate()}</span>
                    <span className="proximo-mes">{fecha.toLocaleDateString('es-AR', { month: 'short' })}</span>
                  </div>
                  <div className="proximo-evento-info">
                    <span className="proximo-titulo">{ev.titulo}</span>
                    <div className="proximo-tags">
                      {ev.categoria && <span className="proximo-tag" style={{ color: ev.categoria.color, backgroundColor: ev.categoria.color + '18' }}>{ev.categoria.nombre}</span>}
                      {ev.area && <span className="proximo-tag" style={{ color: ev.area.color, backgroundColor: ev.area.color + '18' }}>{ev.area.nombre}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Banner Novedades */}
      {novedades.length > 0 && (
        <motion.section className="section" {...fadeUp(0.2)}>
          <div className="section-header">
            <h2>Novedades</h2>
          </div>
          <BannerNovedades novedades={novedades} />
        </motion.section>
      )}

      {/* Continue Learning */}
      <motion.section className="section" {...fadeUp(0.3)}>
        <div className="section-header">
          <h2>Continuar Aprendiendo</h2>
          {cursoPendiente && <button className="view-all" onClick={() => navigate('/cursos')}>Ver todos</button>}
        </div>

        {cursoPendiente === null ? (
          <div className="course-card featured skeleton-featured" />
        ) : cursoPendiente === false ? (
          <div className="no-pending-course">
            <BookOpen size={40} />
            <p>Pronto tendremos más contenido para vos</p>
          </div>
        ) : (
          <div className="course-card featured">
            <div className="course-image">
              <img
                src={cursoPendiente.imagen_banner || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600"}
                alt={cursoPendiente.titulo}
                loading="lazy"
              />
              <div className="play-overlay">
                <PlayCircle size={48} className="play-icon" />
              </div>
            </div>
            <div className="course-content">
              <div className="course-meta">
                {cursoPendiente.categoria?.nombre && (
                  <span className="tag" style={{ backgroundColor: cursoPendiente.categoria.color }}>{cursoPendiente.categoria.nombre}</span>
                )}
                {cursoPendiente.duracion_estimada && (
                  <span className="time"><Clock size={16} /> {cursoPendiente.duracion_estimada}</span>
                )}
              </div>
              <h3>{cursoPendiente.titulo}</h3>
              <p className="course-desc">{cursoPendiente.descripcion}</p>

              <div className="progress-container">
                <div className="progress-header">
                  <span className="progress-label">Progreso</span>
                  <span className="progress-value">{cursoPendiente.progressPct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${cursoPendiente.progressPct}%` }}></div>
                </div>
              </div>

              <button className="btn-secondary" onClick={() => navigate('/cursos')}>
                {cursoPendiente.progressPct === 0 ? 'Comenzar Curso' : 'Continuar Curso'}
              </button>
            </div>
          </div>
        )}
      </motion.section>

      {/* Mis estadísticas de capacitación */}
      <motion.section className="section" {...fadeUp(0.4)}>
        <div className="section-header">
          <h2>Mis estadísticas de capacitación</h2>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <div className="stat-icon bg-blue">
              <BookOpen size={24} />
            </div>
            <div className="stat-info">
              <h3>{stats.cursos}</h3>
              <p>Cursos Activos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-orange">
              <Award size={24} />
            </div>
            <div className="stat-info">
              <h3>{stats.certificados}</h3>
              <p>Mis Certificados</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green">
              <BarChart2 size={24} />
            </div>
            <div className="stat-info">
              <h3>{stats.horas % 1 === 0 ? stats.horas : stats.horas.toFixed(2)}h</h3>
              <p>Horas de Aprendizaje</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.div className="dashboard-grid" {...fadeUp(0.5)}>
        {/* Progreso por Curso — BarChart horizontal */}
        <section className="section span-2">
          <div className="section-header">
            <h2>Progreso por Curso</h2>
            <button className="view-all" onClick={() => navigate('/cursos')}>Ver academia</button>
          </div>

          {!cursosLoaded ? (
            <div className="activity-skeleton">
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: '8px' }} />)}
            </div>
          ) : (
            <div className="course-progress-list">
              {enrichedCourses.map(course => {
                const barColor = course.progressPct === 100 ? '#10b981' : (course.categoria?.color || '#F2DC00');
                return (
                  <div key={course.id} className="course-progress-item">
                    <div className="course-progress-header">
                      <div className="course-progress-chip">
                        <span className="course-progress-chip-dot" style={{ backgroundColor: barColor }} />
                        <span className="course-progress-chip-name">{course.titulo}</span>
                        {course.categoria?.nombre && (
                          <span className="course-progress-chip-cat">{course.categoria.nombre}</span>
                        )}
                      </div>
                      <span className="course-progress-pct" style={{ color: barColor }}>
                        {course.progressPct === 100 ? '✓ Completado' : `${course.progressPct}%`}
                      </span>
                    </div>
                    <div className="course-progress-track">
                      <div
                        className="course-progress-fill"
                        style={{ width: `${course.progressPct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <div className="course-progress-meta">
                      <span>{course.totalModulos} módulo{course.totalModulos !== 1 ? 's' : ''}</span>
                      {course.duracion_estimada && <span>{course.duracion_estimada}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Panel derecho: Donut + Resultados */}
        <section className="section side-section">
          {/* Donut: distribución de estados */}
          <div className="section-header">
            <h2>Mi Avance</h2>
          </div>

          {!cursosLoaded ? (
            <div className="skeleton" style={{ height: '200px', borderRadius: '12px', marginBottom: '24px' }} />
          ) : (() => {
            const completados = enrichedCourses.filter(c => c.progressPct === 100).length;
            const enProgreso = enrichedCourses.filter(c => c.progressPct > 0 && c.progressPct < 100).length;
            const sinIniciar = enrichedCourses.filter(c => c.progressPct === 0).length;
            const pieData = [
              { name: 'Completados', value: completados, color: '#10b981' },
              { name: 'En progreso', value: enProgreso, color: '#F2DC00' },
              { name: 'Sin iniciar', value: sinIniciar, color: '#e5e7eb' },
            ].filter(d => d.value > 0);

            return (
              <div className="donut-wrapper">
                <Suspense fallback={<div className="skeleton" style={{ height: '180px', borderRadius: '12px' }} />}>
                  <DashboardChart pieData={pieData} />
                </Suspense>
                <div className="donut-legend">
                  {pieData.map((d, i) => (
                    <div key={i} className="donut-legend-item">
                      <span className="donut-legend-dot" style={{ backgroundColor: d.color }} />
                      <span className="donut-legend-label">{d.name}</span>
                      <span className="donut-legend-val">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Últimos resultados */}
          <div className="section-header" style={{ marginTop: '24px' }}>
            <h2>Últimos Resultados</h2>
          </div>

          {resultados === null ? (
            <div className="activity-skeleton">
              {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '10px' }} />)}
            </div>
          ) : resultados.length === 0 ? (
            <div className="results-empty">
              <Trophy size={28} />
              <p>Aún no rendiste cuestionarios</p>
            </div>
          ) : (
            <div className="results-list">
              {resultados.map(r => (
                <div key={r.id} className="result-item">
                  <div className="result-score-badge" style={{ backgroundColor: r.aprobado ? '#d1fae5' : '#fee2e2', color: r.aprobado ? '#065f46' : '#991b1b' }}>
                    {r.puntaje}%
                  </div>
                  <div className="result-info">
                    <span className="result-course-name">{r.curso?.titulo || 'Curso'}</span>
                    <span className="result-date">
                      {new Date(r.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className={`result-status-icon ${r.aprobado ? 'passed' : 'failed'}`}>
                    {r.aprobado ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </motion.div>

    </div>
  );
};

export default Dashboard;
