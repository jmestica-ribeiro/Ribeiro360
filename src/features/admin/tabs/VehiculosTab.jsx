import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, CheckCircle, AlertTriangle, X, RefreshCw,
  FileSpreadsheet, ChevronDown, ChevronUp, Truck,
} from 'lucide-react';
import { upsertVehiculos } from '../../../services/vehiculosService';

const EXPECTED_COLS = [
  'Nombre','Codigo','Descripcion','Activo','SumaAsegurada','NroSerie',
  'MarcaMotor','ExigeParteDiario','NroMotor','Aseguradora','AnioModelo',
  'Marca','Longitud','TipoCosteo','NroPoliza','AplicaCostoPorParo',
  'MaquinaAlquilada','CostoPorParo','Prima','Caudal','Propietario',
  'FechaVencimientoSeguro','TipoContratoAlquiler','MinimoHorasPorParte',
  'NroAcoplado','TipoContador','Certificado','Patente','Consumo','Potencia',
  'NroChasis','Capacidad','Costo','EsBienDeUso','Usr_aniomaquina',
  'Usr_pesomaquina','BienDeUso_Codigo','Moneda_Codigo','Producto_Codigo',
  'Marca_Codigo','Modelo_Codigo','Estado_Codigo','EsquemaContable_Codigo',
  'Usr_unidadidcapacidad_Codigo',
];

const BOOL_COLS = new Set([
  'Activo','ExigeParteDiario','AplicaCostoPorParo','MaquinaAlquilada','EsBienDeUso',
]);
const NUM_COLS = new Set([
  'SumaAsegurada','Longitud','CostoPorParo','Prima','Caudal','MinimoHorasPorParte',
  'Consumo','Potencia','Capacidad','Costo','Usr_pesomaquina',
]);

function parseBool(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'si' || s === 'sí') return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return null;
}

function parseNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function coerceRow(raw) {
  const row = {};
  for (const col of EXPECTED_COLS) {
    let val = raw[col] ?? null;
    if (BOOL_COLS.has(col))  val = parseBool(val);
    else if (NUM_COLS.has(col)) val = parseNum(val);
    else val = val !== null && val !== undefined ? String(val).trim() || null : null;
    row[col] = val;
  }
  return row;
}

const PREVIEW_COLS = ['Codigo', 'Nombre', 'Marca', 'Patente', 'Activo', 'Estado_Codigo'];

