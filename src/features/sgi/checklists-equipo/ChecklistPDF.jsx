import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import { TIPOS_EQUIPO } from './tiposEquipo';
import Logo from '../../../assets/Logo.png';
import './ChecklistPDF.css';

const ESTADO_LABELS = { bien: 'BIEN', regular: 'REGULAR', mal: 'MAL', na: 'N/A' };

function formatDate(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

const PRINT_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }

/* ── Página ── */
.doc { width: 210mm; min-height: 297mm; padding: 0; position: relative; }

/* ── Header ── */
.doc-header {
  background: #111;
  color: #fff;
  padding: 18px 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.doc-header-left { display: flex; align-items: flex-start; gap: 16px; }
.doc-logo {
  width: 52px; height: 52px; border-radius: 50%;
  overflow: hidden; flex-shrink: 0;
}
.doc-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.doc-header-text { }
.doc-header-title { font-size: 17px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; color: #fff; }
.doc-header-sub { font-size: 10px; color: rgba(255,255,255,0.55); margin-top: 3px; }
.doc-header-right { text-align: right; flex-shrink: 0; }
.doc-header-num { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.5); }
.doc-header-fecha { font-size: 14px; font-weight: 800; color: #f5c518; margin-top: 4px; }
.doc-header-fecha-label { font-size: 9px; color: rgba(255,255,255,0.4); margin-top: 2px; }

/* ── Cuerpo ── */
.doc-body { padding: 24px 28px 60px; }

/* ── Sección ── */
.doc-section { margin-bottom: 24px; }
.doc-section-title {
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em;
  text-transform: uppercase; color: #c9a800;
  padding-bottom: 6px;
  border-bottom: 1.5px solid #e8b800;
  margin-bottom: 12px;
}

/* ── Datos del equipo ── */
.doc-datos-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
  border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;
}
.doc-dato {
  padding: 10px 14px;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
}
.doc-dato:nth-child(3n) { border-right: none; }
.doc-dato:nth-last-child(-n+3) { border-bottom: none; }
.doc-dato-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 3px; }
.doc-dato-val { font-size: 12px; font-weight: 700; color: #111; }

/* ── Tabla de verificaciones ── */
.doc-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
.doc-table thead tr { background: #111; color: #fff; }
.doc-table thead th { padding: 8px 10px; text-align: left; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
.doc-table thead th:first-child { width: 32px; text-align: center; }
.doc-table thead th.col-estado { width: 70px; text-align: center; }
.doc-table thead th.col-obs { width: 35%; }
.doc-table tbody tr:nth-child(even) { background: #f8f8f8; }
.doc-table tbody tr { border-bottom: 1px solid #ececec; }
.doc-table td { padding: 7px 10px; vertical-align: top; color: #222; }
.doc-table td:first-child { text-align: center; font-weight: 700; color: #999; font-size: 9px; }
.doc-table td.col-obs { font-size: 10px; color: #666; font-style: italic; }

/* ── Badge estado ── */
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.05em;
  text-align: center;
}
.badge-bien    { background: #dcfce7; color: #16a34a; }
.badge-regular { background: #fef3c7; color: #b45309; }
.badge-mal     { background: #fee2e2; color: #dc2626; }
.badge-na      { background: #f1f5f9; color: #94a3b8; }

/* ── Resumen ── */
.doc-resumen-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.doc-resumen-card { border-radius: 6px; padding: 12px 14px; }
.doc-resumen-card.bien    { background: #dcfce7; }
.doc-resumen-card.regular { background: #fef3c7; }
.doc-resumen-card.mal     { background: #fee2e2; }
.doc-resumen-card.na      { background: #f1f5f9; }
.doc-resumen-card.total   { background: #111; }
.doc-resumen-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.doc-resumen-card.bien .doc-resumen-label    { color: #16a34a; }
.doc-resumen-card.regular .doc-resumen-label { color: #b45309; }
.doc-resumen-card.mal .doc-resumen-label     { color: #dc2626; }
.doc-resumen-card.na .doc-resumen-label      { color: #94a3b8; }
.doc-resumen-card.total .doc-resumen-label   { color: rgba(255,255,255,0.5); }
.doc-resumen-num { font-size: 26px; font-weight: 900; margin-top: 4px; }
.doc-resumen-card.bien .doc-resumen-num    { color: #16a34a; }
.doc-resumen-card.regular .doc-resumen-num { color: #b45309; }
.doc-resumen-card.mal .doc-resumen-num     { color: #dc2626; }
.doc-resumen-card.na .doc-resumen-num      { color: #94a3b8; }
.doc-resumen-card.total .doc-resumen-num   { color: #f5c518; }

/* ── Firmas ── */
.doc-firmas { display: flex; gap: 48px; margin-top: 32px; }
.doc-firma { flex: 1; border-top: 1.5px solid #ccc; padding-top: 6px; }
.doc-firma-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; }
.doc-firma-aclaracion { font-size: 9px; color: #bbb; margin-top: 28px; }

/* ── Footer ── */
.doc-footer {
  background: #f8f8f8; border-top: 1px solid #e0e0e0;
  padding: 8px 28px; display: flex; justify-content: space-between; align-items: center;
  font-size: 9px; color: #aaa; margin-top: 24px;
}
.doc-footer strong { color: #777; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; margin-top: 0; }
}
`;


const ChecklistPDF = ({ detalle, tipoLabel, onClose }) => {
  const printRef = useRef(null);

  const respOrdenadas = [...(detalle.respuestas ?? [])].sort(
    (a, b) => (a.item?.orden ?? 0) - (b.item?.orden ?? 0)
  );

  const resumen = respOrdenadas.reduce((acc, r) => {
    acc[r.estado] = (acc[r.estado] ?? 0) + 1;
    return acc;
  }, {});

  const handlePrint = () => {
    // Convertir img src a base64 para que funcione en la ventana de impresión
    const clone = printRef.current.cloneNode(true);
    const imgs = clone.querySelectorAll('img');
    const toBase64 = (img) => new Promise(res => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      img.src = c.toDataURL(); res();
    });
    const realImgs = printRef.current.querySelectorAll('img');
    Promise.all([...realImgs].map((img, i) => toBase64(imgs[i] ?? img)
      .then(() => { if (imgs[i]) imgs[i].src = img.src; })
    )).catch(() => {});

    const content = clone.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Checklist — ${tipoLabel} · ${detalle.interno_nro}</title>
      <style>${PRINT_STYLES}</style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const total = respOrdenadas.length;

  return (
    <div className="cheqpdf-overlay" onClick={onClose}>
      <div className="cheqpdf-modal" onClick={e => e.stopPropagation()}>
        <div className="cheqpdf-toolbar">
          <span className="cheqpdf-toolbar-title">Vista previa — {tipoLabel}</span>
          <div className="cheqpdf-toolbar-actions">
            <button className="cheqpdf-btn-print" onClick={handlePrint}>
              <Download size={14} /> Imprimir / Guardar PDF
            </button>
            <button className="cheqpdf-btn-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="cheqpdf-preview">
          <div ref={printRef} className="cheqpdf-document">
            <style>{PRINT_STYLES}</style>
            <div className="doc">

              {/* ── Header ── */}
              <div className="doc-header">
                <div className="doc-header-left">
                  <div className="doc-logo"><img src={Logo} alt="Ribeiro" /></div>
                  <div className="doc-header-text">
                    <div className="doc-header-title">Control Pre-Operacional · {tipoLabel}</div>
                    <div className="doc-header-sub">Seguridad Operacional · Ribeiro S.R.L.</div>
                  </div>
                </div>
                <div className="doc-header-right">
                  <div className="doc-header-num">Equipo N° {detalle.interno_nro ?? '—'}</div>
                  <div className="doc-header-fecha">{formatDate(detalle.fecha)}</div>
                  <div className="doc-header-fecha-label">Fecha del control</div>
                </div>
              </div>

              {/* ── Cuerpo ── */}
              <div className="doc-body">

                {/* Datos del equipo */}
                <div className="doc-section">
                  <div className="doc-section-title">Datos del equipo</div>
                  <div className="doc-datos-grid">
                    {[
                      ['Interno N°',  detalle.interno_nro],
                      ['Lugar',       detalle.lugar],
                      ['Km / Hrs',    detalle.km_hrs],
                      ['Operador',    detalle.operador?.full_name],
                      ['Tipo equipo', tipoLabel],
                      ['Fecha',       formatDate(detalle.fecha)],
                    ].map(([label, val]) => (
                      <div className="doc-dato" key={label}>
                        <div className="doc-dato-label">{label}</div>
                        <div className="doc-dato-val">{val || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumen */}
                <div className="doc-section">
                  <div className="doc-section-title">Resumen de verificaciones</div>
                  <div className="doc-resumen-grid">
                    {[
                      { key: 'bien',    label: 'Bien' },
                      { key: 'regular', label: 'Regular' },
                      { key: 'mal',     label: 'Mal' },
                      { key: 'na',      label: 'N/A' },
                    ].map(({ key, label }) => (
                      <div key={key} className={`doc-resumen-card ${key}`}>
                        <div className="doc-resumen-label">{label}</div>
                        <div className="doc-resumen-num">{resumen[key] ?? 0}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabla de ítems */}
                <div className="doc-section">
                  <div className="doc-section-title">Verificaciones ({total} ítems)</div>
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Ítem de verificación</th>
                        <th className="col-estado">Estado</th>
                        <th className="col-obs">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {respOrdenadas.map((r, idx) => (
                        <tr key={r.id}>
                          <td>{idx + 1}</td>
                          <td>{r.item?.nombre ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge badge-${r.estado}`}>
                              {ESTADO_LABELS[r.estado] ?? r.estado}
                            </span>
                          </td>
                          <td className="col-obs">{r.observacion || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Firmas */}
                <div className="doc-firmas">
                  <div className="doc-firma">
                    <div className="doc-firma-label">Firma del operador</div>
                    <div className="doc-firma-aclaracion">Aclaración</div>
                  </div>
                  <div className="doc-firma">
                    <div className="doc-firma-label">Firma del supervisor</div>
                    <div className="doc-firma-aclaracion">Aclaración</div>
                  </div>
                </div>

              </div>{/* /doc-body */}

              {/* Footer */}
              <div className="doc-footer">
                <span><strong>{detalle.interno_nro}</strong> · {tipoLabel} · {formatDate(detalle.fecha)}</span>
                <span>Ribeiro Obras &amp; Vialidad · Control Pre-Operacional</span>
              </div>

            </div>{/* /doc */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistPDF;
