import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, FileText, Printer } from 'lucide-react';
import { fetchIncidenteInformeData } from '../../../services/sgiService';

const CLASIF_COLORS = {
  Ninguna:   '#6B7280',
  Menor:     '#10B981',
  Relevante: '#F59E0B',
  Crítica:   '#E71D36',
  Mayor:     '#8B5CF6',
};

const TECNICA_LABELS = {
  '5_porques': '5 Por qués',
  sistemico:   'Método Sistémico',
};

const CATEGORIAS_5P = ['Proceso', 'Posición', 'Partes', 'Personas', 'Papel'];

function fmt(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function fmtHora(h) { return h ? h.slice(0, 5) : '—'; }

/* ── Primitivos de layout ─────────────────────────────────────────────────── */
function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#111827' }}>{value || '—'}</div>
    </div>
  );
}

function Grid({ cols = 3, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0 20px' }}>
      {children}
    </div>
  );
}

function SectionTitle({ num, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px', borderBottom: '2px solid #f2dc00', paddingBottom: 6 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: '#f2dc00',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: '#141414', flexShrink: 0,
      }}>{num}</div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{label}</span>
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      background: color + '18', color, fontWeight: 700, fontSize: 11,
      border: `1px solid ${color}40`, marginRight: 6,
    }}>{label}</span>
  );
}