const VehiculosTab = () => {
  const fileRef = useRef(null);
  const [fileName, setFileName]     = useState('');
  const [rows, setRows]             = useState([]);
  const [missingCols, setMissing]   = useState([]);
  const [extraCols, setExtra]       = useState([]);
  const [step, setStep]             = useState('idle'); // idle | preview | importing | done | error
  const [importResult, setResult]   = useState(null);
  const [showPreview, setShow]      = useState(true);
  const [totalRaw, setTotalRaw]     = useState(0);
  const [errorMsg, setError]        = useState('');

  const reset = () => {
    setFileName(''); setRows([]); setMissing([]); setExtra([]);
    setStep('idle'); setResult(null); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStep('idle');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: null });

        if (raw.length === 0) { setError('El archivo no contiene filas.'); setStep('error'); return; }

        const fileCols = Object.keys(raw[0]);
        const missing = EXPECTED_COLS.filter(c => !fileCols.includes(c));
        const extra   = fileCols.filter(c => !EXPECTED_COLS.includes(c));
        setMissing(missing);
        setExtra(extra);

        const allParsed = raw.map(coerceRow);
        setTotalRaw(allParsed.length);
        const parsed = allParsed.filter(r => r['Activo'] === true);
        setRows(parsed);
        setStep('preview');
      } catch {
        setError('No se pudo leer el archivo. Verificá que sea un .xlsx válido.');
        setStep('error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    setStep('importing');
    const { inserted, updated, errors } = await upsertVehiculos(rows);
    setResult({ inserted, updated, errors });
    setStep('done');
  };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: '#6366f118', color: '#6366f1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Truck size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Importar Vehículos / Maquinaria
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Cargá un archivo .xlsx con las columnas del sistema. Se upsertea por <strong>Codigo</strong>.
          </p>
        </div>
      </div>

      {/* Drop zone / selector */}
      {step === 'idle' || step === 'error' ? (
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          padding: '36px 24px', borderRadius: 12, cursor: 'pointer',
          border: '2px dashed var(--border-color, #e5e7eb)',
          background: 'var(--bg-card)', transition: 'border-color 0.15s',
        }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: { files: [f] } }); } }}
        >
          <FileSpreadsheet size={36} style={{ color: '#22c55e', opacity: 0.8 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)' }}>
              Arrastrá tu archivo o hacé click para seleccionar
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Solo archivos .xlsx · Primera hoja del libro
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleFile} />
        </label>
      ) : null}

      {/* Error */}
      {step === 'error' && (
        <div style={{
          marginTop: 14, padding: '12px 16px', borderRadius: 8,
          background: '#fef2f2', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13,
        }}>
          <AlertTriangle size={16} /> {errorMsg}
          <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={14} /></button>
        </div>
      )}

      {/* Preview */}
      {(step === 'preview' || step === 'importing' || step === 'done') && rows.length > 0 && (
        <div style={{ marginTop: step === 'idle' ? 20 : 0 }}>

          {/* Resumen de columnas */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
          }}>
            <div style={{ padding: '8px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
              <CheckCircle size={13} style={{ marginRight: 5 }} />
              {rows.length} activos a importar
            </div>
            {totalRaw - rows.length > 0 && (
              <div style={{ padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
                {totalRaw - rows.length} inactivos ignorados
              </div>
            )}
            {missingCols.length > 0 && (
              <div style={{ padding: '8px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fde68a', fontSize: 13, color: '#b45309', fontWeight: 600 }}>
                <AlertTriangle size={13} style={{ marginRight: 5 }} />
                {missingCols.length} col. faltantes — se insertarán como null
              </div>
            )}
            {extraCols.length > 0 && (
              <div style={{ padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
                {extraCols.length} col. extra ignoradas
              </div>
            )}
            {step !== 'done' && (
              <button onClick={reset} style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                background: 'none', border: '1px solid var(--border-color,#e5e7eb)', color: 'var(--text-secondary)',
              }}>
                <X size={13} /> Cambiar archivo
              </button>
            )}
          </div>

          {/* Tabla preview */}
          <div style={{
            border: '1px solid var(--border-color,#e5e7eb)',
            borderRadius: 10, overflow: 'hidden', marginBottom: 16,
          }}>
            <button
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', background: 'var(--bg-card)', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
              onClick={() => setShow(s => !s)}
            >
              Vista previa (primeras 10 filas)
              {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showPreview && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {PREVIEW_COLS.map(c => (
                        <th key={c} style={{
                          padding: '8px 12px', textAlign: 'left', background: 'var(--bg-main)',
                          borderBottom: '1px solid var(--border-color,#e5e7eb)',
                          color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap',
                        }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {PREVIEW_COLS.map(c => (
                          <td key={c} style={{
                            padding: '8px 12px', color: 'var(--text-main)',
                            borderBottom: '1px solid var(--border-color,#e5e7eb)',
                            whiteSpace: 'nowrap',
                          }}>
                            {row[c] === null || row[c] === undefined
                              ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                              : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Columnas faltantes detalle */}
          {missingCols.length > 0 && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 8,
              background: '#fef3c7', border: '1px solid #fde68a', fontSize: 12, color: '#92400e',
            }}>
              <strong>Columnas no encontradas en el archivo:</strong>{' '}
              {missingCols.join(', ')}
            </div>
          )}

          {/* Botón importar */}
          {step === 'preview' && (
            <button
              onClick={handleImport}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              <Upload size={15} /> Importar {rows.length} registros
            </button>
          )}

          {step === 'importing' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 8,
              background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1d4ed8',
            }}>
              <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
              Importando {rows.length} registros...
            </div>
          )}

          {/* Resultado */}
          {step === 'done' && importResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                padding: '14px 18px', borderRadius: 10,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={16} /> Importación completada
                </div>
                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#166534' }}>
                  <span><strong>{importResult.inserted}</strong> insertados</span>
                  <span><strong>{importResult.updated}</strong> actualizados</span>
                  {importResult.errors > 0 && (
                    <span style={{ color: '#dc2626' }}><strong>{importResult.errors}</strong> errores</span>
                  )}
                </div>
              </div>
              <button
                onClick={reset}
                style={{
                  alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--bg-card)', border: '1px solid var(--border-color,#e5e7eb)',
                  color: 'var(--text-main)', cursor: 'pointer',
                }}
              >
                <Upload size={13} /> Nueva importación
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default VehiculosTab;
