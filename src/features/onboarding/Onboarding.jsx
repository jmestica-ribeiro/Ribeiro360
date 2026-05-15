import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Building2, Briefcase, FileText, CheckCircle, Clock, Users, Shield, GraduationCap, Award, Rocket, Heart, Coffee, HelpCircle, Bell, Star, Info, PartyPopper } from 'lucide-react';
import { fetchOnboardingContenido, marcarInduccionCompletada } from '../../services/onboardingService';
import { useAuth } from '../../contexts/AuthContext';
import './Onboarding.css';

const iconMap = {
  building: <Building2 size={48} />,
  clock: <Clock size={48} />,
  briefcase: <Briefcase size={48} />,
  shield: <Shield size={48} />,
  users: <Users size={48} />,
  graduation: <GraduationCap size={48} />,
  award: <Award size={48} />,
  rocket: <Rocket size={48} />,
  heart: <Heart size={48} />,
  coffee: <Coffee size={48} />,
  star: <Star size={48} />,
  info: <Info size={48} />,
  bell: <Bell size={48} />,
  help: <HelpCircle size={48} />,
  default: <FileText size={48} />
};

// ── Confetti particle ────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#F2DC00', '#1A1A1A', '#3B82F6', '#10B981', '#E71D36', '#F59E0B', '#8B5CF6'];

