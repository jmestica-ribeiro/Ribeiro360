import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rss, Image as ImageIcon, Megaphone, Heart, MessageCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { fetchSocialFeed } from '../../services/socialService';
import FotoDetalle from '../multimedia/FotoDetalle';
import AnuncioDetalle from './AnuncioDetalle';
import { EmptyState } from '../../components/common';
import './Social.css';

const FILTROS = [
  { key: null,      label: 'Todo',      icon: Rss },
  { key: 'anuncio', label: 'Anuncios',  icon: Megaphone },
  { key: 'foto',    label: 'Fotos',     icon: ImageIcon },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function AnuncioCard({ item, onOpen }) {
  const { user } = useAuth();
  const likeCount = item.likes?.length ?? 0;
  const comentCount = item.comentarios?.length ?? 0;
  const liked = item.likes?.some(l => l.user_id === user?.id);

  return (
    <motion.div
      className="social-card social-card--anuncio"
      variants={cardVariants}
      onClick={() => onOpen(item)}
      style={{ cursor: 'pointer' }}
    >
      {item.imagen_url && (
        <div className="social-card-img">
          <img src={item.imagen_url} alt={item.titulo} loading="lazy" />
        </div>
      )}
      <div className="social-card-body">
        <span className="social-badge social-badge--anuncio">
          <Megaphone size={11} /> Anuncio
        </span>
        <p className="social-card-titulo">{item.titulo}</p>
        {item.created_at && (
          <span className="social-card-fecha">
            {new Date(item.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
        <div className="social-card-stats">
          <span className={liked ? 'liked' : ''}><Heart size={13} /> {likeCount}</span>
          <span><MessageCircle size={13} /> {comentCount}</span>
        </div>
      </div>
    </motion.div>
  );
}

function FotoCardSocial({ item, onOpen }) {
  const { user } = useAuth();
  const likeCount = item.likes?.length ?? 0;
  const comentCount = item.comentarios?.length ?? 0;
  const liked = item.likes?.some(l => l.user_id === user?.id);

  return (
    <motion.div
      className="social-card social-card--foto"
      variants={cardVariants}
      onClick={() => onOpen(item)}
    >
      <div className="social-card-img">
        {(item.imagen_signed_url ?? item.imagen_url)
          ? <img src={item.imagen_signed_url ?? item.imagen_url} alt={item.titulo} loading="lazy" />
          : <div className="social-card-img-placeholder"><ImageIcon size={32} /></div>
        }
      </div>
      <div className="social-card-body">
        <span className="social-badge social-badge--foto">
          <ImageIcon size={11} /> Foto
        </span>
        <p className="social-card-titulo">{item.titulo ?? 'Sin título'}</p>
        {item.created_at && (
          <span className="social-card-fecha">
            {new Date(item.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
        <div className="social-card-stats">
          <span className={liked ? 'liked' : ''}><Heart size={13} /> {likeCount}</span>
          <span><MessageCircle size={13} /> {comentCount}</span>
        </div>
      </div>
    </motion.div>
  );
}

const Social = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filtro, setFiltro] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [fotoDetalle, setFotoDetalle] = useState(null);
  const [anuncioDetalle, setAnuncioDetalle] = useState(null);
  const sentinelRef = useRef(null);
  const pageRef = useRef(0);
  const novedadesLoadedRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setPage(0);
    pageRef.current = 0;
    novedadesLoadedRef.current = false;
    const { data, hasMore: more } = await fetchSocialFeed({ page: 0, tipo: filtro });
    setItems(data);
    setHasMore(more);
    novedadesLoadedRef.current = true;
    setIsLoading(false);
  }, [filtro]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const { data, hasMore: more } = await fetchSocialFeed({ page: nextPage, tipo: filtro });
    // En páginas > 0 solo llegan fotos; filtrar duplicados por id
    setItems(prev => {
      const ids = new Set(prev.map(i => i.id));
      return [...prev, ...data.filter(i => !ids.has(i.id))];
    });
    setHasMore(more);
    pageRef.current = nextPage;
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, filtro]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleAnuncioLikeChange = (id, newCount, liked) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const likes = liked
        ? [...(i.likes ?? []), { user_id: profile?.id }]
        : (i.likes ?? []).filter(l => l.user_id !== profile?.id);
      return { ...i, likes };
    }));
    setAnuncioDetalle(prev => prev ? {
      ...prev,
      likes: liked
        ? [...(prev.likes ?? []), { user_id: profile?.id }]
        : (prev.likes ?? []).filter(l => l.user_id !== profile?.id),
    } : null);
  };

  return (
    <div className="social-page">
      <div className="social-header">
        <div>
          <h1>Social</h1>
          <p>Publicaciones, anuncios y fotos de la empresa</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
          <button className="btn-primary-sm" onClick={() => navigate('/admin')}>
            + Nueva publicación
          </button>
        )}
      </div>

      <div className="social-filtros">
        {FILTROS.map(({ key, label, icon: Icon }) => (
          <button
            key={String(key)}
            className={`social-filtro-btn${filtro === key ? ' active' : ''}`}
            onClick={() => setFiltro(key)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="social-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="social-card-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Rss size={40} />} message="No hay publicaciones todavía." />
      ) : (
        <motion.div
          className="social-grid"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          <AnimatePresence>
            {items.map(item =>
              item._type === 'anuncio'
                ? <AnuncioCard key={`a-${item.id}`} item={item} onOpen={setAnuncioDetalle} />
                : <FotoCardSocial key={`f-${item.id}`} item={item} onOpen={setFotoDetalle} />
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {(isLoadingMore || hasMore) && (
        <div ref={sentinelRef} className="social-sentinel">
          {isLoadingMore && <Loader2 size={20} className="social-spinner" />}
        </div>
      )}

      {anuncioDetalle && (
        <AnuncioDetalle
          anuncio={anuncioDetalle}
          onClose={() => setAnuncioDetalle(null)}
          onLikeChange={handleAnuncioLikeChange}
        />
      )}

      {fotoDetalle && (
        <FotoDetalle
          foto={fotoDetalle}
          onClose={() => setFotoDetalle(null)}
          onLikeChange={(id, newCount, liked) => {
            setItems(prev => prev.map(i => {
              if (i.id !== id) return i;
              const likes = liked
                ? [...(i.likes ?? []), { user_id: profile?.id }]
                : (i.likes ?? []).filter(l => l.user_id !== profile?.id);
              return { ...i, likes };
            }));
          }}
        />
      )}
    </div>
  );
};

export default Social;
