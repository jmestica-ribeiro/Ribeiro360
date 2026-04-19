import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Building2, Briefcase, FileText, CheckCircle, Clock, Users, Shield, GraduationCap, Award, Rocket, Heart, Coffee, HelpCircle, Bell, Star, Info, Loader2 } from 'lucide-react';
import { fetchOnboardingContenido } from '../../services/onboardingService';
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

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOnboardingContenido()
      .then(({ data }) => setSteps(data))
      .catch(err => console.error('Error al cargar el onboarding:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
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
          <p 
            key={block.id} 
            className="step-text-block"
            style={{ fontWeight: metadata.is_bold ? 'bold' : 'normal' }}
          >
            {block.contenido}
          </p>
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
          <div className="progress-line" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}></div>
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
