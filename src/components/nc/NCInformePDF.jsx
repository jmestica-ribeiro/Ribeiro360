import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const FUENTES_LABELS = {
  fuente_quejas: 'Quejas / Reclamos',
  fuente_auditoria_interna: 'Auditoría Interna',
  fuente_auditoria_externa: 'Auditoría Externa',
  fuente_requisitos_legales: 'Requisitos Legales',
  fuente_norma: 'Norma',
  fuente_documento_interno: 'Documento Interno',
  fuente_producto_no_conforme: 'Producto no conforme',
  fuente_servicio_no_conforme: 'Servicio no conforme',
  fuente_otros: 'Otros',
};

const TECNICA_LABELS = {
  '5_porques': '5 Por qués',
  ishikawa: 'Diagrama Ishikawa',
  otro: 'Otro',
};

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#111827' }}>{value || '—'}</div>
    </div>
  );
}

function SectionTitle({ num, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px', borderBottom: '2px solid #f2dc00', paddingBottom: 6 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: '#f2dc00',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: '#141414', flexShrink: 0,
      }}>{num}</div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{label}</span>
    </div>
  );
}

function InformeContent({ data }) {
  const { hallazgo, profiles, clientes, acciones } = data;

  const getProfile = (id) => profiles.find(p => p.id === id);
  const getCliente = (id) => clientes.find(c => c.id === id);

  const fuentesActivas = Object.keys(FUENTES_LABELS).filter(k => hallazgo[k]);
  const participantes = hallazgo.participantes_analisis || [];
  const responsableAnalisis = getProfile(hallazgo.responsable_analisis_id);
  const emisor = getProfile(hallazgo.emisor_id);
  const auditor = getProfile(hallazgo.auditor_id);
  const cliente = getCliente(hallazgo.cliente_id);

  const tipoColors = { NC: '#E71D36', OBS: '#F59E0B', OM: '#3B82F6', Fortaleza: '#10B981' };
  const tipoColor = tipoColors[hallazgo.tipo] || '#6b7280';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#111827', background: '#fff', padding: '32px 40px', width: 780 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '3px solid #111827' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 4 }}>Informe de Hallazgo</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{hallazgo.numero || '—'}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{formatDate(hallazgo.fecha)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <span style={{
            background: tipoColor + '20', color: tipoColor, border: `1px solid ${tipoColor}40`,
            borderRadius: 6, padding: '4px 14px', fontSize: 13, fontWeight: 700,
          }}>{hallazgo.tipo}</span>
          <span style={{
            background: hallazgo.estado === 'cerrado' ? '#d1fae5' : '#fef3c7',
            color: hallazgo.estado === 'cerrado' ? '#059669' : '#d97706',
            borderRadius: 6, padding: '3px 12px', fontSize: 11, fontWeight: 600,
          }}>{hallazgo.estado === 'cerrado' ? 'Cerrado' : 'Abierto'}</span>
        </div>
      </div>

      {/* Paso 1 */}
      <SectionTitle num={1} label="Registro del Hallazgo" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
        <Field label="Gerencia" value={hallazgo.gerencia} />
        <Field label="Sitio" value={hallazgo.sitio} />
        <Field label="Fecha" value={formatDate(hallazgo.fecha)} />
        <Field label="Obra" value={hallazgo.obra} />
        <Field label="Nro. Contrato" value={hallazgo.nro_contrato} />
        <Field label="Cliente" value={cliente?.nombre} />
        <Field label="Auditor" value={auditor?.full_name} />
        <Field label="Emisor" value={emisor?.full_name} />
        <Field label="Responsable del Proceso" value={hallazgo.responsable_proceso} />
      </div>

      {fuentesActivas.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 6 }}>Fuentes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {fuentesActivas.map(k => (
              <span key={k} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#374151' }}>
                {FUENTES_LABELS[k]}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 4 }}>Descripción del Hallazgo</div>
        <div style={{ fontSize: 12, color: '#111827', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {hallazgo.descripcion || '—'}
        </div>
      </div>

      {/* Paso 2 */}
      <SectionTitle num={2} label="Equipo de Análisis" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 8 }}>
        <Field label="Responsable de Análisis" value={responsableAnalisis?.full_name} />
        <Field label="Participantes" value={
          participantes.length > 0
            ? participantes.map(pid => profiles.find(p => p.id === pid)?.full_name).filter(Boolean).join(', ')
            : '—'
        } />
      </div>

      {/* Paso 3 */}
      <SectionTitle num={3} label="Análisis de Causa Raíz" />
      <Field label="Técnica utilizada" value={TECNICA_LABELS[hallazgo.acr_tecnica] || '—'} />

      {hallazgo.acr_tecnica === '5_porques' && hallazgo.acr_porques && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 6 }}>5 Por qués</div>
          {(hallazgo.acr_porques || []).filter(p => p?.trim()).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: '#111827', paddingTop: 2 }}>{p}</div>
            </div>
          ))}
        </div>
      )}

      {hallazgo.acr_tecnica === 'ishikawa' && hallazgo.acr_ishikawa && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 6 }}>Diagrama Ishikawa</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
            {Object.entries({
              mano_obra: 'Mano de Obra', maquinas: 'Máquinas', materiales: 'Materiales',
              metodos: 'Métodos', medio_ambiente: 'Medio Ambiente', medicion: 'Medición',
            }).map(([k, label]) => hallazgo.acr_ishikawa[k] ? (
              <div key={k} style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{label}: </span>
                <span style={{ fontSize: 12, color: '#111827' }}>{hallazgo.acr_ishikawa[k]}</span>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {hallazgo.acr_tecnica === 'otro' && hallazgo.acr_otro_descripcion && (
        <Field label="Descripción del análisis" value={hallazgo.acr_otro_descripcion} />
      )}

      {hallazgo.acr_causa_raiz && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 4 }}>Causa Raíz Identificada</div>
          <div style={{ fontSize: 12, color: '#111827', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 14px', lineHeight: 1.6 }}>
            {hallazgo.acr_causa_raiz}
          </div>
        </div>
      )}

      {/* Paso 4 */}
      <SectionTitle num={4} label="Plan de Trabajo" />
      {acciones.length === 0 ? (
        <p style={{ fontSize: 12, color: '#6b7280' }}>No hay acciones registradas.</p>
      ) : acciones.map((a, idx) => {
        const estadoColors = { pendiente: '#F59E0B', en_proceso: '#3B82F6', cerrada: '#10B981' };
        const estadoColor = estadoColors[a.estado] || '#6b7280';
        return (
          <div key={a.id} className="no-break" style={{ marginBottom: 14, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{a.codigo}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Vence: {formatDate(a.fecha_vencimiento)}</span>
                <span style={{ background: estadoColor + '20', color: estadoColor, borderRadius: 4, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                  {a.estado?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 12, color: '#111827', marginBottom: 8 }}>{a.descripcion}</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280' }}>Responsable: </span>
                  <span style={{ fontSize: 11, color: '#374151' }}>{a.responsable?.full_name || '—'}</span>
                </div>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280' }}>Avance: </span>
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: 700 }}>{a.avance || 0}%</span>
                </div>
              </div>
              {/* Barra de avance */}
              <div style={{ marginTop: 8, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${a.avance || 0}%`, background: a.avance === 100 ? '#10B981' : '#f2dc00', borderRadius: 3 }} />
              </div>
              {/* Hitos */}
              {a.hitos && a.hitos.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>Historial de avance</div>
                  {a.hitos.map((h, hi) => (
                    <div key={hi} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid #e5e7eb' }}>
                      <span style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(h.fecha)}</span>
                      <span style={{ fontSize: 10, color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>+{h.porcentaje}%</span>
                      <span style={{ fontSize: 10, color: '#374151' }}>{h.descripcion}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Paso 5 */}
      <div className="no-break">
      <SectionTitle num={5} label="Verificación de Eficacia" />
      {acciones.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af' }}>No hay acciones registradas.</p>
      ) : acciones.map(a => {
        const tieneVerif = a.verif_eficaz !== null && a.verif_eficaz !== undefined;
        const eficazColor = a.verif_eficaz ? '#059669' : '#E71D36';
        return (
          <div key={a.id} className="no-break" style={{ marginBottom: 12, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{a.codigo}</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {a.verif_fecha && <span style={{ fontSize: 11, color: '#6b7280' }}>Evaluado: {formatDate(a.verif_fecha)}</span>}
                {tieneVerif ? (
                  <span style={{ background: eficazColor + '20', color: eficazColor, border: `1px solid ${eficazColor}40`, borderRadius: 4, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {a.verif_eficaz ? '✓ Eficaz' : '✗ No eficaz'}
                  </span>
                ) : (
                  <span style={{ background: '#f3f4f6', color: '#9ca3af', borderRadius: 4, padding: '2px 10px', fontSize: 11 }}>Pendiente</span>
                )}
              </div>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}><strong>Acción:</strong> {a.descripcion}</div>
              {a.verif_detalle ? (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: 3 }}>Detalle de verificación</div>
                  <div style={{ fontSize: 12, color: '#111827', background: tieneVerif ? (a.verif_eficaz ? '#f0fdf4' : '#fef2f2') : '#f9fafb', border: `1px solid ${tieneVerif ? (a.verif_eficaz ? '#bbf7d0' : '#fecaca') : '#e5e7eb'}`, borderRadius: 6, padding: '8px 12px', lineHeight: 1.6 }}>
                    {a.verif_detalle}
                  </div>
                </div>
              ) : !tieneVerif ? (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Sin verificación registrada.</p>
              ) : null}
            </div>
          </div>
        );
      })}

      </div>{/* end no-break paso 5 */}

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>Generado el {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>SGI — Sistema de Gestión Integrado</span>
      </div>
    </div>
  );
}

export default function NCExportarPDF({ hallazgoId, onClose }) {
  const contentRef = useRef();
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Cargar todos los datos al montar
  React.useEffect(() => {
    const load = async () => {
      try {
        const { data: hallazgo, error: errH } = await supabase
          .from('nc_hallazgos').select('*').eq('id', hallazgoId).single();
        if (errH) throw errH;

        const [
          { data: profiles },
          { data: clientes },
          { data: accionesRaw, error: errA },
        ] = await Promise.all([
          supabase.from('profiles').select('id, full_name'),
          supabase.from('centros_de_costos').select('id, nombre'),
          supabase.from('nc_acciones')
            .select('id, codigo, descripcion, responsable_id, fecha_vencimiento, avance, estado, verif_eficaz, verif_fecha, verif_detalle, responsable:profiles!responsable_id(full_name)')
            .eq('hallazgo_id', hallazgoId)
            .order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
        ]);

        if (errA) console.error('Error acciones:', errA);

        // Cargar hitos de cada acción
        const acciones = await Promise.all((accionesRaw || []).map(async a => {
          const { data: hitos } = await supabase
            .from('nc_accion_hitos').select('fecha, porcentaje, descripcion')
            .eq('accion_id', a.id).order('fecha', { ascending: true });
          return { ...a, hitos: hitos || [] };
        }));

        setData({ hallazgo, profiles: profiles || [], clientes: clientes || [], acciones });
      } catch (err) {
        console.error('Error cargando informe:', err);
        setLoadError('Error al cargar los datos del hallazgo.');
      }
    };
    load();
  }, [hallazgoId]);

  const handleExport = () => {
    if (!contentRef.current) return;
    const html = contentRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Informe ${data?.hallazgo?.numero || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #111827; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 12mm; size: A4; }
      .no-break { page-break-inside: avoid; break-inside: avoid; }
    }
    .no-break { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>${html}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      padding: '20px 0', overflowY: 'auto',
    }}>
      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#1f2937', borderRadius: 10,
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 400,
      }}>
        <FileText size={16} color="#f2dc00" />
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, flex: 1 }}>
          {data ? `Informe — ${data.hallazgo?.numero}` : 'Preparando informe...'}
        </span>
        <button
          onClick={handleExport}
          disabled={!data}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#f2dc00', color: '#141414', border: 'none',
            borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 700,
            cursor: !data ? 'not-allowed' : 'pointer',
            opacity: !data ? 0.6 : 1,
          }}
        >
          Descargar PDF
        </button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}>
          <X size={18} />
        </button>
      </div>

      {/* Preview */}
      {loadError ? (
        <div style={{ color: '#ef4444', background: '#fff', padding: 20, borderRadius: 8 }}>{loadError}</div>
      ) : !data ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
          <Loader2 size={20} style={{ animation: 'spin 0.7s linear infinite' }} />
          Cargando datos...
        </div>
      ) : (
        <div ref={contentRef} style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.3)' }}>
          <InformeContent data={data} />
        </div>
      )}
    </div>,
    document.getElementById('portal-root')
  );
}
