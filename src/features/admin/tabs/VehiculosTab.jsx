import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, CheckCircle, AlertTriangle, X, RefreshCw,
  FileSpreadsheet, ChevronDown, ChevronUp,
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
    <div className="adm-panel adm-vehiculos">
      <div className="admin-list-header">
        <div>
          <h3>Importar vehículos / maquinaria</h3>
          <p className="adm-panel-desc">
            Cargá un archivo .xlsx con las columnas del sistema. Se actualiza por <strong>Codigo</strong>.
          </p>
        </div>
      </div>

      {step === 'idle' || step === 'error' ? (
        <label
          className="adm-dropzone"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: { files: [f] } }); } }}
        >
          <span className="adm-row-icon adm-dropzone-icon"><FileSpreadsheet size={22} strokeWidth={1.5} /></span>
          <span className="adm-dropzone-title">Arrastrá tu archivo o hacé click para seleccionar</span>
          <span className="adm-dropzone-hint">Solo archivos .xlsx · Primera hoja del libro</span>
          <input ref={fileRef} type="file" accept=".xlsx" className="adm-visually-hidden" onChange={handleFile} />
        </label>
      ) : null}

      {step === 'error' && (
        <div className="adm-alert danger" role="alert">
          <AlertTriangle size={16} strokeWidth={1.5} />
          <span>{errorMsg}</span>
          <button type="button" className="adm-action" aria-label="Descartar error" onClick={reset}><X size={16} strokeWidth={1.5} /></button>
        </div>
      )}

      {(step === 'preview' || step === 'importing' || step === 'done') && rows.length > 0 && (
        <div className="adm-stack">
          <div className="adm-summary">
            <span className="adm-badge success"><CheckCircle size={12} strokeWidth={1.5} /> {rows.length} activos a importar</span>
            {totalRaw - rows.length > 0 && (
              <span className="adm-badge neutral">{totalRaw - rows.length} inactivos ignorados</span>
            )}
            {missingCols.length > 0 && (
              <span className="adm-badge warning"><AlertTriangle size={12} strokeWidth={1.5} /> {missingCols.length} col. faltantes, se insertarán como null</span>
            )}
            {extraCols.length > 0 && (
              <span className="adm-badge neutral">{extraCols.length} col. extra ignoradas</span>
            )}
            {step !== 'done' && (
              <button type="button" className="btn-secondary adm-btn-sm" onClick={reset}>
                <X size={14} strokeWidth={1.5} /> Cambiar archivo
              </button>
            )}
          </div>

          <div className="adm-card adm-card-flush">
            <button
              type="button"
              className="adm-collapse"
              aria-expanded={showPreview}
              onClick={() => setShow(s => !s)}
            >
              Vista previa (primeras 10 filas)
              {showPreview ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
            </button>

            {showPreview && (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      {PREVIEW_COLS.map(c => <th key={c}>{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {PREVIEW_COLS.map(c => (
                          <td key={c} className="adm-nowrap">
                            {row[c] === null || row[c] === undefined
                              ? <span className="adm-null">—</span>
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

          {missingCols.length > 0 && (
            <div className="adm-alert warning">
              <AlertTriangle size={16} strokeWidth={1.5} />
              <span><strong>Columnas no encontradas en el archivo:</strong> {missingCols.join(', ')}</span>
            </div>
          )}

          {step === 'preview' && (
            <button type="button" className="btn-add-admin adm-self-start" onClick={handleImport}>
              <Upload size={16} strokeWidth={1.5} /> Importar {rows.length} registros
            </button>
          )}

          {step === 'importing' && (
            <div className="adm-alert info" role="status">
              <RefreshCw size={16} strokeWidth={1.5} className="adm-spin" />
              <span>Importando {rows.length} registros...</span>
            </div>
          )}

          {step === 'done' && importResult && (
            <>
              <div className="adm-alert success" role="status">
                <CheckCircle size={16} strokeWidth={1.5} />
                <div>
                  <strong>Importación completada</strong>
                  <div className="adm-result-stats">
                    <span><strong>{importResult.inserted}</strong> insertados</span>
                    <span><strong>{importResult.updated}</strong> actualizados</span>
                    {importResult.errors > 0 && (
                      <span className="adm-text-danger"><strong>{importResult.errors}</strong> errores</span>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" className="btn-secondary adm-btn-sm adm-self-start" onClick={reset}>
                <Upload size={14} strokeWidth={1.5} /> Nueva importación
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VehiculosTab;
