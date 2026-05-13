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

const MultimediaTab = () => {
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
    if (!window.confirm('¿Eliminar esta foto? La acción no se puede deshacer.')) return;
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
    if (!window.confirm('¿Eliminar esta etiqueta? Se quitará de todas las fotos.')) return;
    const { error } = await deleteEtiqueta(id);
    if (error) return showToast('Error al eliminar la etiqueta', 'error');
    setEtiquetas(prev => prev.filter(e => e.id !== id));
    showToast('Etiqueta eliminada', 'success');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>
            Contenido Multimedia
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            {fotos.length} foto{fotos.length !== 1 ? 's' : ''} · {etiquetas.length} etiqueta{etiquetas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`admin-tab${view === 'fotos' ? ' active' : ''}`}
            style={{ padding: '8px 16px' }}
            onClick={() => setView('fotos')}
          >
            <Images size={16} /> Fotos
          </button>
          <button
            className={`admin-tab${view === 'etiquetas' ? ' active' : ''}`}
            style={{ padding: '8px 16px' }}
            onClick={() => setView('etiquetas')}
          >
            <Tag size={16} /> Etiquetas
          </button>
          {view === 'fotos' && (
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowSubir(true)}>
              <Plus size={16} /> Subir foto
            </button>
          )}
        </div>
      </div>

      {view === 'fotos' && (
        isLoading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando fotos...</p>
        ) : fotos.length === 0 ? (
          <EmptyState icon={<Images size={36} />} title="Sin fotos" description="Subí la primera foto con el botón de arriba." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {fotos.map(foto => (
              <AdminFotoCard key={foto.id} foto={foto} onDelete={handleDeleteFoto} etiquetas={etiquetas} />
            ))}
          </div>
        )
      )}

      {view === 'etiquetas' && (
        <div style={{ maxWidth: 480 }}>
          <form onSubmit={handleAddEtiqueta} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              className="subir-foto-input"
              style={{ flex: 1 }}
              placeholder="Nueva etiqueta..."
              value={nuevaEtiqueta}
              onChange={e => setNuevaEtiqueta(e.target.value)}
              maxLength={40}
            />
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Crear
            </button>
          </form>

          {etiquetas.length === 0 ? (
            <EmptyState icon={<Tag size={32} />} title="Sin etiquetas" description="Creá la primera etiqueta arriba." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {etiquetas.map(et => (
                <div key={et.id} className="portales-tab-row">
                  <div className="portales-tab-info">
                    <span className="portales-tab-titulo">{et.nombre}</span>
                  </div>
                  <button
                    className="btn-danger-sm"
                    onClick={() => handleDeleteEtiqueta(et.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              ))}
            </div>
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
const AdminFotoCard = ({ foto, onDelete, etiquetas }) => {
  const tags = foto.etiquetas?.map(e => e.etiqueta).filter(Boolean) ?? [];
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <div style={{ aspectRatio: '4/3', background: 'var(--bg-secondary)', position: 'relative' }}>
        <AdminFotoThumb path={foto.imagen_url} alt={foto.titulo} />
      </div>
      <div style={{ padding: '10px 12px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {foto.titulo}
        </p>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {tags.map(t => (
              <span key={t.id} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                {t.nombre}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {foto.likes?.length ?? 0} likes · {foto.comentarios?.length ?? 0} comentarios
          </span>
          <button
            onClick={() => onDelete(foto.id, foto.imagen_url)}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 4 }}
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

import { getFotoSignedUrl } from '../../../services/multimediaService';

const AdminFotoThumb = ({ path, alt }) => {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getFotoSignedUrl(path).then(({ url }) => { if (!cancelled) setSrc(url); });
    return () => { cancelled = true; };
  }, [path]);
  return src
    ? <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)' }} />;
};

export default MultimediaTab;
