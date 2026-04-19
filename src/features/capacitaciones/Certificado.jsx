import React from 'react';
import { motion } from 'framer-motion';
import { X, Printer, Award } from 'lucide-react';
import './Certificado.css';

const formatDate = (isoString) => {
  const date = isoString ? new Date(isoString) : new Date();
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
};

const Certificado = ({ course, result, userEmail, onClose }) => {
  const displayName = userEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handlePrint = () => window.print();

  return (
    <motion.div
      className="certificado-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Botones de control — se ocultan al imprimir */}
      <div className="certificado-controls no-print">
        <button className="cert-btn-print" onClick={handlePrint}>
          <Printer size={18} /> Imprimir / Guardar PDF
        </button>
        <button className="cert-btn-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Área del certificado — única cosa visible al imprimir */}
      <div className="certificado-print-area">
        <div className="certificado-paper">

          {/* Borde decorativo */}
          <div className="cert-border-outer">
            <div className="cert-border-inner">

              {/* Header */}
              <div className="cert-header">
                <div className="cert-logo-area">
                  <div className="cert-logo-badge">R</div>
                  <span className="cert-logo-text">Ribeiro <strong>360</strong></span>
                </div>
                <div className="cert-academy-label">Academia Ribeiro</div>
              </div>

              {/* Título */}
              <div className="cert-title-section">
                <div className="cert-title-ornament"></div>
                <h1 className="cert-title">Certificado de Finalización</h1>
                <div className="cert-title-ornament"></div>
              </div>

              {/* Cuerpo */}
              <div className="cert-body">
                <p className="cert-certifica">Se certifica que</p>

                <div className="cert-name-wrapper">
                  <h2 className="cert-name">{displayName}</h2>
                  <div className="cert-name-underline"></div>
                </div>

                <p className="cert-completó">ha completado satisfactoriamente el curso</p>

                <div className="cert-course-wrapper">
                  <span className="cert-category-badge" style={{ backgroundColor: course.categoria?.color }}>
                    {course.categoria?.nombre}
                  </span>
                  <h3 className="cert-course-name">{course.titulo}</h3>
                </div>

                {result && (
                  <div className="cert-score-row">
                    <div className="cert-score-item">
                      <Award size={18} />
                      <span>Puntaje: <strong>{result.score}%</strong></span>
                    </div>
                    <div className="cert-score-item">
                      <span>Fecha: <strong>{formatDate(result.date)}</strong></span>
                    </div>
                    <div className="cert-score-item">
                      <span>Duración: <strong>{course.duracion_estimada}</strong></span>
                    </div>
                  </div>
                )}

                {!result && (
                  <p className="cert-date-solo">Fecha de emisión: <strong>{formatDate()}</strong></p>
                )}
              </div>

              {/* Footer con firmas */}
              <div className="cert-footer">
                <div className="cert-signature">
                  <div className="cert-signature-line"></div>
                  <p className="cert-signature-name">Academia Ribeiro</p>
                  <p className="cert-signature-role">Capacitación y Desarrollo</p>
                </div>
                <div className="cert-seal">
                  <div className="cert-seal-circle">
                    <span>R360</span>
                  </div>
                </div>
                <div className="cert-signature">
                  <div className="cert-signature-line"></div>
                  <p className="cert-signature-name">Recursos Humanos</p>
                  <p className="cert-signature-role">Ribeiro S.A.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Certificado;
