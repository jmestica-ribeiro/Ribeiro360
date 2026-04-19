import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './BannerNovedades.css';

const AUTO_PLAY_MS = 5000;

const getPublicUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from('novedades').getPublicUrl(path);
  return data?.publicUrl || null;
};

const BannerNovedades = ({ novedades }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const count = novedades.length;

  const next = useCallback(() => setCurrent(c => (c + 1) % count), [count]);
  const prev = () => setCurrent(c => (c - 1 + count) % count);

  useEffect(() => {
    if (count <= 1 || paused) return;
    timerRef.current = setInterval(next, AUTO_PLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [count, paused, next]);

  if (count === 0) return null;

  return (
    <div
      className="banner-nov"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div className="banner-nov-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {novedades.map((n) => {
          const imgSrc = getPublicUrl(n.imagen_url);
          return (
            <div key={n.id} className="banner-nov-slide">
              {imgSrc
                ? <img src={imgSrc} alt={n.titulo || ''} className="banner-nov-img" draggable={false} />
                : <div className="banner-nov-placeholder" />
              }
              {(n.titulo || n.link_url) && (
                <div className="banner-nov-caption">
                  {n.titulo && <span className="banner-nov-title">{n.titulo}</span>}
                  {n.link_url && (
                    <a href={n.link_url} target="_blank" rel="noopener noreferrer" className="banner-nov-link">
                      Ver más <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Flechas */}
      {count > 1 && (
        <>
          <button className="banner-nov-arrow left" onClick={prev} aria-label="Anterior">
            <ChevronLeft size={20} />
          </button>
          <button className="banner-nov-arrow right" onClick={next} aria-label="Siguiente">
            <ChevronRight size={20} />
          </button>

          {/* Dots */}
          <div className="banner-nov-dots">
            {novedades.map((_, i) => (
              <button
                key={i}
                className={`banner-nov-dot${i === current ? ' active' : ''}`}
                onClick={() => setCurrent(i)}
                aria-label={`Ir a novedad ${i + 1}`}
              />
            ))}
          </div>

          {/* Barra de progreso */}
          <div className="banner-nov-progress">
            <div
              key={`${current}-${paused}`}
              className={`banner-nov-progress-fill${paused ? ' paused' : ''}`}
              style={{ animationDuration: `${AUTO_PLAY_MS}ms` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default BannerNovedades;
