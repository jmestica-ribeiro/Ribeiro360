import React, { useState, useEffect, useRef } from 'react';
import { Box, TrendingUp, Activity, Globe, ShoppingCart, ExternalLink } from 'lucide-react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import '../Explorar.css';
import '../../dashboard/Dashboard.css';

// ----------------------------------------------------------------------
// LAZY IFRAME (carga diferida por IntersectionObserver)
// ----------------------------------------------------------------------
const LazyIframe = ({ title, src, height, bg }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ background: bg, minHeight: height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', padding: '24px' }}>
      {visible
        ? <iframe title={title} width="100%" height={height} src={src} allowFullScreen style={{ border: 'none', display: 'block' }} />
        : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#aaa' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" fill="#d1d5db" /><rect x="14" y="3" width="7" height="7" rx="1" fill="#d1d5db" opacity="0.6" /><rect x="3" y="14" width="7" height="7" rx="1" fill="#d1d5db" opacity="0.6" /><rect x="14" y="14" width="7" height="7" rx="1" fill="#d1d5db" /></svg>
          <span style={{ fontSize: '12px' }}>Cargando tablero...</span>
        </div>
      }
    </div>
  );
};

// ----------------------------------------------------------------------
// WIDGET DOLAR (Consumiendo DolarAPI)
// ----------------------------------------------------------------------
const DolarWidget = () => {
  const [dolares, setDolares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDolares = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares');
        const data = await res.json();
        const filtrados = data.filter(d => ['oficial', 'blue', 'mep', 'bolsa', 'tarjeta', 'cripto', 'ccl'].includes(d.casa));
        setDolares(filtrados);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDolares();
  }, []);

  if (loading) return <div className="skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 24 }}></div>;

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
      {dolares.map((d, index) => (
        <div key={index} style={{
          flex: '1 1 min-content',
          minWidth: '150px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dólar {d.nombre}</span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Compra</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>${d.compra.toFixed(2)}</div>
            </div>
            <div style={{ height: '30px', width: '1px', background: 'var(--border-color)' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Venta</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>${d.venta.toFixed(2)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ----------------------------------------------------------------------
// WIDGET INFLACIÓN (Consumiendo ArgentinaDatos - INDEC)
// ----------------------------------------------------------------------
const IpcWidget = () => {
  const [dataIpc, setDataIpc] = useState({ mensual: 0, interanual: 0, fecha: '' });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIpc = async () => {
      try {
        const res = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion');
        const data = await res.json();

        const ultimoDato = data[data.length - 1];
        const ultimos12 = data.slice(-12);

        let acumulado = 1;
        ultimos12.forEach(item => { acumulado *= (1 + (item.valor / 100)); });
        const interanual = (acumulado - 1) * 100;

        const [anio, mes, dia] = ultimoDato.fecha.split('-');
        const fechaObj = new Date(anio, mes - 1, dia);
        const mesStr = fechaObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

        setDataIpc({
          mensual: ultimoDato.valor.toFixed(1),
          interanual: interanual.toFixed(1),
          fecha: mesStr.charAt(0).toUpperCase() + mesStr.slice(1)
        });

        const hist = [];
        const startIndex = data.length - 24;

        for (let i = startIndex; i < data.length; i++) {
          if (i < 0) continue;
          const currentMonth = data[i];

          const slice12 = data.slice(Math.max(0, i - 11), i + 1);
          let iterAcum = 1;
          slice12.forEach(m => { iterAcum *= (1 + (m.valor / 100)); });
          const iterData = (iterAcum - 1) * 100;

          const [y, m, d] = currentMonth.fecha.split('-');
          const dateF = new Date(y, m - 1, 1);

          hist.push({
            mes: dateF.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
            Inflación: parseFloat(currentMonth.valor.toFixed(1)),
            Interanual: parseFloat(iterData.toFixed(1))
          });
        }
        setChartData(hist);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchIpc();
  }, []);

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 12, marginBottom: 24 }}></div>;

  return (
    <div style={{ marginBottom: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Inflación IPC Nacional</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Histórico 24 meses. Últ. Cierre: {dataIpc.fecha}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mensual ({dataIpc.fecha})</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#E71D36' }}>{dataIpc.mensual}%</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-color)', height: '40px' }}></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Interanual (Acum.)</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#E71D36' }}>{dataIpc.interanual}%</div>
          </div>
        </div>
      </div>

      <div style={{ height: 260, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInflacion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E71D36" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#E71D36" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
            <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />

            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
              itemStyle={{ fontWeight: 800 }}
              labelStyle={{ color: 'var(--text-muted)' }}
              formatter={(value, name) => [`${value}%`, name]}
            />

            <Area yAxisId="left" type="monotone" dataKey="Inflación" stroke="#E71D36" strokeWidth={3} fillOpacity={1} fill="url(#colorInflacion)" activeDot={{ r: 6, fill: '#E71D36', stroke: 'var(--bg-secondary)', strokeWidth: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="Interanual" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: 'var(--bg-secondary)', strokeWidth: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// WIDGET TASAS BANCARIAS (Plazo Fijo)
// ----------------------------------------------------------------------
const TasasWidget = () => {
  const [bancos, setBancos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasas = async () => {
      try {
        const res = await fetch('https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo');
        const data = await res.json();

        const nombresBuscados = [
          'BANCO DE LA NACION ARGENTINA',
          'BANCO DE GALICIA Y BUENOS AIRES S.A.',
          'BANCO SANTANDER ARGENTINA S.A.',
          'BANCO BBVA ARGENTINA S.A.',
          'BANCO MACRO S.A.'
        ];

        const seleccionados = data
          .filter(b => nombresBuscados.includes(b.entidad))
          .map(b => ({
            ...b,
            nombreCorto: b.entidad
              .replace('BANCO DE LA NACION ARGENTINA', 'Nación')
              .replace('BANCO DE GALICIA Y BUENOS AIRES S.A.', 'Galicia')
              .replace('BANCO SANTANDER ARGENTINA S.A.', 'Santander')
              .replace('BANCO BBVA ARGENTINA S.A.', 'BBVA')
              .replace('BANCO MACRO S.A.', 'Macro')
          }));

        setBancos(seleccionados);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasas();
  }, []);

  if (loading) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <TrendingUp size={16} color="var(--primary-color)" />
        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Tasas Plazo Fijo Automático (TNA)</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {bancos.map((b, i) => (
          <div key={i} style={{
            flex: '1 1 min-content',
            minWidth: '130px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img src={b.logo} alt={b.nombreCorto} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain', background: 'white', padding: 2 }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{b.nombreCorto}</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)' }}>{(b.tnaClientes * 100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ----------------------------------------------------------------------
// WIDGET UVA + RIESGO PAÍS (dos cards lado a lado)
// ----------------------------------------------------------------------
const UvaRiesgoWidget = () => {
  const [uva, setUva] = useState(null);
  const [riesgo, setRiesgo] = useState(null);
  const [uvaHist, setUvaHist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [resUva, resRiesgo] = await Promise.all([
          fetch('https://api.argentinadatos.com/v1/finanzas/indices/uva'),
          fetch('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo'),
        ]);
        const dataUva = await resUva.json();
        const dataRiesgo = await resRiesgo.json();

        if (Array.isArray(dataUva) && dataUva.length) {
          const ultimo = dataUva[dataUva.length - 1];
          setUva(ultimo);
          // últimos 60 días para mini-chart
          setUvaHist(dataUva.slice(-60).map(d => ({ fecha: d.fecha, valor: d.valor })));
        }
        if (dataRiesgo?.valor != null) setRiesgo(dataRiesgo);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const cardStyle = {
    flex: 1,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: 24,
    boxShadow: 'var(--shadow-sm)',
  };

  if (loading) return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      <div className="skeleton" style={{ flex: 1, height: 180, borderRadius: 12 }} />
      <div className="skeleton" style={{ flex: 1, height: 180, borderRadius: 12 }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>

      {/* UVA */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
            <Activity size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>Índice UVA</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unidad de Valor Adquisitivo · BCRA</div>
          </div>
        </div>

        {uva ? (
          <>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary-color)', lineHeight: 1 }}>
              ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(uva.valor)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginBottom: 16 }}>
              Al {new Date(uva.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            {uvaHist.length > 0 && (
              <div style={{ height: 70 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={uvaHist} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="uvaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F2DC00" stopOpacity={0.85} />
                        <stop offset="95%" stopColor="#F2DC00" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="valor" stroke="#F2DC00" strokeWidth={2} fill="url(#uvaGrad)" dot={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`$${v.toFixed(2)}`, 'UVA']}
                      labelFormatter={(l) => {
                        if (!l || typeof l !== 'string') return '';
                        const [y, m, d] = l.split('-');
                        if (!y || !m || !d) return l;
                        return new Date(+y, +m - 1, +d).toLocaleDateString('es-AR');
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos disponibles</div>}
      </div>

      {/* RIESGO PAÍS */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E71D36' }}>
            <Globe size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>Riesgo País</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>EMBI+ Argentina · JP Morgan</div>
          </div>
        </div>

        {riesgo ? (
          <>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#E71D36', lineHeight: 1 }}>
              {new Intl.NumberFormat('es-AR').format(riesgo.valor)} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>bps</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginBottom: 16 }}>
              Al {new Date(riesgo.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ background: 'var(--bg-color)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {riesgo.valor < 500 && '🟢 Riesgo bajo — mercado con confianza en la deuda soberana.'}
              {riesgo.valor >= 500 && riesgo.valor < 1000 && '🟡 Riesgo moderado — monitorear evolución de spreads.'}
              {riesgo.valor >= 1000 && riesgo.valor < 2000 && '🔴 Riesgo alto — spreads elevados, acceso a crédito limitado.'}
              {riesgo.valor >= 2000 && '⛔ Riesgo crítico — nivel de distress soberano.'}
            </div>
          </>
        ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos disponibles</div>}

        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>Fuente: ArgentinaDatos · api.argentinadatos.com</div>
      </div>

    </div>
  );
};

// ----------------------------------------------------------------------
// CONFIGURACIÓN DE HERRAMIENTAS INTERNAS
// ----------------------------------------------------------------------
const HERRAMIENTAS_INTERNAS = [
  {
    label: 'Resultados Mensuales',
    desc: 'Tablero con los resultados financieros del mes.',
    emoji: '📊',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    url: 'https://app.powerbi.com/links/q7o45Qp8Ui?ctid=dafe3bc5-6372-4396-8452-c707f3ecf4bf&pbi_source=linkShare'
  },
  {
    label: 'Combustible',
    desc: 'Seguimiento y control del consumo de combustible.',
    emoji: '⛽',
    gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)',
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    url: 'https://app.powerbi.com/links/vAOEHA0a5x?ctid=dafe3bc5-6372-4396-8452-c707f3ecf4bf&pbi_source=linkShare&bookmarkGuid=1ce4ff7f-0ceb-46f9-af24-6a609724febd'
  }
];

const PortalAdministracion = () => (
  <div className="portal-administracion">
    {/* SECCIÓN FINANCIERA */}
    <div style={{
      marginBottom: '40px',
      paddingTop: '8px',
      borderTop: '1px solid var(--border-color)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px', marginBottom: '24px' }}>
        <TrendingUp size={22} color="var(--primary-color)" />
        <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Dashboard Financiero & Macroeconomía</h3>
      </div>
      <UvaRiesgoWidget />
      <IpcWidget />
      <DolarWidget />
      <TasasWidget />
    </div>

    {/* PORTAL INTERNO */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      <Box size={22} color="var(--primary-color)" />
      <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Herramientas Internas</h3>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
      {HERRAMIENTAS_INTERNAS.map((item, i) => (
        <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: item.gradient, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
              {item.svg}
            </div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>{item.label}</div>
          </div>
          <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28 }}>{item.emoji}</span>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 240 }}>{item.desc}</div>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-color)', color: '#1a1a1a', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <ExternalLink size={16} />
              Abrir tablero
            </a>
          </div>
        </div>
      ))}
    </div>

    {/* SECCIÓN COMPRAS */}
    <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--border-color)' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
        <ShoppingCart size={22} color="var(--primary-color)" />
        <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Compras</h3>
      </div>

      {/* TABLEROS POWER BI */}
      <div style={{ marginBottom: '32px' }}>
        {/* Header sección */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)',
          borderRadius: '20px',
          padding: '32px 36px',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" fill="#60a5fa" /><rect x="14" y="3" width="7" height="7" rx="1" fill="#93c5fd" opacity="0.7" /><rect x="3" y="14" width="7" height="7" rx="1" fill="#93c5fd" opacity="0.7" /><rect x="14" y="14" width="7" height="7" rx="1" fill="#60a5fa" opacity="0.5" /></svg>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#93c5fd', letterSpacing: '0.05em' }}>POWER BI</span>
              </div>
            </div>
            <h2 style={{ color: '#fff', fontWeight: '900', fontSize: '22px', margin: '0 0 6px 0' }}>Tableros de Gestión</h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: 0 }}>Indicadores y seguimiento del proceso de compras</p>
          </div>
        </div>

        {/* Cards de tableros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Logística de Pedidos */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #e5e7eb', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>Logística de Pedidos</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>Seguimiento de órdenes de compra</div>
              </div>
            </div>
            <LazyIframe title="Compras - Pedidos" height={480} src="https://app.powerbi.com/view?r=eyJrIjoiMGQ0YTBkMGItYTdmNy00YTA2LWFkODUtZTIwODNjODAzYmNmIiwidCI6ImRhZmUzYmM1LTYzNzItNDM5Ni04NDUyLWM3MDdmM2VjZjRiZiJ9" bg="#f8faff" />
          </div>

          {/* Tracking de Compras */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #e5e7eb', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-8 4 4 4-6 4 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>Tracking de Compras</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>Reemplazar por el link del reporte cuando esté disponible</div>
              </div>
            </div>
            <LazyIframe title="Compras - Tracking" height={480} src="" bg="#f0fdf9" />
          </div>

        </div>
      </div>

      {/* FORMULARIOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>

        {/* SOLICITAR ALOJAMIENTO */}
        <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="9 22 9 12 15 12 15 22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>Solicitar Alojamiento</div>
          </div>
          <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28 }}>🏠</span>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: 6 }}>Formulario de Alojamiento</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 240 }}>
                Completá el formulario para solicitar alojamiento durante tu estadía.
              </div>
            </div>
            <a
              href="https://forms.office.com/Pages/ResponsePage.aspx?id=xTv-2nJjlkOEUscH8-z0v5ylO7XkDNVCiEAla9_6sGdURUE3TEZHSzVZODBaRDFWNVIyQlExNzJXMC4u"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--primary-color)',
                color: '#1a1a1a',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <ExternalLink size={16} />
              Abrir formulario
            </a>
          </div>
        </div>

        {/* SOLICITAR RETIRO DE PEDIDOS */}
        <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 10V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M23 3H1v7h22V3z" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 12h4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></svg>
            </div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>Solicitar Retiro de Pedidos</div>
          </div>
          <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28 }}>📦</span>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: 6 }}>Formulario de Retiro</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 240 }}>
                Completá el formulario en SharePoint para solicitar el retiro de tus pedidos.
              </div>
            </div>
            <a
              href="https://ribeirosrl1.sharepoint.com/sites/BDGenerales/_layouts/15/listforms.aspx?cid=YWI5ZGViYzUtNThlYi00NjVmLWI2ZDctMTlkNWY5MzE1YjVj&nav=YmIwNTY0YjUtN2EzYS00NzY0LWE0MjMtODNkYTJmYjEwNDM4"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--primary-color)',
                color: '#1a1a1a',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <ExternalLink size={16} />
              Abrir formulario
            </a>
          </div>
        </div>

        {/* RECURSOS - PLANILLA DESCARGABLE */}
        <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #4a1942 0%, #7c3aed 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="14 2 14 8 20 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="18" x2="12" y2="12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /><polyline points="9 15 12 18 15 15" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px' }}>Recursos</div>
          </div>
          <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28 }}>📊</span>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: 6 }}>Planilla de Compras</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 240 }}>
                Descargá la planilla modelo para gestionar y registrar tus pedidos.
              </div>
            </div>
            <a
              href="https://ribeirosrl1-my.sharepoint.com/:x:/g/personal/juan_mestica_ribeirosrl_com_ar/IQD_-t6J1qX1Tat1kCKToqyUAZIoLfp53W5RYMAiun11x-Y?e=q0Lo2y"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--primary-color)',
                color: '#1a1a1a',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <ExternalLink size={16} />
              Descargar planilla
            </a>
          </div>
        </div>

      </div>
    </div>

  </div>
);

export default PortalAdministracion;
