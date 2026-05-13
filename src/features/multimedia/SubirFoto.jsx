import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Upload, X, Tag, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadFoto } from '../../services/multimediaService';
import { useToast } from '../../components/common';

const SubirFoto = ({ etiquetas, onUploaded, onClose }) => {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivo(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    setArchivo(file);
    setPreview(URL.createObjectURL(file));
  };

  const toggleTag = (id) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!archivo || !titulo.trim()) return;
    setSubiendo(true);
    const { error } = await uploadFoto({
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      archivo,
      etiquetaIds: selectedTags,
      uploadedBy: session.user.id,
    });
    setSubiendo(false);
    if (error) return showToast('Error al subir la foto: ' + error.message, 'error');
    showToast('Foto publicada correctamente', 'success');
    onUploaded();
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
        className="subir-foto-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="subir-foto-header">
          <h3>Subir foto</h3>
          <button className="foto-detalle-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form className="subir-foto-form" onSubmit={handleSubmit}>
          <div
            className={`subir-foto-dropzone${preview ? ' has-preview' : ''}`}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('foto-file-input').click()}
          >
            {preview
              ? <img src={preview} alt="preview" className="subir-foto-preview" />
              : <>
                  <Upload size={32} className="subir-foto-icon" />
                  <p>Arrastrá una imagen o hacé clic para seleccionar</p>
                  <span>JPG, PNG, WebP, GIF</span>
                </>
            }
            <input
              id="foto-file-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </div>

          <div className="subir-foto-fields">
            <label className="subir-foto-label">
              Título *
              <input
                className="subir-foto-input"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej: Obra en Parque Industrial"
                maxLength={120}
                required
              />
            </label>

            <label className="subir-foto-label">
              Descripción
              <textarea
                className="subir-foto-input subir-foto-textarea"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Descripción opcional..."
                maxLength={400}
                rows={3}
              />
            </label>

            {etiquetas.length > 0 && (
              <div>
                <p className="subir-foto-label" style={{ marginBottom: 8 }}>Etiquetas</p>
                <div className="subir-foto-tags">
                  {etiquetas.map(et => (
                    <button
                      key={et.id}
                      type="button"
                      className={`foto-tag selectable${selectedTags.includes(et.id) ? ' selected' : ''}`}
                      onClick={() => toggleTag(et.id)}
                    >
                      {selectedTags.includes(et.id) ? <X size={10} /> : <Plus size={10} />}
                      {et.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="subir-foto-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={subiendo}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={subiendo || !archivo || !titulo.trim()}
            >
              {subiendo ? 'Subiendo...' : 'Publicar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  , document.body);
};

export default SubirFoto;
