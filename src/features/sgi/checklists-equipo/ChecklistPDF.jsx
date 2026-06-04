import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import { TIPOS_EQUIPO } from './tiposEquipo';
import './ChecklistPDF.css';

const ESTADO_LABELS = { bien: 'BIEN', regular: 'REGULAR', mal: 'MAL' };

function formatDate(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

const ChecklistPDF = ({ detalle, tipoLabel, onClose }) => {
  const printRef = useRef(null);

  const respOrdenadas = [...(detalle.respuestas ?? [])].sort(
    (a, b) => (a.item?.orden ?? 0) - (b.item?.orden ?? 0)
  );

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Checklist — ${tipoLabel}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
        .pdf-header { border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 12px; }
        .pdf-title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
        .pdf-subtitle { font-size: 12px; color: #555; margin-top: 2px; }
        .pdf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px; margin-bottom: 14px; }
        .pdf-field label { font-size: 9px; text-transform: uppercase; color: #777; display: block; }
        .pdf-field span { font-size: 11px; border-bottom: 1px solid #bbb; display: block; padding-bottom: 2px; min-height: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f0f0f0; text-align: left; padding: 5px 8px; border: 1px solid #ccc; font-size: 10px; }
        td { padding: 5px 8px; border: 1px solid #e0e0e0; vertical-align: top; }
        .estado-bien    { font-weight: bold; color: #16a34a; }
        .estado-regular { font-weight: bold; color: #d97706; }
        .estado-mal     { font-weight: bold; color: #dc2626; }
        .obs { font-size: 10px; color: #555; margin-top: 2px; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <div className="cheqpdf-overlay" onClick={onClose}>
      <div className="cheqpdf-modal" onClick={e => e.stopPropagation()}>
        <div className="cheqpdf-toolbar">
          <span className="cheqpdf-toolbar-title">Vista previa PDF</span>
          <div className="cheqpdf-toolbar-actions">
            <button className="cheqpdf-btn-print" onClick={handlePrint}>
              <Download size={14} /> Imprimir / Guardar PDF
            </button>
            <button className="cheqpdf-btn-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="cheqpdf-preview">
          <div ref={printRef} className="cheqpdf-document">
            <div className="pdf-header">
              <div className="pdf-title">Checklist Pre-Operacional — {tipoLabel}</div>
              <div className="pdf-subtitle">Ribeiro S.R.L. · Seguridad y Calidad</div>
            </div>

            <div className="pdf-grid">
              {[
                ['Fecha', formatDate(detalle.fecha)],
                ['Lugar', detalle.lugar],
                ['Interno N°', detalle.interno_nro],
                ['Km / Hrs', detalle.km_hrs],
                ['Operador', detalle.operador?.full_name],
              ].map(([label, val]) => (
                <div className="pdf-field" key={label}>
                  <label>{label}</label>
                  <span>{val || ''}</span>
                </div>
              ))}
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Ítem de verificación</th>
                  <th style={{ width: 80 }}>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {respOrdenadas.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>{r.item?.nombre ?? '—'}</td>
                    <td className={`estado-${r.estado}`}>{ESTADO_LABELS[r.estado] ?? r.estado}</td>
                    <td>{r.observacion || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 32, display: 'flex', gap: 60 }}>
              <div style={{ flex: 1, borderTop: '1px solid #aaa', paddingTop: 4, fontSize: 10, color: '#555' }}>
                Firma del operador
              </div>
              <div style={{ flex: 1, borderTop: '1px solid #aaa', paddingTop: 4, fontSize: 10, color: '#555' }}>
                Firma del supervisor
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistPDF;
