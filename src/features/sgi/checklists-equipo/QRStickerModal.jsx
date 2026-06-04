import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { X, Printer, Truck } from 'lucide-react';
import VehiculoPicker from './VehiculoPicker';
import './QRStickerModal.css';

const QRStickerModal = ({ onClose }) => {
  const [vehiculo, setVehiculo]   = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const printRef                  = useRef(null);

  useEffect(() => {
    if (!vehiculo?.interno_nro) { setQrDataUrl(null); return; }
    const url = `${window.location.origin}/sgi/checklists-equipo?v=${encodeURIComponent(vehiculo.interno_nro)}`;
    QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: '#111010', light: '#ffffff' },
    }).then(setQrDataUrl).catch(console.error);
  }, [vehiculo]);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const html = printRef.current.innerHTML;
    win.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>QR - ${vehiculo.interno_nro}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
          .qr-print-sticker { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 32px 40px; border: 3px solid #111; border-radius: 20px; width: 320px; }
          .qr-print-logo { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; color: #555; text-transform: uppercase; }
          .qr-print-qr img { width: 220px; height: 220px; display: block; }
          .qr-print-codigo { font-size: 28px; font-weight: 900; color: #111; letter-spacing: 0.06em; background: #f5c518; padding: 6px 20px; border-radius: 10px; }
          .qr-print-nombre { font-size: 13px; color: #444; text-align: center; max-width: 240px; line-height: 1.4; }
          .qr-print-instruccion { font-size: 11px; color: #888; text-align: center; border-top: 1px dashed #ccc; padding-top: 12px; width: 100%; }
        </style>
      </head><body>${html}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const modal = createPortal(
    <div className="qrs-overlay" onClick={onClose}>
      <div className="qrs-modal" onClick={e => e.stopPropagation()}>

        <div className="qrs-header">
          <div className="qrs-header-title">
            <Truck size={18} />
            Generar QR de equipo
          </div>
          <button className="qrs-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="qrs-body">
          <p className="qrs-hint">Seleccioná el equipo para generar su QR. El operario lo escanea y va directo al checklist.</p>

          <VehiculoPicker
            value={vehiculo?.interno_nro ?? null}
            onChange={v => setVehiculo(v.interno_nro ? v : null)}
          />

          {qrDataUrl && vehiculo && (
            <div className="qrs-preview-wrap">
              {/* Área de impresión */}
              <div className="qrs-sticker" ref={printRef}>
                <div className="qr-print-sticker">
                  <div className="qr-print-logo">Ribeiro 360 · Control Pre-operacional</div>
                  <div className="qr-print-qr"><img src={qrDataUrl} alt="QR" /></div>
                  <div className="qr-print-codigo">{vehiculo.interno_nro}</div>
                  <div className="qr-print-nombre">{vehiculo.nombre}</div>
                  <div className="qr-print-instruccion">Escaneá con la cámara del celular<br/>para completar el checklist diario</div>
                </div>
              </div>

              <button className="qrs-print-btn" onClick={handlePrint}>
                <Printer size={16} />
                Imprimir sticker
              </button>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body,
  );

  return modal;
};

export default QRStickerModal;
