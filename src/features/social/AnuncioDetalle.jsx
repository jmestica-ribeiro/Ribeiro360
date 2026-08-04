import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Send, Trash2, Heart, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  toggleNovedadLike,
  fetchNovedadComentarios,
  addNovedadComentario,
  deleteNovedadComentario,
} from '../../services/novedadesService';

const AnuncioDetalle = ({ anuncio, onClose, onLikeChange }) => {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [isLiked, setIsLiked] = useState(anuncio.likes?.some(l => l.user_id === userId) ?? false);
  const [likes, setLikes] = useState(anuncio.likes?.length ?? 0);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchNovedadComentarios(anuncio.id).then(({ data }) => setComentarios(data));
  }, [anuncio.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comentarios]);

  const handleLike = async () => {
    const prev = isLiked;
    setIsLiked(!prev);
    const newCount = prev ? likes - 1 : likes + 1;
    setLikes(newCount);
    await toggleNovedadLike(anuncio.id, userId);
    onLikeChange?.(anuncio.id, newCount, !prev);
  };

  const handleSend = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    const { data } = await addNovedadComentario(anuncio.id, userId, texto.trim());
    if (data) setComentarios(prev => [...prev, data]);
    setTexto('');
    setEnviando(false);
  };

  const handleDeleteComentario = async (id) => {
    await deleteNovedadComentario(id);
    setComentarios(prev => prev.filter(c => c.id !== id));
  };

  return createPortal(
    <motion.div
      className="foto-detalle-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="foto-detalle-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <button className="foto-detalle-close" onClick={onClose}><X size={18} /></button>

        {anuncio.imagen_url && (
          <div className="foto-detalle-left">
            <img src={anuncio.imagen_url} alt={anuncio.titulo} className="foto-detalle-img" />
          </div>
        )}

        <div className="foto-detalle-right">
          <div className="foto-detalle-info">
            <h3 className="foto-detalle-titulo">{anuncio.titulo}</h3>
            {anuncio.created_at && (
              <div className="foto-detalle-meta">
                <span>Anuncio</span>
                <span>{new Date(anuncio.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            <div className="foto-detalle-acciones">
              <button className={`foto-action-btn${isLiked ? ' liked' : ''}`} onClick={handleLike}>
                <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                <span>{likes} {likes === 1 ? 'like' : 'likes'}</span>
              </button>
              {anuncio.link_url && (
                <a
                  href={anuncio.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="foto-action-btn"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={16} />
                  <span>Ver más</span>
                </a>
              )}
            </div>
          </div>

          <div className="foto-detalle-comentarios">
            <p className="foto-detalle-comentarios-titulo">Comentarios</p>
            <div className="foto-detalle-comentarios-list">
              {comentarios.length === 0 && (
                <p className="foto-detalle-no-comentarios">Sin comentarios todavía.</p>
              )}
              {comentarios.map(c => (
                <div key={c.id} className="foto-comentario">
                  <div className="foto-comentario-header">
                    <span className="foto-comentario-autor">{c.autor?.full_name ?? 'Empleado'}</span>
                    <span className="foto-comentario-fecha">
                      {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                    {(c.user_id === userId || isAdmin) && (
                      <button className="foto-comentario-delete" onClick={() => handleDeleteComentario(c.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="foto-comentario-texto">{c.contenido}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="foto-detalle-input-wrap">
              <input
                className="foto-detalle-input"
                placeholder="Escribí un comentario..."
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                maxLength={500}
              />
              <button
                className="foto-detalle-send"
                onClick={handleSend}
                disabled={enviando || !texto.trim()}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  , document.body);
};

export default AnuncioDetalle;
