import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  CheckCircle2,
  PlayCircle,
  Lock,
  Clock,
  FileText,
  Video,
  ArrowRight,
  Send,
  Trophy,
  Award,
  BookOpen,
  HelpCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Certificado from './Certificado';
import './CoursePlayer.css';

const CoursePlayer = ({ course, onBack }) => {
  const [modules, setModules] = useState([]);
  const [activeModule, setActiveModule] = useState(null);
  const [completedModules, setCompletedModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerView, setPlayerView] = useState('modules'); // 'modules' | 'quiz' | 'result'
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [showCertificado, setShowCertificado] = useState(false);

  const quizPreguntas = (() => {
    try { return course.cuestionario ? JSON.parse(course.cuestionario) : []; }
    catch(e) { return []; }
  })();
  const hasQuiz = quizPreguntas.length > 0;

  const { user } = useAuth();
  const userEmail = user?.email;

  useEffect(() => {
    fetchModules();
    fetchProgress();
  }, [course.id]);

  const fetchModules = async () => {
    const { data } = await supabase
      .from('cursos_modulos')
      .select('*')
      .eq('curso_id', course.id)
      .order('numero_orden', { ascending: true });
    
    if (data) {
      setModules(data);
      if (data.length > 0) setActiveModule(data[0]);
    }
  };

  const fetchProgress = async () => {
    const [progressRes, resultRes] = await Promise.all([
      supabase
        .from('cursos_progreso')
        .select('modulo_id')
        .eq('curso_id', course.id)
        .eq('user_email', userEmail)
        .eq('completado', true),
      supabase
        .from('cursos_resultados')
        .select('*')
        .eq('curso_id', course.id)
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(1)
    ]);

    if (progressRes.data) {
      setCompletedModules(progressRes.data.map(p => p.modulo_id));
    }

    if (resultRes.data && resultRes.data.length > 0) {
      const r = resultRes.data[0];
      setQuizResult({ correct: r.correctas, total: r.total, score: r.puntaje, passed: r.aprobado, date: r.created_at });
      setPlayerView('result');
    }

    setIsLoading(false);
  };

  const handleComplete = async () => {
    if (!activeModule) return;
    try {
      const { error } = await supabase
        .from('cursos_progreso')
        .upsert([{
          curso_id: course.id,
          modulo_id: activeModule.id,
          user_email: userEmail,
          completado: true,
          updated_at: new Date()
        }], { onConflict: 'modulo_id, user_email' });

      if (!error) {
        const newCompleted = [...completedModules, activeModule.id];
        setCompletedModules(newCompleted);
        const currentIndex = modules.findIndex(m => m.id === activeModule.id);
        const allDone = newCompleted.length === modules.length;
        if (allDone && hasQuiz) {
          // stay on module but quiz button will appear
        } else if (currentIndex < modules.length - 1) {
          setActiveModule(modules[currentIndex + 1]);
        }
      }
    } catch (err) { console.error(err); }
  };

  const progressPercent = modules.length > 0 
    ? Math.round((completedModules.length / modules.length) * 100) 
    : 0;

  const handleQuizSubmit = async () => {
    let correct = 0;
    quizPreguntas.forEach(p => {
      const answerId = quizAnswers[p.id];
      const correctOpcion = p.opciones.find(o => o.correcta);
      if (answerId === correctOpcion?.id) correct++;
    });
    const total = quizPreguntas.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= 70;

    const result = { correct, total, score, passed, date: new Date().toISOString() };
    setQuizResult(result);
    setPlayerView('result');

    await supabase.from('cursos_resultados').insert([{
      curso_id: course.id,
      user_email: userEmail,
      puntaje: score,
      correctas: correct,
      total,
      aprobado: passed,
    }]);
  };

  const renderQuizView = () => (
    <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-header-icon"><HelpCircle size={32} /></div>
        <h2>Cuestionario Final</h2>
        <p>Respondé todas las preguntas para completar el curso. Necesitás un 70% para aprobar.</p>
      </div>

      <div className="quiz-questions">
        {quizPreguntas.map((pregunta, pIdx) => (
          <div key={pregunta.id} className="quiz-pregunta">
            <p className="pregunta-texto"><span className="pregunta-num">{pIdx + 1}.</span> {pregunta.texto}</p>
            <div className="quiz-opciones">
              {pregunta.opciones.map(opcion => (
                <label
                  key={opcion.id}
                  className={`quiz-opcion-label ${quizAnswers[pregunta.id] === opcion.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`q-${pregunta.id}`}
                    checked={quizAnswers[pregunta.id] === opcion.id}
                    onChange={() => setQuizAnswers({ ...quizAnswers, [pregunta.id]: opcion.id })}
                  />
                  {opcion.texto}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="module-footer">
        <button
          className="btn-complete-mod"
          onClick={handleQuizSubmit}
          disabled={Object.keys(quizAnswers).length < quizPreguntas.length}
          style={{ opacity: Object.keys(quizAnswers).length < quizPreguntas.length ? 0.5 : 1 }}
        >
          <Send size={20} /> Enviar Respuestas ({Object.keys(quizAnswers).length}/{quizPreguntas.length})
        </button>
      </div>
    </motion.div>
  );

  const renderResultView = () => (
    <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="result-container">
      <div className={`result-icon-wrapper ${quizResult.passed ? 'passed' : 'failed'}`}>
        {quizResult.passed ? <Trophy size={56} /> : <XCircle size={56} />}
      </div>
      <h2 className="result-title">{quizResult.passed ? '¡Felicidades!' : 'No aprobaste esta vez'}</h2>
      <div className="result-score-display">
        <span className="result-score-num">{quizResult.score}%</span>
        <span className="result-score-label">{quizResult.correct} de {quizResult.total} correctas</span>
      </div>
      <p className="result-message">
        {quizResult.passed
          ? '¡Aprobaste el cuestionario con éxito! El curso ha sido completado.'
          : 'Necesitás al menos el 70% para aprobar. Repasá el material e intentá nuevamente.'}
      </p>
      {quizResult.passed ? (
        <button className="btn-cert" onClick={() => setShowCertificado(true)}>
          <Award size={20} /> Ver Certificado
        </button>
      ) : (
        <button className="btn-complete-mod" style={{ marginTop: '24px' }} onClick={() => { setPlayerView('quiz'); setQuizAnswers({}); setQuizResult(null); }}>
          Reintentar Cuestionario
        </button>
      )}
    </motion.div>
  );

  const toEmbedUrl = (url) => {
    if (!url) return url;
    // Ya es embed
    if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com')) return url;
    // youtu.be/ID
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    // youtube.com/watch?v=ID
    const watchMatch = url.match(/youtube\.com\/watch\?.*v=([^&]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    // vimeo.com/ID
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  const renderContentBlocks = (content) => {
    try {
      const blocks = JSON.parse(content);
      if (!Array.isArray(blocks)) return <p>{content}</p>;

      return blocks.map((block, i) => {
        switch (block.tipo) {
          case 'texto':
            return <p key={i} className="player-text-block">{block.contenido}</p>;
          case 'banner':
            return (
              <div 
                key={i} 
                className="player-banner-block"
                style={{ backgroundColor: block.metadata?.bg_color, color: block.metadata?.text_color }}
              >
                {block.contenido}
              </div>
            );
          case 'imagen':
            return <img key={i} src={block.contenido} className="player-img-block" alt="Contenido" />;
          case 'video':
            return (
              <div key={i} className="player-video-block">
                <iframe src={toEmbedUrl(block.contenido)} frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Video Content" />
              </div>
            );
          case 'cards':
            const items = JSON.parse(block.contenido || '[]');
            return (
              <div key={i} className="player-cards-grid">
                {items.map((item, idx) => (
                  <div key={idx} className="player-item-card">
                    <h4>{item.label}</h4>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            );
          default:
            return null;
        }
      });
    } catch (e) {
      return <p>{content}</p>;
    }
  };

  if (isLoading) return <div className="player-loading">Preparando tu curso...</div>;

  return (
    <>
    <div className="course-player-container">
      <div className="player-toolbar">
        <button className="btn-back-catalog" onClick={onBack}><ChevronLeft size={20} /> Salir</button>
        <div className="player-course-title">
          <h3>{course.titulo}</h3>
          <span className="badge-cat" style={{ backgroundColor: course.categoria?.color }}>{course.categoria?.nombre}</span>
        </div>
        <div className="player-global-progress">
           <div className="progress-text">{progressPercent}% completado</div>
           <div className="progress-bar-mini"><div className="fill" style={{ width: `${progressPercent}%` }}></div></div>
        </div>
      </div>

      <div className="player-main-layout">
        <aside className="player-sidebar">
          <div className="sidebar-title">Índice del Curso</div>
          <div className="modules-nav">
            {modules.map((mod, idx) => {
              const isCompleted = completedModules.includes(mod.id);
              const isActive = activeModule?.id === mod.id && playerView === 'modules';
              return (
                <button key={mod.id} className={`mod-nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} onClick={() => { setActiveModule(mod); setPlayerView('modules'); }}>
                  <div className="mod-status-icon">{isCompleted ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}</div>
                  <div className="mod-nav-info"><span className="mod-idx">Módulo {idx + 1}</span><span className="mod-name">{mod.titulo}</span></div>
                </button>
              );
            })}
            {hasQuiz && (
              <button
                className={`mod-nav-item quiz-nav-item ${playerView === 'quiz' || playerView === 'result' ? 'active' : ''} ${quizResult?.passed ? 'completed' : ''}`}
                onClick={() => progressPercent === 100 && setPlayerView('quiz')}
                disabled={progressPercent < 100}
                style={{ opacity: progressPercent < 100 ? 0.4 : 1, marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}
              >
                <div className="mod-status-icon">
                  {quizResult?.passed ? <CheckCircle2 size={18} /> : progressPercent < 100 ? <Lock size={18} /> : <HelpCircle size={18} />}
                </div>
                <div className="mod-nav-info">
                  <span className="mod-idx">Evaluación</span>
                  <span className="mod-name">Cuestionario Final</span>
                </div>
              </button>
            )}
          </div>
        </aside>

        <main className="player-viewer">
          {playerView === 'quiz' && renderQuizView()}
          {playerView === 'result' && renderResultView()}
          {playerView === 'modules' && (activeModule ? (
            <motion.div key={activeModule.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="module-content-wrapper">
              <div className="module-header"><h2>{activeModule.titulo}</h2></div>
              <div className="module-render-area">{renderContentBlocks(activeModule.contenido)}</div>
              <div className="module-footer">
                {!completedModules.includes(activeModule.id) ? (
                  <button className="btn-complete-mod" onClick={handleComplete}><CheckCircle2 size={20} /> Marcar como Finalizado</button>
                ) : progressPercent === 100 && hasQuiz ? (
                  <button className="btn-complete-mod" onClick={() => setPlayerView('quiz')} style={{ background: '#1a1a1a', color: '#F2DC00' }}>
                    <HelpCircle size={20} /> Ir al Cuestionario Final
                  </button>
                ) : progressPercent === 100 && !hasQuiz ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="completed-notice"><Award size={24} /> ¡Módulo completado!</div>
                    <button className="btn-cert" onClick={() => setShowCertificado(true)}>
                      <Award size={18} /> Ver Certificado
                    </button>
                  </div>
                ) : (
                  <div className="completed-notice"><Award size={24} /> ¡Módulo completado!</div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="empty-player"><Trophy size={64} className="text-primary" /><h2>¡Felicidades!</h2><p>Has terminado el curso.</p></div>
          ))}
        </main>
      </div>
    </div>

    <AnimatePresence>
      {showCertificado && (
        <Certificado
          course={course}
          result={quizResult}
          userEmail={userEmail}
          onClose={() => setShowCertificado(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
};

export default CoursePlayer;
