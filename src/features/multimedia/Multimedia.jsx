import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Images, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../../contexts/AuthContext';
import { fetchFotos, fetchEtiquetas, deleteFoto } from '../../services/multimediaService';
import { EmptyState } from '../../components/common';
import FotoCard from './FotoCard';
import FotoDetalle from './FotoDetalle';
import SubirFoto from './SubirFoto';
import './Multimedia.css';

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const Multimedia = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const [fotos, setFotos] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [etiquetaActiva, setEtiquetaActiva] = useState(null);
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null);
  const [showSubir, setShowSubir] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  // Carga inicial / cambio de filtro
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setPage(0);
    const [fotosRes, etiquetasRes] = await Promise.all([
      fetchFotos({ etiquetaId: etiquetaActiva, page: 0 }),
      fetchEtiquetas(),
    ]);
    setFotos(fotosRes.data);
    setHasMore(fotosRes.hasMore);
    setEtiquetas(etiquetasRes.data);
    setIsLoading(false);
  }, [etiquetaActiva]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Carga de página siguiente
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const { data, hasMore: more } = await fetchFotos({ etiquetaId: etiquetaActiva, page: nextPage });
    setFotos(prev => [...prev, ...data]);
    setHasMore(more);
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, page, etiquetaActiva]);

  // IntersectionObserver sobre el sentinel
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

  const handleDelete = async (id, imagenUrl) => {
    await deleteFoto(id, imagenUrl);
    setFotos(prev => prev.filter(f => f.id !== id));
  };

  const handleLikeChange = (fotoId, newCount, newLiked) => {
    setFotos(prev => prev.map(f => {
      if (f.id !== fotoId) return f;
      const userId = profile?.id;
      const likes = newLiked
        ? [...(f.likes ?? []), { user_id: userId }]
        : (f.likes ?? []).filter(l => l.user_id !== userId);
      return { ...f, likes };
    }));
  };

  return (
    <div className="multimedia-container">
      <div className="multimedia-header">
        <div>
          <h1 className="multimedia-titulo">Galería Ribeiro</h1>
          <p className="multimedia-subtitulo">Fotos de nuestros proyectos y obras — descargalas y compartí.</p>
        </div>
        {isAdmin && (
          <button className="btn-primary multimedia-btn-subir" onClick={() => setShowSubir(true)}>
            <Plus size={18} /> Subir foto
          </button>
        )}
      </div>

      {etiquetas.length > 0 && (
        <div className="multimedia-filtros">
          <button
            className={`foto-tag filtro${etiquetaActiva === null ? ' selected' : ''}`}
            onClick={() => setEtiquetaActiva(null)}
          >
            Todas
          </button>
          {etiquetas.map(et => (
            <button
              key={et.id}
              className={`foto-tag filtro${etiquetaActiva === et.id ? ' selected' : ''}`}
              onClick={() => setEtiquetaActiva(etiquetaActiva === et.id ? null : et.id)}
            >
              {et.nombre}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="multimedia-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="foto-card-skeleton">
              <div className="skeleton-img" />
              <div className="skeleton-body">
                <div className="skeleton-line wide" />
                <div className="skeleton-line narrow" />
              </div>
            </div>
          ))}
        </div>
      ) : fotos.length === 0 ? (
        <EmptyState
          icon={<Images size={40} />}
          title="Sin fotos todavía"
          description={isAdmin ? 'Subí la primera foto con el botón de arriba.' : 'No hay fotos publicadas aún.'}
        />
      ) : (
        <>
          <motion.div
            className="multimedia-grid"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {fotos.map(foto => (
              <motion.div key={foto.id} variants={cardVariants}>
                <FotoCard
                  foto={foto}
                  onDelete={handleDelete}
                  onClick={() => setFotoSeleccionada(foto)}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Sentinel para IntersectionObserver */}
          <div ref={sentinelRef} className="multimedia-sentinel" />

          {isLoadingMore && (
            <div className="multimedia-loading-more">
              <Loader2 size={20} className="multimedia-spinner" />
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {fotoSeleccionada && (
          <FotoDetalle
            key="detalle"
            foto={fotoSeleccionada}
            onClose={() => setFotoSeleccionada(null)}
            onLikeChange={handleLikeChange}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubir && (
          <SubirFoto
            key="subir"
            etiquetas={etiquetas}
            onUploaded={() => { setShowSubir(false); loadData(); }}
            onClose={() => setShowSubir(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Multimedia;