/* ── Contenido del informe ────────────────────────────────────────────────── */
function InformeContent({ data }) {
  const { incidente: inc, profiles, evidencias, timeline, signedUrls, cliente, acciones = [], hitos = [] } = data;

  const getProfile = (id) => profiles.find(p => p.id === id);

  const emisor        = getProfile(inc.emisor_id);
  const respSeg       = getProfile(inc.responsable_seguimiento_id);
  const respAnalisis  = getProfile(inc.responsable_analisis_id);

  const participantes = (() => {
    try { return Array.isArray(inc.participantes_analisis) ? inc.participantes_analisis : JSON.parse(inc.participantes_analisis || '[]'); }
    catch { return []; }
  })();

  const acr_porques = (() => {
    try { return Array.isArray(inc.acr_porques) ? inc.acr_porques : JSON.parse(inc.acr_porques || '[]'); }
    catch { return []; }
  })();

  const fotoPaths = [inc.foto_1, inc.foto_2, inc.foto_3, inc.foto_4, inc.foto_5, inc.foto_6].filter(Boolean);

  const clasifColor = CLASIF_COLORS[inc.clasificacion] || '#6b7280';

  const isImage = (p) => p && /\.(jpe?g|png|gif|webp)$/i.test(p);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111827', padding: '32px 40px', maxWidth: 860, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '3px solid #111827' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: '#111827', padding: '8px 12px', borderRadius: 8 }}>
            <span style={{ color: '#f2dc00', fontWeight: 900, fontSize: 14, letterSpacing: 1 }}>RIBEIRO</span>
          </div>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 2 }}>Informe de Incidente</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: -0.5 }}>{inc.numero || '—'}</div>
            <div style={{ marginTop: 6 }}>
              {inc.clasificacion && <Badge label={inc.clasificacion} color={clasifColor} />}
              {inc.tipo_incidente && <Badge label={inc.tipo_incidente} color="#3B82F6" />}
              <Badge
                label={inc.estado === 'cerrado' ? 'Cerrado' : inc.estado === 'proceso' ? 'En proceso' : 'Abierto'}
                color={inc.estado === 'cerrado' ? '#10B981' : inc.estado === 'proceso' ? '#F59E0B' : '#E71D36'}
              />
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fecha del evento</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{fmt(inc.fecha)}</div>
          {inc.hora_evento && <div style={{ fontSize: 12, color: '#6b7280' }}>{fmtHora(inc.hora_evento)} hs</div>}
        </div>
      </div>

      {/* ── Paso 1: Registro ── */}
      <SectionTitle num="1" label="Registro del Incidente" />

      <Grid cols={3}>
        <Field label="Gerencia" value={inc.gerencia} />
        <Field label="Sitio / Sucursal" value={inc.sitio} />
        <Field label="Tipo de Incidente" value={inc.tipo_incidente} />
      </Grid>
      <Grid cols={3}>
        <Field label="Lugar" value={inc.lugar} />
        <Field label="Tarea / Obra / Servicio" value={inc.tarea_obra_servicio} />
        <Field label="Interno / Vehículo" value={inc.interno_vehiculo} />
      </Grid>
      <Grid cols={3}>
        <Field label="Cliente" value={cliente} />
        <Field label="Nro. Contrato" value={inc.nro_contrato} />
        <Field label="Clasificación" value={inc.clasificacion} />
      </Grid>
      <Grid cols={2}>
        <Field label="Emisor" value={emisor ? `${emisor.full_name}${emisor.job_title ? ` · ${emisor.job_title}` : ''}` : null} />
        <Field label="Responsable de Seguimiento" value={respSeg ? `${respSeg.full_name}${respSeg.job_title ? ` · ${respSeg.job_title}` : ''}` : null} />
      </Grid>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 6 }}>Descripción del evento</div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#111827', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {inc.descripcion || '—'}
        </div>
      </div>

      {/* Fotos */}
      {fotoPaths.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 8 }}>Registros fotográficos</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fotoPaths.map(path => (
              signedUrls[path] ? (
                <img key={path} src={signedUrls[path]} alt="foto"
                  style={{ width: 130, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* ── Paso 2: Evidencias ── */}
      <div className="no-break">
        <SectionTitle num="2" label="Evidencias" />

        {/* 5P */}
        {evidencias.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Evidencias 5P</div>
            {CATEGORIAS_5P.map(cat => {
              const rows = evidencias.filter(e => e.categoria === cat);
              if (rows.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, background: '#111827', color: '#f2dc00', padding: '3px 10px', borderRadius: '6px 6px 0 0', display: 'inline-block' }}>{cat}</div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '0 6px 6px 6px', overflow: 'hidden' }}>
                    {rows.map((ev, i) => (
                      <div key={ev.id} style={{ padding: '8px 12px', background: i % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1, fontSize: 12, color: '#111827', lineHeight: 1.5 }}>{ev.descripcion || '(sin descripción)'}</div>
                        {ev.adjunto_path && isImage(ev.adjunto_path) && signedUrls[ev.adjunto_path] && (
                          <img src={signedUrls[ev.adjunto_path]} alt="adjunto"
                            style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb', flexShrink: 0 }} />
                        )}
                        {ev.adjunto_path && !isImage(ev.adjunto_path) && (
                          <span style={{ fontSize: 10, color: '#6b7280', flexShrink: 0 }}>📎 Adjunto</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cronología */}
        {timeline.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Línea del tiempo / Cronología</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#111827', color: '#f2dc00' }}>
                  <th style={{ padding: '6px 12px', textAlign: 'left', width: 100, fontWeight: 700, fontSize: 11 }}>Fecha</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', width: 70,  fontWeight: 700, fontSize: 11 }}>Hora</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left',             fontWeight: 700, fontSize: 11 }}>Actividad</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((row, i) => (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{fmt(row.fecha)}</td>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{fmtHora(row.hora)}</td>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid #f3f4f6', color: '#111827', lineHeight: 1.5 }}>{row.actividad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {evidencias.length === 0 && timeline.length === 0 && (
          <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Sin evidencias registradas.</p>
        )}
      </div>

      {/* ── Paso 3: Equipo de Análisis ── */}
      <div className="no-break">
        <SectionTitle num="3" label="Equipo de Análisis" />
        <Grid cols={2}>
          <Field label="Responsable de Análisis" value={respAnalisis ? `${respAnalisis.full_name}${respAnalisis.job_title ? ` · ${respAnalisis.job_title}` : ''}` : null} />
          <Field
            label="Participantes"
            value={participantes.length > 0
              ? participantes.map(pid => getProfile(pid)?.full_name).filter(Boolean).join(' · ')
              : '—'}
          />
        </Grid>
      </div>

      {/* ── Paso 4: Análisis de Causa Raíz ── */}
      {inc.acr_tecnica && (
        <div className="no-break">
          <SectionTitle num="4" label="Análisis de Causa Raíz" />
          <Field label="Técnica utilizada" value={TECNICA_LABELS[inc.acr_tecnica] || inc.acr_tecnica} />

          {inc.acr_tecnica === '5_porques' && acr_porques.some(p => p?.trim()) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 8 }}>Los 5 Por qués</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {acr_porques.map((p, i) => p?.trim() ? (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f2dc00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, fontSize: 12, color: '#111827', paddingTop: 3, lineHeight: 1.5 }}>{p}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {inc.acr_tecnica === 'sistemico' && (() => {
            const causas = (() => { try { return Array.isArray(inc.acr_sistemico_causas) ? inc.acr_sistemico_causas : JSON.parse(inc.acr_sistemico_causas || '[]'); } catch { return []; } })();
            const catColors = { 'Factores Organizacionales': '#1a5276', 'Contexto de trabajo / de la Operación': '#117a65', 'Desempeño Humano / Fallas Técnicas': '#935116', 'Barreras Ausentes / Fallidas': '#7b241c' };
            const grupos = causas.reduce((acc, c) => { (acc[c.categoria] = acc[c.categoria] || []).push(c); return acc; }, {});
            return (
              <>
                {causas.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 8 }}>Causas Identificadas ({causas.length})</div>
                    {Object.entries(grupos).map(([cat, items]) => {
                      const color = catColors[cat] || '#374151';
                      return (
                        <div key={cat} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: color, padding: '3px 10px', borderRadius: '6px 6px 0 0', display: 'inline-block' }}>{cat}</div>
                          <div style={{ border: `1px solid ${color}40`, borderRadius: '0 6px 6px 6px', overflow: 'hidden' }}>
                            {items.map((c, i) => (
                              <div key={i} style={{ padding: '6px 12px', background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: i < items.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: 11, color: '#111827', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <span style={{ color, fontWeight: 900, fontSize: 14, lineHeight: 1 }}>•</span>
                                <span style={{ lineHeight: 1.5 }}><span style={{ color: '#6b7280', fontSize: 10 }}>{c.subcategoria} · </span>{c.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {inc.acr_sistemico && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 6 }}>Análisis Sistémico</div>
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {inc.acr_sistemico}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {inc.acr_causa_raiz && (
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#a16207', marginBottom: 4 }}>Causa Raíz Identificada</div>
              <div style={{ fontSize: 12, color: '#111827', lineHeight: 1.6 }}>{inc.acr_causa_raiz}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Paso 5: Plan de Trabajo ── */}
      {acciones.length > 0 && (
        <div>
          <SectionTitle num="5" label="Plan de Trabajo" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#111827', color: '#f2dc00' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, width: 80 }}>Código</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>Descripción</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, width: 120 }}>Responsable</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, width: 90 }}>Vencimiento</th>
                <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, width: 70 }}>Avance</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, width: 80 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {acciones.map((a, i) => {
                const resp = profiles.find(p => p.id === a.responsable_id);
                const estadoColor = { pendiente: '#F59E0B', en_proceso: '#3B82F6', cerrada: '#10B981' }[a.estado] || '#9ca3af';
                const accionHitos = hitos.filter(h => h.accion_id === a.id);
                return (
                  <React.Fragment key={a.id}>
                    <tr style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, color: '#374151' }}>
                        {a.codigo}
                        {a.tipo === 'rectificativa' && <span style={{ display: 'block', fontSize: 9, color: '#DC2626', fontWeight: 700 }}>RECTIF.</span>}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#111827', lineHeight: 1.5 }}>{a.descripcion}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{resp?.full_name || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{fmt(a.fecha_vencimiento)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontWeight: 700, color: a.avance === 100 ? '#10B981' : '#374151' }}>{a.avance || 0}%</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ background: estadoColor + '20', color: estadoColor, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{a.estado?.replace('_', ' ')}</span>
                      </td>
                    </tr>
                    {accionHitos.map(h => (
                      <tr key={h.id} style={{ background: '#fefce8' }}>
                        <td style={{ padding: '4px 10px 4px 20px', borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontSize: 10 }}>↳ hito</td>
                        <td colSpan={3} style={{ padding: '4px 10px', borderBottom: '1px solid #f3f4f6', fontSize: 11, color: '#374151' }}>{h.descripcion}</td>
                        <td style={{ padding: '4px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontSize: 11, color: '#d97706', fontWeight: 700 }}>+{h.porcentaje}%</td>
                        <td style={{ padding: '4px 10px', borderBottom: '1px solid #f3f4f6', fontSize: 10, color: '#9ca3af' }}>{fmt(h.fecha)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Paso 6: Verificación de Eficacia ── */}
      {acciones.some(a => a.verif_eficaz !== null && a.verif_eficaz !== undefined) && (
        <div style={{ marginTop: 20 }}>
          <SectionTitle num="6" label="Verificación de Eficacia" />
          {acciones.filter(a => a.verif_eficaz !== null && a.verif_eficaz !== undefined).map((a, i) => {
            const resp = profiles.find(p => p.id === a.responsable_id);
            const eficaz = a.verif_eficaz;
            return (
              <div key={a.id} style={{ marginBottom: 12, border: `1px solid ${eficaz ? '#86efac' : '#fca5a5'}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: eficaz ? '#f0fdf4' : '#fff1f2' }}>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{a.codigo}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: eficaz ? '#15803d' : '#DC2626' }}>{eficaz ? '✓ Eficaz' : '✗ No eficaz'}</span>
                  {a.verif_fecha && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>Evaluado: {fmt(a.verif_fecha)}</span>}
                </div>
                {a.verif_detalle && (
                  <div style={{ padding: '8px 14px', fontSize: 11, color: '#374151', lineHeight: 1.5, background: '#fff' }}>
                    {a.verif_detalle}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>Ribeiro 360 · Sistema de Gestión Integral</span>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>Generado el {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

/* ── Modal principal ─────────────────────────────────────────────────────── */
export default function IncidenteInformePDF({ incidenteId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    fetchIncidenteInformeData(incidenteId).then(({ data: d, error: e }) => {
      if (e) setError('No se pudo cargar el informe.');
      else setData(d);
      setLoading(false);
    });
  }, [incidenteId]);

  const handleExport = () => {
    const html = contentRef.current?.innerHTML;
    if (!html) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8" />
      <title>${data?.incidente?.numero || 'Informe'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #fff; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-break { page-break-inside: avoid; }
        }
      </style>
    </head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 920, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>

        {/* Header del modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} color="#111827" />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Vista previa del informe</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!loading && data && (
              <button
                onClick={handleExport}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111827', color: '#f2dc00', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                <Printer size={15} /> Imprimir / Guardar PDF
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ overflowY: 'auto', maxHeight: '80vh', background: '#f3f4f6', padding: 24 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 60, color: '#6b7280' }}>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Cargando informe...</span>
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', padding: 60, color: '#E71D36' }}>{error}</div>
          )}
          {data && (
            <div ref={contentRef} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <InformeContent data={data} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.getElementById('portal-root')
  );
}
