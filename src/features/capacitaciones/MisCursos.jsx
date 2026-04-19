import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Clock, ChevronRight, Award, Play, Filter, Search, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { courseIsVisible } from '../../lib/visibilidad';
import CoursePlayer from './CoursePlayer';
import './MisCursos.css';


const MisCursos = () => {
  const { id: courseIdFromUrl } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const userEmail = user?.email;
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [categories, setCategories] = useState(['Todas']);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const COURSES_PER_PAGE = 6;

  useEffect(() => {
    fetchCourses();
  }, []);

  // Si viene un id por URL, seleccionar ese curso una vez que carguen
  useEffect(() => {
    if (courseIdFromUrl && courses.length > 0) {
      const match = courses.find(c => c.id === courseIdFromUrl);
      if (match) setSelectedCourse(match);
    }
  }, [courseIdFromUrl, courses]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, progressRes, visRes, destRes] = await Promise.all([
        supabase
          .from('cursos')
          .select('*, categoria:cursos_categorias(nombre, color, icono), modulos:cursos_modulos(count)'),
        supabase
          .from('cursos_progreso')
          .select('curso_id')
          .eq('user_email', userEmail)
          .eq('completado', true),
        supabase.from('cursos_visibilidad').select('*'),
        supabase.from('cursos_destinatarios').select('curso_id').eq('user_id', user?.id),
      ]);

      if (coursesRes.data) {
        const visRules = visRes.data || [];
        const destCursoIds = new Set((destRes.data || []).map(d => d.curso_id));

        const progressMap = {};
        (progressRes.data || []).forEach(p => {
          progressMap[p.curso_id] = (progressMap[p.curso_id] || 0) + 1;
        });

        const enriched = coursesRes.data
          .filter(course => courseIsVisible(course.id, destCursoIds, visRules, profile))
          .map(course => {
            const totalModulos = course.modulos?.[0]?.count || 0;
            const completados = progressMap[course.id] || 0;
            const progressPct = totalModulos > 0 ? Math.round((completados / totalModulos) * 100) : 0;
            return { ...course, totalModulos, progressPct };
          });

        setCourses(enriched);
        const uniqueCats = ['Todas', ...new Set(enriched.map(c => c.categoria?.nombre).filter(Boolean))];
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = activeCategory === 'Todas' || course.categoria?.nombre === activeCategory;
    return matchesSearch && matchesCat;
  });

  const totalPages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE
  );

  const handleCategoryChange = (cat) => { setActiveCategory(cat); setCurrentPage(1); };
  const handleSearchChange = (val) => { setSearchTerm(val); setCurrentPage(1); };

  if (selectedCourse) {
    return (
      <CoursePlayer
        course={selectedCourse}
        onBack={() => { setSelectedCourse(null); fetchCourses(); navigate('/cursos'); }}
      />
    );
  }

  return (
    <div className="cursos-container">
      <div className="cursos-header">
        <div>
          <h2>Academia Ribeiro</h2>
          <p>Tu espacio de formación y crecimiento profesional</p>
        </div>
        <div className="stats-row">
           <div className="header-stat">
              <span className="stat-value">{courses.length}</span>
              <span className="stat-label">Cursos</span>
           </div>
           <div className="header-stat">
              <span className="stat-value">{courses.filter(c => c.progressPct === 100).length}</span>
              <span className="stat-label">Terminados</span>
           </div>
        </div>
      </div>

      <div className="cursos-toolbar">
         <div className="search-box-light">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="¿Qué quieres aprender hoy?" 
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
            />
         </div>
         <div className="category-chips">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`cat-chip ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
         </div>
      </div>

      {isLoading ? (
        <div className="loading-grid">Cargando cursos...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="no-courses">
           <BookOpen size={48} className="text-muted" />
           <h3>No hay cursos disponibles</h3>
           <p>Prueba ajustando los filtros o la búsqueda.</p>
        </div>
      ) : (
        <div className="courses-grid">
          <AnimatePresence>
            {paginatedCourses.map((course, index) => (
              <motion.div 
                key={course.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="course-card-v2"
              >
                <div className="card-image">
                  <img src={course.imagen_banner || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400"} alt={course.titulo} />
                  <div className="category-badge-floating" style={{ backgroundColor: course.categoria?.color }}>
                    {course.categoria?.nombre || 'General'}
                  </div>
                </div>

                <div className="card-body">
                  <h3>{course.titulo}</h3>
                  <p className="course-desc">{course.descripcion}</p>
                  
                  <div className="course-meta">
                    <div className="meta-item">
                      <Clock size={14} />
                      <span>{course.duracion_estimada || '1 hs'}</span>
                    </div>
                    <div className="meta-item">
                      <BookOpen size={14} />
                      <span>{course.totalModulos} Módulo{course.totalModulos !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="course-progress-section">
                    <div className="progress-info">
                      <span>Progreso</span>
                      <strong>{course.progressPct}%</strong>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${course.progressPct}%` }}></div>
                    </div>
                  </div>

                  <button className="btn-start-course" onClick={() => { navigate(`/cursos/${course.id}`); setSelectedCourse(course); }}>
                    {course.progressPct === 0 ? 'Comenzar' : course.progressPct === 100 ? 'Revisar' : 'Continuar'} <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>

          <span className="page-info">
            {(currentPage - 1) * COURSES_PER_PAGE + 1}–{Math.min(currentPage * COURSES_PER_PAGE, filteredCourses.length)} de {filteredCourses.length} cursos
          </span>
        </div>
      )}
    </div>
  );
};

export default MisCursos;