function Confetti() {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 1.2,
    duration: 2.5 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));

  return (
    <div className="onboarding-confetti-wrap" aria-hidden>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="onboarding-confetti-particle"
          style={{ left: p.left, width: p.size, height: p.size, background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : 2 }}
          initial={{ y: -20, opacity: 1, rotate: p.rotate }}
          animate={{ y: '100vh', opacity: [1, 1, 0], rotate: p.rotate + 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

// ── Pantalla de Felicitaciones ───────────────────────────────────────────────
function PantallaFelicitaciones({ nombre, yaCompletada, onRehacer }) {
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const firstName = nombre?.split(' ')[0] || '';

  return (
    <motion.div
      className="onboarding-felicitaciones"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {showConfetti && !yaCompletada && <Confetti />}

      <div className="onboarding-felicitaciones-inner">
        {/* Logo / ícono central */}
        <motion.div
          className="onboarding-felicit-icon"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
        >
          <PartyPopper size={40} color="#111827" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p className="onboarding-felicit-eyebrow">
            {yaCompletada ? 'Inducción ya realizada' : '¡Inducción completada!'}
          </p>
          <h1 className="onboarding-felicit-title">
            Bienvenido/a{firstName ? ` a Ribeiro,` : ' a Ribeiro'}
            {firstName && <span className="onboarding-felicit-name"> {firstName}</span>}
          </h1>
          <p className="onboarding-felicit-sub">
            {yaCompletada
              ? 'Ya completaste tu proceso de inducción. Todo el contenido de la intranet está disponible para vos.'
              : 'Ya sos parte del equipo. Estamos muy contentos de tenerte con nosotros.'}
          </p>
        </motion.div>

        <motion.div
          className="onboarding-felicit-badges"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.45 }}
        >
          {[
            { icon: CheckCircle, label: 'Inducción completada', color: '#10B981' },
            { icon: Shield,      label: 'Acceso habilitado',    color: '#3B82F6' },
            { icon: Star,        label: 'Parte del equipo',     color: '#F59E0B' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="onboarding-felicit-badge">
              <Icon size={16} color={color} />
              <span>{label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <a href="/" className="onboarding-felicit-cta">
            Ir al Inicio <ChevronRight size={17} />
          </a>
          {yaCompletada && (
            <button className="onboarding-felicit-cta-secondary" onClick={onRehacer}>
              Rehacer inducción
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

const Onboarding = () => {
  const { profile, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const load = async () => {
      if (profile?.onboarding_completed) {
        setCompletado(true);
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await fetchOnboardingContenido();
        setSteps(data);
      } catch (err) {
        console.error('Error al cargar el onboarding:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [authLoading, profile]);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      if (profile?.id) await marcarInduccionCompletada(profile.id);
      setCompletado(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (isLoading) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-header">
           <div className="skeleton skeleton-header" style={{ margin: '0 auto' }}></div>
           <div className="skeleton skeleton-text" style={{ width: '40%', margin: '0 auto' }}></div>
        </div>
        <div className="onboarding-wizard" style={{ padding: '48px', gap: '32px' }}>
           <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-circle" style={{ width: '40px', height: '40px' }}></div>)}
           </div>
           <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '20px' }}></div>
              <div style={{ flex: 1 }}>
                 <div className="skeleton skeleton-header"></div>
                 <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
              </div>
           </div>
           <div className="skeleton" style={{ height: '200px', width: '100%', marginTop: '24px' }}></div>
        </div>
      </div>
    );
  }

  if (completado) {
    const handleRehacer = async () => {
      setCompletado(false);
      setCurrentStep(0);
      setIsLoading(true);
      const { data } = await fetchOnboardingContenido();
      setSteps(data);
      setIsLoading(false);
    };

    return (
      <div className="onboarding-container">
        <PantallaFelicitaciones
          nombre={profile?.full_name}
          yaCompletada={!!profile?.onboarding_completed}
          onRehacer={handleRehacer}
        />
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h2>No hay contenido disponible</h2>
          <p>Los administradores aún no han publicado pasos activos en la Base de Datos.</p>
        </div>
      </div>
    );
  }

  const currentData = steps[currentStep];

  const toEmbedUrl = (url) => {
    if (!url) return url;
    if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com')) return url;
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const watchMatch = url.match(/youtube\.com\/watch\?.*v=([^&]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  const renderBlock = (block) => {
    let metadata = {};
    try {
      if (block.metadata) {
        metadata = typeof block.metadata === 'string' ? JSON.parse(block.metadata) : block.metadata;
      }
    } catch(e) {}

    switch (block.tipo) {
      case 'texto':
        return (
          <div
            key={block.id}
            className="step-text-block step-rich-text"
            dangerouslySetInnerHTML={{ __html: block.contenido }}
          />
        );
      case 'banner':
        return (
          <div 
            key={block.id} 
            className="step-banner-block"
            style={{
              backgroundColor: metadata.bg_color || 'var(--primary-color)',
              color: metadata.text_color || '#fff',
              textAlign: metadata.align || 'center',
              padding: '32px 24px',
              borderRadius: 'var(--border-radius)',
              marginTop: '24px',
              fontWeight: '800',
              fontSize: '32px',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {block.contenido}
          </div>
        );
      case 'imagen':
        return <img key={block.id} src={block.contenido} alt="Visual content" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '16px' }} />;
      case 'cards':
        let cards = [];
        try { cards = JSON.parse(block.contenido || '[]'); } catch(e) {}
        return (
          <div key={block.id} className="step-cards-grid">
            {cards.map((card, idx) => (
              <div key={idx} className="step-card-item">
                <h4>{card.label}</h4>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
        );
      case 'timeline':
        let events = [];
        try { events = JSON.parse(block.contenido || '[]'); } catch(e) {}
        return (
          <div key={block.id} className="step-timeline">
            {events.map((event, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <span className="timeline-date">{event.label}</span>
                  <p>{event.desc}</p>
                </div>
              </div>
            ))}
          </div>
        );
      case 'servicios': {
        let servicios = [];
        try { servicios = JSON.parse(block.contenido || '[]'); } catch(e) {}
        return (
          <div key={block.id} className="step-servicios-wrap">
            {metadata.intro && (
              <p className="step-servicios-intro">{metadata.intro}</p>
            )}
            <div className="step-servicios-grid">
              {servicios.map((s, idx) => (
                <div key={idx} className="step-servicio-card">
                  <h4 className="step-servicio-titulo">{s.titulo}</h4>
                  {s.clientes && (
                    <span className="step-servicio-clientes">{s.clientes}</span>
                  )}
                  <div className="step-servicio-sep" />
                  {s.descripcion && (
                    <p className="step-servicio-desc">{s.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'video':
        return (
          <div key={block.id} className="step-video-block">
             <iframe
                width="100%"
                height="400"
                src={toEmbedUrl(block.contenido)}
                title="Video Content"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                style={{ borderRadius: '12px', marginTop: '16px' }}
             ></iframe>
          </div>
        );
      default:
        return <div key={block.id}>{block.contenido}</div>;
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <h2>Hola, te damos la bienvenida</h2>
        <p>Proceso de inducción institucional</p>
      </div>

      <div className="onboarding-wizard">
        {/* Progress Bar (Dynamic from Supabase) */}
        <div className="wizard-progress">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`progress-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            >
              <div className="step-indicator">
                {index < currentStep ? <CheckCircle size={16} /> : index + 1}
              </div>
              <span className="step-title-small">{step.titulo}</span>
            </div>
          ))}
          <div className="progress-line-track">
            <div className="progress-line-fill" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} />
          </div>
        </div>

        {/* Step Content with Animation */}
        <div className="wizard-content-wrapper">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              className="wizard-content"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <div className="step-header">
                <div className="step-icon">
                  {/* Map the icon string from DB to visual icon */}
                  {iconMap[currentData.icono] || iconMap.default}
                </div>
                <div className="step-titles">
                  <h2>{currentData.titulo}</h2>
                  <p>{currentData.subtitulo}</p>
                </div>
              </div>
              
              <div className="step-body" style={{ minHeight: '150px' }}>
                {currentData.blocks && currentData.blocks.length > 0 ? (
                  <div className="blocks-container">
                    {currentData.blocks.map(block => renderBlock(block))}
                  </div>
                ) : (
                  <div className="empty-blocks" style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    <p>Contenido en desarrollo. Pronto los administradores agregarán más información a esta sección.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="wizard-footer">
          <button 
            className="btn-secondary" 
            onClick={handlePrev} 
            disabled={currentStep === 0}
            style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
          >
            <ChevronLeft size={18} /> Anterior
          </button>
          
          <button 
            className="btn-primary" 
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? 'Finalizar Inducción' : 'Siguiente'} {currentStep !== steps.length - 1 && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
