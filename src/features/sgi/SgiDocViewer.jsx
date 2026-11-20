import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ExternalLink, CheckCircle, BookOpenCheck, FileText, AlertCircle } from 'lucide-react';
import { fetchSgiArchivoBlob, getSgiSignedUrl, isSgiLinkExterno } from '../../services/sgiService';
import { LoadingSpinner, SafeHtml } from '../../components/common';
import './SgiDocViewer.css';

const extDe = (path) => (String(path || '').split('?')[0].split('.').pop() || '').toLowerCase();
const TIPO_POR_EXT = {
  pdf: 'pdf',
  docx: 'docx',
  xlsx: 'excel', xls: 'excel', xlsm: 'excel', csv: 'excel',
  png: 'imagen', jpg: 'imagen', jpeg: 'imagen', gif: 'imagen', webp: 'imagen',
};

/**
 * Vista previa in-app de la versión de un documento SGI (PDF, Word .docx, Excel, imágenes).
 * Si el documento es de lectura obligatoria, permite confirmar la lectura desde el visor.
 *
 * @param {{ archivo_url, numero_version }} version
 * @param {{ activa, confirmada, leidoAt, confirmando, onConfirmar }} [lectura]
 */
const SgiDocViewer = ({ open, onClose, documento, version, lectura, onDescargar }) => {
  const path = version?.archivo_url;
  const esLink = isSgiLinkExterno(path);
  const tipo = esLink ? 'link' : (TIPO_POR_EXT[extDe(path)] || 'otro');

  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [pdfUrl, setPdfUrl] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [hojas, setHojas] = useState([]);           // [{ nombre, html }]
  const [hojaActiva, setHojaActiva] = useState(0);
  const [acepto, setAcepto] = useState(false);
  const docxRef = useRef(null);

  // Carga del contenido según el tipo de archivo
  useEffect(() => {
    if (!open || !path) return;
    let cancel = false;
    let objectUrl = null;
    setEstado('cargando');
    setHojas([]);
    setHojaActiva(0);

    (async () => {
      try {
        if (tipo === 'link' || tipo === 'otro') { setEstado('listo'); return; }
        const { data: blob, error } = await fetchSgiArchivoBlob(path);
        if (error || !blob) throw error || new Error('Archivo vacío');
        if (cancel) return;

        if (tipo === 'pdf') {
          objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          setPdfUrl(objectUrl);
        } else if (tipo === 'imagen') {
          objectUrl = URL.createObjectURL(blob);
          setImgUrl(objectUrl);
        } else if (tipo === 'docx') {
          const { renderAsync } = await import('docx-preview');
          if (cancel || !docxRef.current) return;
          docxRef.current.innerHTML = '';
          await renderAsync(blob, docxRef.current, undefined, {
            className: 'sgiv-docx', inWrapper: true, ignoreLastRenderedPageBreak: true,
          });
        } else if (tipo === 'excel') {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
          if (cancel) return;
          setHojas(wb.SheetNames.map(nombre => ({
            nombre,
            html: XLSX.utils.sheet_to_html(wb.Sheets[nombre], { header: '', footer: '' }),
          })));
        }
        if (!cancel) setEstado('listo');
      } catch (e) {
        console.error('[SgiDocViewer]', e?.message || e);
        if (!cancel) setEstado('error');
      }
    })();

    return () => {
      cancel = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPdfUrl(null);
      setImgUrl(null);
    };
  }, [open, path, tipo]);

  // Escape para cerrar + bloquear scroll del fondo
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  useEffect(() => { if (open) setAcepto(false); }, [open, version?.id]);

  if (!open) return null;

  const abrirLink = async () => {
    const { data } = await getSgiSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };

  const fallback = (icono, titulo, texto) => (
    <div className="sgiv-fallback">
      {icono}
      <strong>{titulo}</strong>
      <p>{texto}</p>
      {esLink ? (
        <button type="button" className="sgiv-btn primary" onClick={abrirLink}><ExternalLink size={15} /> Abrir en pestaña nueva</button>
      ) : (
        <button type="button" className="sgiv-btn primary" onClick={onDescargar}><Download size={15} /> Descargar archivo</button>
      )}
    </div>
  );

  return createPortal(
    <div className="sgiv-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sgiv" role="dialog" aria-modal="true" aria-labelledby="sgiv-title">
        <header className="sgiv-head">
          <div className="sgiv-head-info">
            <FileText size={18} />
            <div>
              <h2 id="sgiv-title">{documento?.titulo}</h2>
              <span>{[documento?.codigo, version?.numero_version != null && `Rev. ${version.numero_version}`].filter(Boolean).join(' · ')}</span>
            </div>
          </div>
          <div className="sgiv-head-actions">
            {esLink ? (
              <button type="button" className="sgiv-btn" onClick={abrirLink}><ExternalLink size={15} /> Abrir</button>
            ) : (
              <button type="button" className="sgiv-btn" onClick={onDescargar}><Download size={15} /> Descargar</button>
            )}
            <button type="button" className="sgiv-close" aria-label="Cerrar vista previa" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        <div className={`sgiv-body tipo-${tipo}`}>
          {estado === 'cargando' && <div className="sgiv-loading"><LoadingSpinner /></div>}
          {estado === 'error' && fallback(<AlertCircle size={32} />, 'No se pudo mostrar la vista previa', 'Podés descargar el archivo para verlo en tu equipo.')}

          {tipo === 'pdf' && pdfUrl && estado === 'listo' && (
            <iframe className="sgiv-pdf" src={pdfUrl} title={`Vista previa de ${documento?.titulo}`} />
          )}
          {tipo === 'imagen' && imgUrl && estado === 'listo' && (
            <div className="sgiv-img"><img src={imgUrl} alt={documento?.titulo} /></div>
          )}
          {tipo === 'docx' && (
            <div className="sgiv-docx-wrap" style={{ display: estado === 'listo' ? 'block' : 'none' }} ref={docxRef} />
          )}
          {tipo === 'excel' && estado === 'listo' && (
            <div className="sgiv-excel">
              {hojas.length > 1 && (
                <div className="sgiv-sheets" role="tablist" aria-label="Hojas">
                  {hojas.map((h, i) => (
                    <button key={h.nombre} type="button" role="tab" aria-selected={i === hojaActiva} className={i === hojaActiva ? 'active' : ''} onClick={() => setHojaActiva(i)}>{h.nombre}</button>
                  ))}
                </div>
              )}
              <SafeHtml className="sgiv-sheet" html={hojas[hojaActiva]?.html || ''} />
            </div>
          )}
          {tipo === 'link' && estado === 'listo' && fallback(<ExternalLink size={32} />, 'Documento en un sitio externo', 'Este documento está alojado fuera de la intranet y no se puede previsualizar acá.')}
          {tipo === 'otro' && estado === 'listo' && fallback(<FileText size={32} />, 'Formato sin vista previa', `Los archivos .${extDe(path) || '?'} no se pueden previsualizar en el navegador.`)}
        </div>

        {lectura?.activa && (
          <footer className={`sgiv-foot${lectura.confirmada ? ' done' : ''}`}>
            {lectura.confirmada ? (
              <span className="sgiv-foot-ok">
                <CheckCircle size={16} /> Lectura confirmada el {new Date(lectura.leidoAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            ) : (
              <>
                <label className="sgiv-check">
                  <input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} />
                  <span><BookOpenCheck size={15} /> Leí y comprendí el contenido de este documento</span>
                </label>
                <button
                  type="button"
                  className="sgiv-btn primary"
                  disabled={!acepto || lectura.confirmando}
                  onClick={lectura.onConfirmar}
                >
                  <CheckCircle size={15} /> {lectura.confirmando ? 'Registrando…' : 'Confirmar lectura'}
                </button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SgiDocViewer;
