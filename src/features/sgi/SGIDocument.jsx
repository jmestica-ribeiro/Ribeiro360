import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
  ChevronLeft, Download, FileText, CheckCircle, ShieldCheck,
  Clock, XCircle, AlertCircle,
} from 'lucide-react';
import {
  fetchSgiDocumentoById, fetchSgiVersionesByDocumento, getSgiSignedUrl,
  reviewSgiVersion, approveSgiVersion, rejectSgiVersion,
} from '../../services/sgiService';
import { useAuth } from '../../contexts/AuthContext';
import './SGI.css';
import './SGIDocument.css';

const getCatSlug = (nombre) =>
  nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

const APROBACION_STEPS = [
  { key: 'creacion', label: 'Creación' },
  { key: 'en_revision', label: 'Revisión CMASS' },
  { key: 'pendiente_aprobacion', label: 'Aprobación Gerencia' },
  { key: 'aprobado', label: 'Vigente' },
];
const STEP_INDEX = { creacion: 0, en_revision: 1, pendiente_aprobacion: 2, aprobado: 3 };
const ESTADO_LABELS = {
  en_revision: 'En revisión CMASS',
  pendiente_aprobacion: 'Pendiente aprobación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

const SGIDocument = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [documento, setDocumento] = useState(null);
  const [versiones, setVersiones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [actionMode, setActionMode] = useState(null); // 'review' | 'approve' | 'reject'
  const [actionComment, setActionComment] = useState('');
  const [isActioning, setIsActioning] = useState(false);

  async function fetchData() {
    setIsLoading(true);
    const { data: docData } = await fetchSgiDocumentoById(docId);
    if (docData) {
      setDocumento(docData);
      const { data: verData } = await fetchSgiVersionesByDocumento(docId);
      setVersiones(verData);
    }
    setIsLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [docId]);

  const handleAction = async () => {
    if (!pendienteVersion || !actionMode) return;
    setIsActioning(true);
    if (actionMode === 'review') {
      await reviewSgiVersion(pendienteVersion.id, profile, actionComment || null);
    } else if (actionMode === 'approve') {
      await approveSgiVersion(pendienteVersion.id, documento.id, profile, actionComment || null);
    } else if (actionMode === 'reject') {
      await rejectSgiVersion(pendienteVersion.id, actionComment || null);
    }
    setActionMode(null);
    setActionComment('');
    setIsActioning(false);
    await fetchData();
  };

  if (isLoading) return <div className="sgi-loading">Cargando documento...</div>;

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

  const vigenteVersion = versiones.find(v => v.vigente) || null;
  const pendienteVersion = versiones.find(v =>
    v.estado_aprobacion === 'en_revision' ||
    v.estado_aprobacion === 'pendiente_aprobacion' ||
    v.estado_aprobacion === 'rechazado'
  ) || null;

  const currentEstado = pendienteVersion?.estado_aprobacion ?? (vigenteVersion ? 'aprobado' : null);
  const currentStepIdx = currentEstado === 'rechazado'
    ? (pendienteVersion?.revisor ? 2 : 1)
    : (STEP_INDEX[currentEstado] ?? 0);

  const isTester = profile?.email === 'juan.mestica@ribeirosrl.com.ar';
  const creadorDept = documento.creador?.department;
  const isRevisorCmass = profile?.department === 'CMASS' || isTester;
  const isAprobadorGerente = (profile?.job_title === 'Gerente' && !!creadorDept && profile?.department === creadorDept) || isTester;
  const showAprobacionCircuito = documento.documento_controlado && currentEstado;

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
        {/* ── Hero ── */}
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
            {vigenteVersion?.archivo_url ? (
              <button
                className="sgi-download-box"
                onClick={async () => {
                  const { data } = await getSgiSignedUrl(vigenteVersion.archivo_url, 60);
                  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                }}
              >
                <div className="sgi-dl-icon"><Download size={24} /></div>
                <div className="sgi-dl-info">
                  <span className="sgi-dl-action">Descargar Documento</span>
                  <span className="sgi-dl-meta">Rev. {vigenteVersion.numero_version} • Vigente</span>
                </div>
              </button>
            ) : pendienteVersion?.archivo_url ? (
              <button
                className="sgi-download-box sgi-download-box-preview"
                onClick={async () => {
                  const { data } = await getSgiSignedUrl(pendienteVersion.archivo_url, 60);
                  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                }}
              >
                <div className="sgi-dl-icon"><Download size={24} /></div>
                <div className="sgi-dl-info">
                  <span className="sgi-dl-action">Ver para revisión</span>
                  <span className="sgi-dl-meta">Rev. {pendienteVersion.numero_version} • Pendiente aprobación</span>
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

        {/* ── Circuito de Aprobación ── */}
        {showAprobacionCircuito && (
          <div className="sgi-aprobacion-circuito">
            <div className="sgi-aprobacion-header">
              <ShieldCheck size={14} />
              <span>Circuito de Aprobación</span>
              {pendienteVersion && (
                <span className={`sgi-aprobacion-badge estado-${pendienteVersion.estado_aprobacion}`}>
                  {ESTADO_LABELS[pendienteVersion.estado_aprobacion]}
                </span>
              )}
            </div>

            <div className="sgi-aprobacion-stepper">
              {APROBACION_STEPS.map((step, i) => {
                const isDone = i < currentStepIdx || currentEstado === 'aprobado';
                const isCurrent = i === currentStepIdx && currentEstado !== 'rechazado' && currentEstado !== 'aprobado';
                const isRejected = i === currentStepIdx && currentEstado === 'rechazado';
                return (
                  <React.Fragment key={step.key}>
                    <div className={`sgi-aprobacion-step${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}${isRejected ? ' rejected' : ''}`}>
                      <div className="sgi-aprobacion-step-dot">
                        {isDone ? <CheckCircle size={18} /> : isCurrent ? <Clock size={18} /> : isRejected ? <XCircle size={18} /> : <span className="sgi-aprobacion-step-num">{i + 1}</span>}
                      </div>
                      <span className="sgi-aprobacion-step-label">{step.label}</span>
                      {step.key === 'en_revision' && (pendienteVersion?.revisor || vigenteVersion?.revisor) && (
                        <span className="sgi-aprobacion-step-meta">{pendienteVersion?.revisor || vigenteVersion?.revisor}</span>
                      )}
                      {step.key === 'pendiente_aprobacion' && currentEstado === 'pendiente_aprobacion' && creadorDept && (
                        <span className="sgi-aprobacion-step-meta">Gerente de {creadorDept}</span>
                      )}
                      {step.key === 'aprobado' && vigenteVersion?.aprobador && (
                        <span className="sgi-aprobacion-step-meta">{vigenteVersion.aprobador}</span>
                      )}
                    </div>
                    {i < APROBACION_STEPS.length - 1 && (
                      <div className={`sgi-aprobacion-connector${i < currentStepIdx ? ' done' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Rechazado */}
            {currentEstado === 'rechazado' && (
              <div className="sgi-aprobacion-alert rechazado">
                <AlertCircle size={14} />
                <span>
                  Esta versión fue rechazada.
                  {pendienteVersion?.comentario_revision && ` Motivo: "${pendienteVersion.comentario_revision}"`}
                </span>
              </div>
            )}

            {/* Info: revisado por CMASS, esperando gerente */}
            {currentEstado === 'pendiente_aprobacion' && (
              <div className="sgi-aprobacion-alert info">
                <CheckCircle size={14} />
                <span>
                  {pendienteVersion?.revisor && <>Revisado por <strong>{pendienteVersion.revisor}</strong> (CMASS){pendienteVersion.comentario_revision ? ` — "${pendienteVersion.comentario_revision}"` : ''}. </>}
                  Pendiente de aprobación por el <strong>Gerente{creadorDept ? ` de ${creadorDept}` : ' del área'}</strong>.
                </span>
              </div>
            )}

            {/* Acción CMASS */}
            {currentEstado === 'en_revision' && isRevisorCmass && (
              <div className="sgi-aprobacion-action-area">
                {!actionMode ? (
                  <>
                    <p className="sgi-aprobacion-prompt">Esta versión está pendiente de revisión por CMASS. Podés validarla y derivarla al gerente del área de origen.</p>
                    <div className="sgi-aprobacion-btn-row">
                      <button className="btn-sgi-aprobacion-primary" onClick={() => setActionMode('review')}>
                        <CheckCircle size={14} /> Validar y derivar al área
                      </button>
                      <button className="btn-sgi-aprobacion-danger" onClick={() => setActionMode('reject')}>
                        <XCircle size={14} /> Rechazar
                      </button>
                    </div>
                  </>
                ) : (
                  <ConfirmActionForm
                    actionMode={actionMode} actionComment={actionComment}
                    setActionComment={setActionComment} isActioning={isActioning}
                    onConfirm={handleAction}
                    onCancel={() => { setActionMode(null); setActionComment(''); }}
                  />
                )}
              </div>
            )}

            {/* Acción Gerente */}
            {currentEstado === 'pendiente_aprobacion' && isAprobadorGerente && (
              <div className="sgi-aprobacion-action-area">
                {!actionMode ? (
                  <>
                    <p className="sgi-aprobacion-prompt">Como Gerente del área, podés aprobar o rechazar esta versión del documento.</p>
                    <div className="sgi-aprobacion-btn-row">
                      <button className="btn-sgi-aprobacion-primary" onClick={() => setActionMode('approve')}>
                        <CheckCircle size={14} /> Aprobar documento
                      </button>
                      <button className="btn-sgi-aprobacion-danger" onClick={() => setActionMode('reject')}>
                        <XCircle size={14} /> Rechazar
                      </button>
                    </div>
                  </>
                ) : (
                  <ConfirmActionForm
                    actionMode={actionMode} actionComment={actionComment}
                    setActionComment={setActionComment} isActioning={isActioning}
                    onConfirm={handleAction}
                    onCancel={() => { setActionMode(null); setActionComment(''); }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tablas de detalle ── */}
        <div className="sgi-detail-tables sgi-tables-expanded">
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
                {documento.etiquetas?.length > 0 && (
                  <tr>
                    <td className="sgi-td-label">Etiquetas</td>
                    <td>
                      <div className="sgi-tag-list">
                        {(Array.isArray(documento.etiquetas) ? documento.etiquetas : documento.etiquetas.split(',')).map((tag, i) => (
                          <span key={i} className="sgi-tag-chip">{tag.trim()}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
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

          <div className="sgi-info-table">
            <div className="sgi-table-title">Registro de Aprobación</div>
            <table>
              <thead>
                <tr>
                  <th>Revisado por (CMASS)</th>
                  <th>Aprobado por (Gerencia)</th>
                  <th>Fecha aprobación</th>
                  <th>Revisión</th>
                </tr>
              </thead>
              <tbody>
                {vigenteVersion ? (
                  <tr>
                    <td>{vigenteVersion.revisor || '—'}</td>
                    <td>{vigenteVersion.aprobador || '—'}</td>
                    <td>
                      {vigenteVersion.fecha_aprobacion
                        ? new Date(vigenteVersion.fecha_aprobacion).toLocaleDateString('es-AR')
                        : vigenteVersion.fecha_emision
                          ? new Date(vigenteVersion.fecha_emision + 'T00:00:00').toLocaleDateString('es-AR')
                          : '—'}
                    </td>
                    <td>Rev. {vigenteVersion.numero_version}</td>
                  </tr>
                ) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Sin versión vigente</td></tr>
                )}
              </tbody>
            </table>
          </div>

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
                      <td style={{ width: '20%' }}>
                        Rev. {ver.numero_version}
                        {ver.vigente && <span className="sgi-vigente-tag">Vigente</span>}
                        {ver.estado_aprobacion && ver.estado_aprobacion !== 'aprobado' && (
                          <span className={`sgi-aprobacion-inline-badge estado-${ver.estado_aprobacion}`}>
                            {ESTADO_LABELS[ver.estado_aprobacion]}
                          </span>
                        )}
                      </td>
                      <td className="sgi-notas-cell" style={{ lineHeight: '1.5' }}>
                        {ver.notas_cambios || '—'}
                      </td>
                      <td style={{ width: '10%', textAlign: 'center' }}>
                        {ver.archivo_url && (ver.vigente || isAdmin) ? (
                          <button
                            className="sgi-download-btn-small"
                            title={ver.vigente ? 'Descargar versión vigente' : 'Descargar versión antigua (Solo Admin)'}
                            onClick={async () => {
                              const { data } = await getSgiSignedUrl(ver.archivo_url, 60);
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

const ConfirmActionForm = ({ actionMode, actionComment, setActionComment, isActioning, onConfirm, onCancel }) => {
  const LABELS = {
    review: { title: 'Confirmar derivación', placeholder: 'Observaciones de revisión (opcional)...' },
    approve: { title: 'Confirmar aprobación', placeholder: 'Observaciones de aprobación (opcional)...' },
    reject: { title: 'Confirmar rechazo', placeholder: 'Motivo del rechazo (recomendado)...' },
  };
  const { title, placeholder } = LABELS[actionMode] || {};
  return (
    <div className="sgi-aprobacion-confirm">
      <textarea
        className="sgi-aprobacion-textarea"
        rows={3}
        placeholder={placeholder}
        value={actionComment}
        onChange={e => setActionComment(e.target.value)}
      />
      <div className="sgi-aprobacion-btn-row">
        <button
          className={actionMode === 'reject' ? 'btn-sgi-aprobacion-danger' : 'btn-sgi-aprobacion-primary'}
          disabled={isActioning}
          onClick={onConfirm}
        >
          {isActioning ? 'Procesando...' : title}
        </button>
        <button className="btn-sgi-aprobacion-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
};

export default SGIDocument;
