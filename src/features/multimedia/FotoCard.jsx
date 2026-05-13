import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Download, Trash2, Tag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toggleLike, getFotoSignedUrl } from '../../services/multimediaService';

const FotoCard = ({ foto, onDelete, onClick }) => {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const likeCount = foto.likes?.length ?? 0;
  const comentarioCount = foto.comentarios?.length ?? 0;
  const liked = foto.likes?.some(l => l.user_id === userId) ?? false;

  const [isLiked, setIsLiked] = useState(liked);
  const [likes, setLikes] = useState(likeCount);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setIsLiked(foto.likes?.some(l => l.user_id === userId) ?? false);
    setLikes(foto.likes?.length ?? 0);
  }, [foto.likes, userId]);

  const handleLike = async (e) => {
    e.stopPropagation();
    const prev = isLiked;
    setIsLiked(!prev);
    setLikes(n => prev ? n - 1 : n + 1);
    await toggleLike(foto.id, userId);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    setDownloading(true);
    const { url } = await getFotoSignedUrl(foto.imagen_url);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = foto.titulo || 'foto';
      a.click();
    }
    setDownloading(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`¿Eliminar "${foto.titulo}"?`)) onDelete(foto.id, foto.imagen_url);
  };

  const etiquetas = foto.etiquetas?.map(e => e.etiqueta).filter(Boolean) ?? [];

  return (
    <div className="foto-card" onClick={onClick}>
      <div className="foto-card-img-wrap">
        <FotoImage path={foto.imagen_url} alt={foto.titulo} />

        {/* Overlay hover con acciones */}
        <div className="foto-card-overlay">
          <div className="foto-card-overlay-actions">
            <button className={`foto-overlay-btn${isLiked ? ' liked' : ''}`} onClick={handleLike}>
              <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
              <span>{likes}</span>
            </button>
            <button className="foto-overlay-btn" onClick={onClick}>
              <MessageCircle size={22} />
              <span>{comentarioCount}</span>
            </button>
            <button className="foto-overlay-btn" onClick={handleDownload} disabled={downloading}>
              <Download size={22} />
            </button>
          </div>
        </div>

        {isAdmin && (
          <button className="foto-card-delete" onClick={handleDelete} title="Eliminar">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="foto-card-body">
        <div className="foto-card-top-row">
          <p className="foto-card-titulo">{foto.titulo}</p>
          <button className="foto-card-download-btn" onClick={handleDownload} disabled={downloading} title="Descargar">
            <Download size={14} />
          </button>
        </div>
        <div className="foto-card-stats">
          <span className={`foto-card-stat${isLiked ? ' liked' : ''}`}>
            <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
            {likes}
          </span>
          <span className="foto-card-stat">
            <MessageCircle size={13} />
            {comentarioCount}
          </span>
        </div>
        {etiquetas.length > 0 && (
          <div className="foto-card-tags">
            {etiquetas.map(et => (
              <span key={et.id} className="foto-tag">{et.nombre}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Carga la signed URL y muestra la imagen
const FotoImage = ({ path, alt }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getFotoSignedUrl(path).then(({ url }) => {
      if (!cancelled) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [path]);

  return src
    ? <img src={src} alt={alt} className="foto-card-img" loading="lazy" />
    : <div className="foto-card-img-skeleton" />;
};

export default FotoCard;
