import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, HelpCircle, X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './FAQ.css';

export default function FAQ() {
  const [preguntas, setPreguntas] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [activeSector, setActiveSector] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [openId, setOpenId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const [preguntasRes, sectoresRes] = await Promise.all([
      supabase.from('faq_preguntas').select('*, sector:faq_sectores(nombre, color, icono)')
        .eq('activo', true).order('sector_id').order('numero_orden'),
      supabase.from('faq_sectores').select('*').order('nombre')
    ]);
    if (preguntasRes.data) setPreguntas(preguntasRes.data);
    if (sectoresRes.data) setSectores(sectoresRes.data);
    setIsLoading(false);
  }

  const filtered = preguntas.filter(p => {
    const matchSector = activeSector === 'todos' || p.sector_id === activeSector;
    const matchSearch = !searchTerm ||
      p.pregunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.respuesta.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSector && matchSearch;
  });

  const grouped = filtered.reduce((acc, p) => {
    const key = p.sector?.nombre || 'General';
    if (!acc[key]) acc[key] = { color: p.sector?.color || '#ccc', items: [] };
    acc[key].items.push(p);
    return acc;
  }, {});

  return (
    <div className="faq-container">
      <div className="faq-header">
        <div>
          <h2>Preguntas Frecuentes</h2>
          <p>Encontrá respuestas rápidas a las consultas más comunes</p>
        </div>
        <div className="faq-header-stat">
          <span className="faq-stat-value">{preguntas.length}</span>
          <span className="faq-stat-label">Respuestas</span>
        </div>
      </div>

      <div className="faq-toolbar">
        <div className="faq-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar pregunta o tema..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setOpenId(null); }}
          />
          {searchTerm && (
            <button className="faq-clear" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="faq-sector-chips">
          <button
            className={`faq-chip ${activeSector === 'todos' ? 'active' : ''}`}
            onClick={() => { setActiveSector('todos'); setOpenId(null); }}
          >
            Todos los sectores
          </button>
          {sectores.map(s => (
            <button
              key={s.id}
              className={`faq-chip ${activeSector === s.id ? 'active' : ''}`}
              style={activeSector === s.id ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' } : {}}
              onClick={() => { setActiveSector(s.id); setOpenId(null); }}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="faq-skeleton">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="faq-empty">
          <HelpCircle size={48} />
          <h3>No encontramos resultados</h3>
          <p>Probá con otros términos o explorá los sectores disponibles.</p>
        </div>
      ) : (
        <div className="faq-content">
          {Object.entries(grouped).map(([sectorNombre, { color, items }]) => (
            <div key={sectorNombre} className="faq-sector-group">
              <div className="faq-sector-title">
                <span className="faq-sector-dot" style={{ backgroundColor: color }} />
                <h3>{sectorNombre}</h3>
                <span className="faq-sector-count">{items.length}</span>
              </div>
              <div className="faq-accordion">
                {items.map(p => (
                  <div key={p.id} className={`faq-item ${openId === p.id ? 'open' : ''}`}>
                    <button className="faq-question" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                      <span>{p.pregunta}</span>
                      <motion.div
                        animate={{ rotate: openId === p.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="faq-chevron"
                      >
                        <ChevronDown size={18} />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {openId === p.id && (
                        <motion.div
                          className="faq-answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                        >
                          <div className="faq-answer-inner">
                            <p>{p.respuesta}</p>
                            {p.links?.length > 0 && (
                              <div className="faq-links">
                                <span className="faq-links-label">Links de interés</span>
                                <div className="faq-links-list">
                                  {p.links.map((link, i) => (
                                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="faq-link-item">
                                      <ExternalLink size={13} />
                                      {link.titulo || link.url}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
