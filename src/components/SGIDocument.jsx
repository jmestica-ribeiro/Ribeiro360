import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Download, FileText, Folder, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './SGI.css'; // Reutilizamos los estilos de tabla y otros compartidos de SGI
import './SGIDocument.css';

const getCatSlug = (nombre) =>
  nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

const SGIDocument = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [documento, setDocumento] = useState(null);
  const [versiones, setVersiones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [docId]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: docData } = await supabase
      .from('sgi_documentos')
      .select('*, categoria:sgi_categorias(nombre, color, icono)')
      .eq('id', docId)
      .single();

    if (docData) {
      setDocumento(docData);
      const { data: verData } = await supabase
        .from('sgi_versiones')
        .select('*')
        .eq('documento_id', docId)
        .order('numero_version', { ascending: true });
      setVersiones(verData || []);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="sgi-loading">Cargando documento...</div>;
  }

  if (!documento) {
    return (
      <div className="sgi-container">
        <div className="sgi-empty">
          <FileText size={40} />
          <p>El documento no existe o fue eliminado.</p>
          <button className="btn-sgi-secondary" onClick={() => navigate('/sgi')}>Volver a SGI</button>
        </div>
      </div>
    );
  }

  const vigenteVersion = versiones.find(v => v.vigente) || versiones[0];

  return (
    <div className="sgi-doc-page">
      <div className="sgi-doc-header-nav">
        <button 
          className="sgi-back-btn" 
          onClick={() => navigate(documento.categoria ? `/sgi/${getCatSlug(documento.categoria.nombre)}` : '/sgi')}
        >
          <ChevronLeft size={18} /> Volver a {documento.categoria?.nombre || 'SGI'}
        </button>
      </div>

      <motion.div 
        className="sgi-doc-content-wrapper"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="sgi-doc-hero" style={{ borderTopColor: documento.categoria?.color || '#6366f1' }}>
          <div className="sgi-doc-hero-left">
            <div className="sgi-doc-badge-group">
              {documento.codigo && <span className="sgi-doc-code-badge">{documento.codigo}</span>}
              <span 
                className="sgi-doc-cat-badge" 
                style={{ backgroundColor: (documento.categoria?.color || '#6366f1') + '15', color: documento.categoria?.color || '#6366f1' }}
              >
                {documento.categoria?.nombre}
              </span>
            </div>
            <h1 className="sgi-doc-hero-title">{documento.titulo}</h1>
            <p className="sgi-doc-hero-desc">{documento.descripcion || 'Sin descripción disponible para este documento.'}</p>
          </div>

          <div className="sgi-doc-hero-right">
            {vigenteVersion && vigenteVersion.archivo_url ? (
              <button
                className="sgi-download-box"
                onClick={async () => {
                  const { data } = await supabase.storage.from('sgi-documentos').createSignedUrl(vigenteVersion.archivo_url, 60);
                  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                }}
              >
                <div className="sgi-dl-icon"><Download size={24} /></div>
                <div className="sgi-dl-info">
                  <span className="sgi-dl-action">Descargar Documento</span>
                  <span className="sgi-dl-meta">Rev. {vigenteVersion.numero_version} • Vigente</span>
                </div>
              </button>
            ) : (
              <div className="sgi-no-file-box">
                <FileText size={20} />
                <span>Archivo no disponible</span>
              </div>
            )}
          </div>
        </div>

        <div className="sgi-detail-tables sgi-tables-expanded">
          {/* Tabla: Información del documento */}
          <div className="sgi-info-table">
            <div className="sgi-table-title">Información del Documento</div>
            <table>
              <tbody>
                <tr><td className="sgi-td-label">Código</td><td>{documento.codigo || '—'}</td></tr>
                <tr><td className="sgi-td-label">Título</td><td>{documento.titulo}</td></tr>
                <tr><td className="sgi-td-label">Descripción</td><td>{documento.descripcion || '—'}</td></tr>
                <tr><td className="sgi-td-label">Tipo de documento</td><td>{documento.tipo_documento || '—'}</td></tr>
                <tr><td className="sgi-td-label">Acceso</td><td>{documento.acceso || '—'}</td></tr>
                <tr><td className="sgi-td-label">Lugar Ubicación</td><td>{documento.lugar_ubicacion || '—'}</td></tr>
                <tr><td className="sgi-td-label">Período de Retención</td><td>{documento.periodo_retencion || '—'}</td></tr>
                {documento.etiquetas && <tr><td className="sgi-td-label">Etiquetas</td><td>{documento.etiquetas}</td></tr>}
                <tr>
                  <td className="sgi-td-label">Estado</td>
                  <td>
                    <span className={`sgi-estado-badge ${(documento.estado || 'Publicado').toLowerCase().replace(' ', '-')}`}>
                      {documento.estado || 'Publicado'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabla: Registro de aprobación */}
          <div className="sgi-info-table">
            <div className="sgi-table-title">Registro de Aprobación</div>
            <table>
              <thead>
                <tr>
                  <th>Revisor</th>
                  <th>Aprobador</th>
                  <th>Fecha</th>
                  <th>Revisión</th>
                </tr>
              </thead>
              <tbody>
                {vigenteVersion ? (
                  <tr>
                    <td>{vigenteVersion.revisor || '—'}</td>
                    <td>{vigenteVersion.aprobador || '—'}</td>
                    <td>{vigenteVersion.fecha_emision ? new Date(vigenteVersion.fecha_emision + 'T00:00:00').toLocaleDateString('es-AR') : '—'}</td>
                    <td>Rev. {vigenteVersion.numero_version}</td>
                  </tr>
                ) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Sin versión vigente</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tabla: Historial de revisiones */}
          <div className="sgi-info-table">
            <div className="sgi-table-title">Historial de Revisiones</div>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Revisión</th>
                  <th>Histórico de Cambios</th>
                  <th style={{ textAlign: 'center' }}>Archivo</th>
                </tr>
              </thead>
              <tbody>
                {versiones.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Sin versiones registradas</td></tr>
                ) : (
                  versiones.map(ver => (
                    <tr key={ver.id} className={ver.vigente ? 'sgi-row-vigente' : ''}>
                      <td style={{ width: '12%' }}>
                        {ver.fecha_emision ? new Date(ver.fecha_emision + 'T00:00:00').toLocaleDateString('es-AR') : '—'}
                      </td>
                      <td style={{ width: '15%' }}>
                        Rev. {ver.numero_version} {ver.vigente && <span className="sgi-vigente-tag">Vigente</span>}
                      </td>
                      <td className="sgi-notas-cell" style={{ lineHeight: '1.5' }}>
                        {ver.notas_cambios || '—'}
                      </td>
                      <td style={{ width: '10%', textAlign: 'center' }}>
                        {ver.archivo_url && (ver.vigente || isAdmin) ? (
                          <button
                            className="sgi-download-btn-small"
                            title={ver.vigente ? "Descargar versión vigente" : "Descargar versión antigua (Solo Admin)"}
                            onClick={async () => {
                              const { data } = await supabase.storage.from('sgi-documentos').createSignedUrl(ver.archivo_url, 60);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }}
                          >
                            <Download size={16} />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SGIDocument;
