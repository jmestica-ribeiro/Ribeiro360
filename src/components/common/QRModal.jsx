import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, QrCode } from 'lucide-react';
import Logo from '../../assets/Logo.png';

const QRModal = ({ url, onClose }) => {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const generate = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      await QRCode.toCanvas(canvas, url, {
        width: 280,
        margin: 2,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff',
        },
      });

      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = Logo;
      img.onload = () => {
        const logoSize = 56;
        const x = (canvas.width - logoSize) / 2;
        const y = (canvas.height - logoSize) / 2;

        // White background circle behind logo
        ctx.beginPath();
        ctx.arc(x + logoSize / 2, y + logoSize / 2, logoSize / 2 + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.drawImage(img, x, y, logoSize, logoSize);
        setReady(true);
      };
    };

    generate();
  }, [url]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'qr-intranet.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="qr-backdrop" onClick={handleBackdropClick}>
      <div className="qr-modal">
        <div className="qr-modal-header">
          <div className="qr-modal-title">
            <QrCode size={18} />
            <span>Compartir esta página</span>
          </div>
          <button className="qr-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="qr-modal-body">
          <div className="qr-canvas-wrapper">
            <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '12px' }} />
          </div>

          <p className="qr-url-label">{url}</p>
        </div>

        <div className="qr-modal-footer">
          <button
            className="qr-download-btn"
            onClick={handleDownload}
            disabled={!ready}
          >
            <Download size={16} />
            Descargar QR
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;
