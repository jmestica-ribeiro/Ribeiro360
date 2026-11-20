import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatFecha } from '../../lib/fechas';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
  ChevronLeft, Download, FileText, CheckCircle, ShieldCheck,
  Clock, XCircle, AlertCircle, BookOpenCheck, Eye,
} from 'lucide-react';
import {
  fetchSgiDocumentoById, fetchSgiVersionesByDocumento, getSgiSignedUrl,
  reviewSgiVersion, approveSgiVersion, rejectSgiVersion,
  updateSgiDocumentoAprobador, fetchGerentes,
  fetchMiLecturaSgi, registrarLecturaSgi,
} from '../../services/sgiService';
import SgiLecturaAvance from './SgiLecturaAvance';
import SgiDocViewer from './SgiDocViewer';
import './SgiLecturaAvance.css';
import { useAuth } from '../../contexts/AuthContext';
import { notificarCircuitoSGI, notificarDocumentoPublicado } from '../../lib/notificaciones';
import { useSgiCircuito } from './useSgiCircuito';
import { isGerente, isRevisorSgi } from '../../lib/visibilidad';
import './SGI.css';
import './SGIDocument.css';
import { Select } from '../../components/common';

const getCatSlug = (nombre) =>
  nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

const APROBACION_STEPS = [
  { key: 'creacion', label: 'Creación' },
  { key: 'en_revision', label: 'Revisión {area}' },
  { key: 'pendiente_aprobacion', label: 'Aprobación Gerencia' },
  { key: 'aprobado', label: 'Vigente' },
];
const STEP_INDEX = { creacion: 0, en_revision: 1, pendiente_aprobacion: 2, aprobado: 3 };
const ESTADO_LABELS = {
  en_revision: 'En revisión {area}',
  pendiente_aprobacion: 'Pendiente aprobación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

const SGIDocument = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const circuito = useSgiCircuito();
  const areaRevisora = circuito.revisor_departamento || 'Área revisora';
  const conArea = (s) => (s ?? '').replace('{area}', areaRevisora);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [documento, setDocumento] = useState(null);
  const [versiones, setVersiones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [actionMode, setActionMode] = useState(null); // 'review' | 'approve' | 'reject'
  const [actionComment, setActionComment] = useState('');
  const [isActioning, setIsActioning] = useState(false);
  const [gerentes, setGerentes] = useState([]);
  const [overrideAprobadorId, setOverrideAprobadorId] = useState('');

  // Lectura obligatoria
  const [miLectura, setMiLectura] = useState(null);      // { leido_at } | null
  const [abrioDocumento, setAbrioDocumento] = useState(false);
  const [confirmandoLectura, setConfirmandoLectura] = useState(false);

  async function fetchData() {
    setIsLoading(true);
    const { data: docData } = await fetchSgiDocumentoById(docId);
    if (docData) {
      setDocumento(docData);
      const { data: verData } = await fetchSgiVersionesByDocumento(docId);
      setVersiones(verData);
      const vig = verData?.find(v => v.vigente);
      if (docData.lectura_obligatoria && vig && profile?.id) {
        const { data: lect } = await fetchMiLecturaSgi(vig.id, profile.id);
        setMiLectura(lect ?? null);
      } else {
        setMiLectura(null);
      }
    }
    setIsLoading(false);
  }

  const [visorVersion, setVisorVersion] = useState(null);
  const abrirVisor = (version) => {
    if (version?.vigente) setAbrioDocumento(true);
    setVisorVersion(version);
  };

  const abrirArchivo = async (path) => {
    const { data } = await getSgiSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const confirmarLectura = async (version) => {
    setConfirmandoLectura(true);
    const { data, error } = await registrarLecturaSgi({ versionId: version.id, documentoId: documento.id, userId: profile.id });
    if (!error) setMiLectura(data ?? { leido_at: new Date().toISOString() });
    setConfirmandoLectura(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [docId, profile?.id]);
  useEffect(() => { fetchGerentes().then(({ data }) => setGerentes(data ?? [])); }, []);

  const handleAction = async () => {
    if (!pendienteVersion || !actionMode) return;
    setIsActioning(true);

    // Los destinatarios de cada aviso los resuelve la Edge Function según Admin › SGI › Circuito.
    const versionId = pendienteVersion.id;
    if (actionMode === 'review') {
      if (overrideAprobadorId && overrideAprobadorId !== documento.aprobador_id) {
        await updateSgiDocumentoAprobador(documento.id, overrideAprobadorId);
      }
      const { error } = await reviewSgiVersion(versionId, profile, actionComment || null);
      if (!error) notificarCircuitoSGI({ versionId, evento: 'pendiente_aprobacion' });
    } else if (actionMode === 'approve') {
      const { error } = await approveSgiVersion(versionId, documento.id, profile, actionComment || null);
      if (!error) {
        notificarCircuitoSGI({ versionId, evento: 'aprobado' });   // autor + revisor
        notificarDocumentoPublicado({ versionId });                 // aviso general (Admin › SGI › Publicados)
      }
    } else if (actionMode === 'reject') {
      const { error } = await rejectSgiVersion(versionId, actionComment || null);
      if (!error) notificarCircuitoSGI({ versionId, evento: 'rechazado' }); // autor + revisor, con el motivo
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
  const isRevisorCmass = isRevisorSgi(profile, circuito) || isTester;
  const aprobadorEspecifico = documento.aprobador_id || documento.aprobador_perfil?.id;
  const isAprobadorGerente = aprobadorEspecifico
    ? profile?.id === aprobadorEspecifico || isTester
    : (isGerente(profile) && !!creadorDept && profile?.department === creadorDept) || isTester;
  const showAprobacionCircuito = documento.documento_controlado && currentEstado;

  const vigentePublicada = vigenteVersion && (!vigenteVersion.estado_aprobacion || vigenteVersion.estado_aprobacion === 'aprobado');
  const lecturaActiva = documento.lectura_obligatoria && vigentePublicada;
  const puedeVerLogLectura = isAdmin || profile?.can_upload_sgi === true;
  const tieneArchivo = !!vigenteVersion?.archivo_url;

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
              {documento.lectura_obligatoria && (
                <span className="sgi-doc-lectura-badge"><BookOpenCheck size={12} /> Lectura obligatoria</span>
              )}
            </div>
            <h1 className="sgi-doc-hero-title">{documento.titulo}</h1>
            <p className="sgi-doc-hero-desc">{documento.descripcion || 'Sin descripción disponible para este documento.'}</p>
          </div>

          <div className="sgi-doc-hero-right">
            {vigenteVersion?.archivo_url ? (
              <div className="sgi-hero-file-actions">
                <button className="sgi-download-box" onClick={() => abrirVisor(vigenteVersion)}>
                  <div className="sgi-dl-icon"><Eye size={24} /></div>
                  <div className="sgi-dl-info">
                    <span className="sgi-dl-action">Ver documento</span>
                    <span className="sgi-dl-meta">Rev. {vigenteVersion.numero_version} • Vigente</span>
                  </div>
                </button>
                <button type="button" className="sgi-hero-dl-link" onClick={() => { setAbrioDocumento(true); abrirArchivo(vigenteVersion.archivo_url); }}>
                  <Download size={14} /> Descargar
                </button>
              </div>
            ) : pendienteVersion?.archivo_url ? (
              <div className="sgi-hero-file-actions">
                <button className="sgi-download-box sgi-download-box-preview" onClick={() => abrirVisor(pendienteVersion)}>
                  <div className="sgi-dl-icon"><Eye size={24} /></div>
                  <div className="sgi-dl-info">
                    <span className="sgi-dl-action">Ver para revisión</span>
                    <span className="sgi-dl-meta">Rev. {pendienteVersion.numero_version} • Pendiente aprobación</span>
                  </div>
                </button>
                <button type="button" className="sgi-hero-dl-link" onClick={() => abrirArchivo(pendienteVersion.archivo_url)}>
                  <Download size={14} /> Descargar
                </button>
              </div>
            ) : (
              <div className="sgi-no-file-box">
                <FileText size={20} />
                <span>Archivo no disponible</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Lectura obligatoria: confirmación del usuario ── */}
        {lecturaActiva && (
          miLectura?.leido_at ? (
            <div className="sgi-lectura-banner done" role="status">
              <CheckCircle size={22} />
              <div className="sgi-lectura-banner-text">
                <strong>Lectura confirmada</strong>
                <span>Confirmaste la lectura de la Rev. {vigenteVersion.numero_version} el {new Date(miLectura.leido_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}.</span>
              </div>
            </div>
          ) : (
            <div className="sgi-lectura-banner" role="alert">
              <BookOpenCheck size={22} />
              <div className="sgi-lectura-banner-text">
                <strong>Este documento es de lectura obligatoria</strong>
                <span>
                  {tieneArchivo && !abrioDocumento
                    ? 'Leelo acá mismo con la vista previa y confirmá la lectura al terminar.'
                    : 'Cuando termines de leerlo, confirmá la lectura. Tu confirmación queda registrada.'}
                </span>
              </div>
              {tieneArchivo && !abrioDocumento ? (
                <button type="button" className="sgi-lectura-confirm" onClick={() => abrirVisor(vigenteVersion)}>
                  <Eye size={15} /> Leer ahora
                </button>
              ) : (
                <button
                  type="button"
                  className="sgi-lectura-confirm"
                  disabled={confirmandoLectura}
                  onClick={() => confirmarLectura(vigenteVersion)}
                >
                  <CheckCircle size={15} /> {confirmandoLectura ? 'Registrando…' : 'Confirmar lectura'}
                </button>
              )}
            </div>
          )
        )}

        {/* ── Log de lectura (admins / cargadores SGI) ── */}
        {lecturaActiva && puedeVerLogLectura && (
          <SgiLecturaAvance
            key={vigenteVersion.id + (miLectura?.leido_at ?? '')}
            versionId={vigenteVersion.id}
            versionNumero={vigenteVersion.numero_version}
            documento={documento}
          />
        )}

        {/* ── Circuito de Aprobación ── */}
        {showAprobacionCircuito && (
          <div className="sgi-aprobacion-circuito">
            <div className="sgi-aprobacion-header">
              <ShieldCheck size={14} />
              <span>Circuito de Aprobación</span>
              {pendienteVersion && (
                <span className={`sgi-aprobacion-badge estado-${pendienteVersion.estado_aprobacion}`}>
                  {conArea(ESTADO_LABELS[pendienteVersion.estado_aprobacion])}
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
                      <span className="sgi-aprobacion-step-label">{conArea(step.label)}</span>
                      {step.key === 'en_revision' && (pendienteVersion?.revisor || vigenteVersion?.revisor) && (
                        <span className="sgi-aprobacion-step-meta">{pendienteVersion?.revisor || vigenteVersion?.revisor}</span>
                      )}
                      {step.key === 'pendiente_aprobacion' && currentEstado === 'pendiente_aprobacion' && (
                        <span className="sgi-aprobacion-step-meta">
                          {documento.aprobador_perfil?.full_name || (creadorDept ? `Gerente de ${creadorDept}` : 'Gerente del área')}
                        </span>
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

            {/* Info: revisado por el área revisora, esperando gerente */}
            {currentEstado === 'pendiente_aprobacion' && (
              <div className="sgi-aprobacion-alert info">
                <CheckCircle size={14} />
                <span>
                  {pendienteVersion?.revisor && <>Revisado por <strong>{pendienteVersion.revisor}</strong> ({areaRevisora}){pendienteVersion.comentario_revision ? ` — "${pendienteVersion.comentario_revision}"` : ''}. </>}
                  Pendiente de aprobación por <strong>{documento.aprobador_perfil?.full_name || (creadorDept ? `el Gerente de ${creadorDept}` : 'el Gerente del área')}</strong>.
                </span>
              </div>
            )}

            {/* Acción del área revisora */}
            {currentEstado === 'en_revision' && isRevisorCmass && (
              <div className="sgi-aprobacion-action-area">
                {!actionMode ? (
                  <>
                    <p className="sgi-aprobacion-prompt">Esta versión está pendiente de revisión por {areaRevisora}. Podés validarla y derivarla al gerente aprobador.</p>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                        Gerente aprobador
                      </label>
                      <Select
                        size="sm"
                        value={overrideAprobadorId || documento.aprobador_id || ''}
                        onChange={setOverrideAprobadorId}
                        placeholder="— Sin asignar —"
                        clearable
                        options={gerentes.map(g => ({ value: g.id, label: `${g.full_name}${g.department ? ` (${g.department})` : ''}` }))}
                        aria-label="Aprobador"
                      />
                    </div>
                    <div className="sgi-aprobacion-btn-row">
                      <button className="btn-sgi-aprobacion-primary" onClick={() => setActionMode('review')}>
                        <CheckCircle size={14} /> Validar y derivar
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
                <tr><td className="sgi-td-label">Lectura obligatoria</td><td>{documento.lectura_obligatoria ? 'Sí — todos los usuarios' : 'No'}</td></tr>
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
                  <th>Revisado por ({areaRevisora})</th>
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
                        ? formatFecha(vigenteVersion.fecha_aprobacion, {})
                        : vigenteVersion.fecha_emision
                          ? new Date(vigenteVersion.fecha_emision + 'T00:00:00').toLocaleDateString('es-AR')
                          : '—'}
                    </td>
                    <td>Rev. {vigenteVersion.numero_version}</td>
                  </tr>
                ) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: '20px' }}>Sin versión vigente</td></tr>
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
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: '20px' }}>Sin versiones registradas</td></tr>
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
                            {conArea(ESTADO_LABELS[ver.estado_aprobacion])}
                          </span>
                        )}
                      </td>
                      <td className="sgi-notas-cell" style={{ lineHeight: '1.5' }}>
                        {ver.notas_cambios || '—'}
                      </td>
                      <td style={{ width: '10%', textAlign: 'center' }}>
                        {ver.archivo_url && (ver.vigente || isAdmin) ? (
                          <span className="sgi-file-btns">
                            <button
                              className="sgi-download-btn-small"
                              title="Vista previa"
                              aria-label={`Vista previa de la Rev. ${ver.numero_version}`}
                              onClick={() => abrirVisor(ver)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="sgi-download-btn-small"
                              title={ver.vigente ? 'Descargar versión vigente' : 'Descargar versión antigua (Solo Admin)'}
                              onClick={() => abrirArchivo(ver.archivo_url)}
                            >
                              <Download size={16} />
                            </button>
                          </span>
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

      <SgiDocViewer
        open={!!visorVersion}
        onClose={() => setVisorVersion(null)}
        documento={documento}
        version={visorVersion}
        onDescargar={() => abrirArchivo(visorVersion?.archivo_url)}
        lectura={lecturaActiva && visorVersion?.id === vigenteVersion?.id ? {
          activa: true,
          confirmada: !!miLectura?.leido_at,
          leidoAt: miLectura?.leido_at,
          confirmando: confirmandoLectura,
          onConfirmar: () => confirmarLectura(vigenteVersion),
        } : null}
      />
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
    <div className={`sgi-aprobacion-confirm mode-${actionMode}`}>
      <p className="sgi-aprobacion-confirm-title">{title}</p>
      <label htmlFor="sgi-aprobacion-comment" className="sgi-aprobacion-confirm-label">Comentario</label>
      <textarea
        id="sgi-aprobacion-comment"
        className="sgi-aprobacion-textarea"
        rows={3}
        placeholder={placeholder}
        value={actionComment}
        onChange={e => setActionComment(e.target.value)}
      />
      <div className="sgi-aprobacion-btn-row">
        <button
          className={actionMode === 'reject' ? 'btn-sgi-aprobacion-danger solid' : 'btn-sgi-aprobacion-primary'}
          disabled={isActioning}
          onClick={onConfirm}
        >
          {isActioning ? 'Procesando...' : title}
        </button>
        <button type="button" className="btn-sgi-aprobacion-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
};

export default SGIDocument;
