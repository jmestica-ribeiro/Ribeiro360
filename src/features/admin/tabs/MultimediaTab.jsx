import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Images } from 'lucide-react';
import {
  fetchFotos,
  fetchEtiquetas,
  deleteFoto,
  saveEtiqueta,
  deleteEtiqueta,
} from '../../../services/multimediaService';
import { EmptyState, useToast } from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import SubirFoto from '../../multimedia/SubirFoto';
import { useConfirm } from '../../../contexts/ConfirmContext';

const MultimediaTab = () => {
  const confirm = useConfirm();
  const { session } = useAuth();
  const { showToast } = useToast();
  const [fotos, setFotos] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [showSubir, setShowSubir] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('fotos'); // 'fotos' | 'etiquetas'

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [fotosRes, etiquetasRes] = await Promise.all([fetchFotos(), fetchEtiquetas()]);
    setFotos(fotosRes.data);
    setEtiquetas(etiquetasRes.data);
    setIsLoading(false);
  };

  const handleDeleteFoto = async (id, imagenUrl) => {
    if (!(await confirm({ message: '¿Eliminar esta foto? La acción no se puede deshacer.', destructive: true }))) return;
    const { error } = await deleteFoto(id, imagenUrl);
    if (error) return showToast('Error al eliminar la foto', 'error');
    setFotos(prev => prev.filter(f => f.id !== id));
    showToast('Foto eliminada', 'success');
  };

  const handleAddEtiqueta = async (e) => {
    e.preventDefault();
    if (!nuevaEtiqueta.trim()) return;
    const { data, error } = await saveEtiqueta(nuevaEtiqueta);
    if (error) return showToast(error.message.includes('unique') ? 'Esa etiqueta ya existe' : error.message, 'error');
    setEtiquetas(prev => [...prev, data]);
    setNuevaEtiqueta('');
    showToast('Etiqueta creada', 'success');
  };

  const handleDeleteEtiqueta = async (id) => {
    if (!(await confirm({ message: '¿Eliminar esta etiqueta? Se quitará de todas las fotos.', destructive: true }))) return;
    const { error } = await deleteEtiqueta(id);
    if (error) return showToast('Error al eliminar la etiqueta', 'error');
    setEtiquetas(prev => prev.filter(e => e.id !== id));
    showToast('Etiqueta eliminada', 'success');
  };

  return (
    <div>
      <div className="adm-pane-head adm-pane-head--row">
        <div>
          <h3>Contenido Multimedia</h3>
          <p>
            {fotos.length} foto{fotos.length !== 1 ? 's' : ''} · {etiquetas.length} etiqueta{etiquetas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="adm-pane-actions">
          <div className="org-segmented" role="tablist" aria-label="Vista">
            <button type="button" role="tab" aria-selected={view === 'fotos'} className={view === 'fotos' ? 'active' : ''} onClick={() => setView('fotos')}>
              <Images size={15} strokeWidth={1.5} /> Fotos
            </button>
            <button type="button" role="tab" aria-selected={view === 'etiquetas'} className={view === 'etiquetas' ? 'active' : ''} onClick={() => setView('etiquetas')}>
              <Tag size={15} strokeWidth={1.5} /> Etiquetas
            </button>
          </div>
          {view === 'fotos' && (
            <button type="button" className="btn-add-admin" onClick={() => setShowSubir(true)}>
              <Plus size={16} strokeWidth={1.5} /> Subir foto
            </button>
          )}
        </div>
      </div>

      {view === 'fotos' && (
        isLoading ? (
          <p className="adm-empty">Cargando fotos...</p>
        ) : fotos.length === 0 ? (
          <EmptyState icon={<Images size={36} />} title="Sin fotos" description="Subí la primera foto con el botón de arriba." />
        ) : (
          <div className="adm-photo-grid">
            {fotos.map(foto => (
              <AdminFotoCard key={foto.id} foto={foto} onDelete={handleDeleteFoto} etiquetas={etiquetas} />
            ))}
          </div>
        )
      )}

      {view === 'etiquetas' && (
        <div className="adm-narrow">
          <form onSubmit={handleAddEtiqueta} className="adm-inline-form">
            <label className="org-search">
              <Tag size={16} strokeWidth={1.5} aria-hidden="true" />
              <input
                placeholder="Nueva etiqueta..."
                aria-label="Nueva etiqueta"
                value={nuevaEtiqueta}
                onChange={e => setNuevaEtiqueta(e.target.value)}
                maxLength={40}
              />
            </label>
            <button type="submit" className="btn-add-admin">
              <Plus size={16} strokeWidth={1.5} /> Crear
            </button>
          </form>

          {etiquetas.length === 0 ? (
            <EmptyState icon={<Tag size={32} />} title="Sin etiquetas" description="Creá la primera etiqueta arriba." />
          ) : (
            <ul className="adm-list">
              {etiquetas.map(et => (
                <li key={et.id} className="adm-row">
                  <span className="adm-row-icon"><Tag size={16} strokeWidth={1.5} /></span>
                  <div className="adm-row-info">
                    <div className="adm-row-title">{et.nombre}</div>
                  </div>
                  <div className="adm-actions hover-reveal">
                    <button type="button" className="adm-action danger" aria-label={`Eliminar etiqueta ${et.nombre}`} onClick={() => handleDeleteEtiqueta(et.id)}>
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showSubir && (
        <SubirFoto
          etiquetas={etiquetas}
          onUploaded={() => { setShowSubir(false); loadData(); }}
          onClose={() => setShowSubir(false)}
        />
      )}
    </div>
  );
};

// Mini card para la vista admin
const AdminFotoCard = ({ foto, onDelete }) => {
  const tags = foto.etiquetas?.map(e => e.etiqueta).filter(Boolean) ?? [];
  return (
    <article className="adm-photo-card">
      <div className="adm-photo-media">
        <AdminFotoThumb src={foto.imagen_signed_url} alt={foto.titulo} />
        <div className="adm-photo-overlay">
          <button
            type="button"
            className="adm-action danger adm-photo-del"
            onClick={() => onDelete(foto.id, foto.imagen_url)}
            aria-label={`Eliminar foto ${foto.titulo}`}
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="adm-photo-body">
        <p className="adm-photo-title adm-ellipsis">{foto.titulo}</p>
        {tags.length > 0 && (
          <div className="adm-photo-tags">
            {tags.map(t => <span key={t.id} className="adm-badge neutral">{t.nombre}</span>)}
          </div>
        )}
        <span className="adm-photo-meta">
          {foto.likes?.length ?? 0} likes · {foto.comentarios?.length ?? 0} comentarios
        </span>
      </div>
    </article>
  );
};

// La signed URL ya viene resuelta en batch desde fetchFotos (evita 1 llamada por thumbnail)
const AdminFotoThumb = ({ src, alt }) => (
  src
    ? <img src={src} alt={alt} loading="lazy" />
    : <div className="adm-photo-placeholder" />
);

export default MultimediaTab;
