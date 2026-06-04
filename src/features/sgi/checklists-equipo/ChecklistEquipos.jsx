import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList, Search, ChevronLeft, Trash2, Save, Truck,
  CheckCircle, AlertTriangle, Minus, FileText, Filter, Eye, QrCode, Ban,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import {
  fetchCheqItems, saveCheqChecklist, fetchCheqChecklists,
  fetchCheqDetalle, deleteCheqChecklist,
} from '../../../services/sgiService';
import { LoadingSpinner, EmptyState } from '../../../components/common';
import ChecklistPDF from './ChecklistPDF';
import VehiculoPicker from './VehiculoPicker';
import QRStickerModal from './QRStickerModal';
import { TIPOS_EQUIPO } from './tiposEquipo';
import './ChecklistEquipos.css';

const ESTADO_CONFIG = {
  bien:    { label: 'Bien',    color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  regular: { label: 'Regular', color: '#f59e0b', bg: '#fef3c7', icon: Minus },
  mal:     { label: 'Mal',     color: '#ef4444', bg: '#fee2e2', icon: AlertTriangle },
  na:      { label: 'N/A',     color: '#94a3b8', bg: '#f1f5f9', icon: Ban },
};

function formatDate(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

// ── Vista: Selector de tipo ────────────────────────────────────────────────────
function TipoSelector({ onSelect }) {
  return (
    <div className="cheq-container">
      <div className="cheq-page-header">
        <div className="cheq-header-icon"><ClipboardList size={26} /></div>
        <div>
          <h2>Checklists de Equipo</h2>
          <p>Seleccioná el tipo de equipo para registrar un control</p>
        </div>
      </div>
      <div className="cheq-tipo-grid">
        {TIPOS_EQUIPO.map(t => (
          <button key={t.key} className="cheq-tipo-card" onClick={() => onSelect(t)}>
            <ClipboardList size={28} className="cheq-tipo-icon" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Vista: Formulario de checklist ─────────────────────────────────────────────
function ChecklistForm({ tipo, vehiculoInicial, onBack, onSaved }) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [header, setHeader] = useState({
    fecha: today, lugar: '', interno_nro: vehiculoInicial?.interno_nro ?? '', km_hrs: '',
  });
  const [respuestas, setRespuestas] = useState({});

  useEffect(() => {
    fetchCheqItems(tipo.key).then(({ data }) => {
      setItems(data);
      const init = {};
      data.forEach(i => { init[i.id] = { estado: '', observacion: '' }; });
      setRespuestas(init);
      setIsLoading(false);
    });
  }, [tipo.key]);

  const setEstado = (itemId, estado) =>
    setRespuestas(prev => ({ ...prev, [itemId]: { ...prev[itemId], estado } }));
  const setObs = (itemId, observacion) =>
    setRespuestas(prev => ({ ...prev, [itemId]: { ...prev[itemId], observacion } }));

  const canSave = header.fecha && Object.values(respuestas).every(r => r.estado !== '');

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    const checkHeader = {
      tipo_equipo: tipo.key,
      fecha: header.fecha,
      lugar: header.lugar || null,
      interno_nro: header.interno_nro || null,
      km_hrs: header.km_hrs || null,
      operador_id: profile?.id || null,
    };
    const rows = Object.entries(respuestas).map(([item_id, r]) => ({
      item_id, estado: r.estado, observacion: r.observacion || null,
    }));
    const { data, error } = await saveCheqChecklist(checkHeader, rows);
    setIsSaving(false);
    if (error) {
      showToast('Ocurrió un error al guardar el checklist. Intentá de nuevo.', 'error');
      return;
    }
    if (data) {
      showToast(`Checklist de ${tipo.label} guardado correctamente.`, 'success');
      onSaved(data.id);
    }
  };

  if (isLoading) return <div className="cheq-container"><LoadingSpinner /></div>;

  return (
    <div className="cheq-container">
      <div className="cheq-page-header">
        <button className="cheq-back-btn" onClick={onBack}><ChevronLeft size={18} /> Volver</button>
        <div className="cheq-header-icon"><ClipboardList size={24} /></div>
        <div>
          <h2>Checklist — {tipo.label}</h2>
          <p>Completá todos los ítems antes de guardar</p>
        </div>
      </div>

      {/* Selector de equipo — encabezado de impacto */}
      <div className="cheq-section-label">
        <Truck size={13} /> Equipo
      </div>
      <VehiculoPicker
        value={header.interno_nro}
        tipoEquipo={tipo.key}
        onChange={v => setHeader(h => ({ ...h, interno_nro: v.interno_nro }))}
      />

      {/* Resto de datos del parte */}
      <div className="cheq-card" style={{ marginTop: 16 }}>
        <div className="cheq-card-title"><FileText size={14} /> Datos del parte</div>
        <div className="cheq-form-grid cheq-form-3col">
          <div className="cheq-form-group">
            <label>Fecha <span className="cheq-req">*</span></label>
            <input type="date" value={header.fecha}
              onChange={e => setHeader(h => ({ ...h, fecha: e.target.value }))} />
          </div>
          <div className="cheq-form-group">
            <label>Lugar</label>
            <input value={header.lugar} placeholder="Ej: Obra Río Cuarto"
              onChange={e => setHeader(h => ({ ...h, lugar: e.target.value }))} />
          </div>
          <div className="cheq-form-group">
            <label>Km / Hrs</label>
            <input value={header.km_hrs} placeholder="Ej: 1250 Hrs"
              onChange={e => setHeader(h => ({ ...h, km_hrs: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Ítems */}
      {items.length === 0 ? (
        <EmptyState mensaje="No hay ítems configurados para este tipo de equipo. Un administrador debe cargarlos desde el Panel Admin." />
      ) : (
        <div className="cheq-card">
          <div className="cheq-card-title"><ClipboardList size={14} /> Verificaciones</div>
          <div className="cheq-items-list">
            {items.map((item, idx) => {
              const r = respuestas[item.id] || { estado: '', observacion: '' };
              return (
                <div key={item.id} className={`cheq-item-row${r.estado ? ` estado-${r.estado}` : ''}`}>
                  <div className="cheq-item-num">{idx + 1}</div>
                  <div className="cheq-item-body">
                    <div className="cheq-item-nombre">{item.nombre}</div>
                    <div className="cheq-item-controles">
                      {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => {
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={key}
                            className={`cheq-estado-btn${r.estado === key ? ' active' : ''}`}
                            style={r.estado === key ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
                            onClick={() => setEstado(item.id, key)}
                          >
                            <Icon size={13} /> {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                    {(r.estado === 'regular' || r.estado === 'mal') && (
                      <input
                        className="cheq-obs-input"
                        placeholder="Observación (recomendado)"
                        value={r.observacion}
                        onChange={e => setObs(item.id, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="cheq-form-actions">
        <button className="cheq-btn-secondary" onClick={onBack}>Cancelar</button>
        <button
          className="cheq-btn-primary"
          onClick={handleSave}
          disabled={isSaving || !canSave}
        >
          <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar checklist'}
        </button>
      </div>
    </div>
  );
}

// ── Vista: Historial ───────────────────────────────────────────────────────────
function Historial({ onBack, onViewDetalle }) {
  const [checklists, setChecklists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroInterno, setFiltroInterno] = useState('');
  const debounceRef = useRef(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data } = await fetchCheqChecklists({
      tipoEquipo: filtroTipo || undefined,
      internoNro: filtroInterno || undefined,
    });
    setChecklists(data);
    setIsLoading(false);
  }, [filtroTipo, filtroInterno]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 300);
    return () => clearTimeout(debounceRef.current);
  }, [load]);

  return (
    <div className="cheq-container">
      <div className="cheq-page-header">
        <button className="cheq-back-btn" onClick={onBack}><ChevronLeft size={18} /> Volver</button>
        <div className="cheq-header-icon"><ClipboardList size={24} /></div>
        <div><h2>Historial de Checklists</h2></div>
      </div>

      <div className="cheq-filtros">
        <div className="cheq-filtro-item">
          <Filter size={14} />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los equipos</option>
            {TIPOS_EQUIPO.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div className="cheq-filtro-item">
          <Search size={14} />
          <input
            placeholder="Buscar por interno..."
            value={filtroInterno}
            onChange={e => setFiltroInterno(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : checklists.length === 0 ? (
        <EmptyState mensaje="No hay checklists registrados con esos filtros." />
      ) : (
        <div className="cheq-tabla-wrap">
          <table className="cheq-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Interno N°</th>
                <th>Km / Hrs</th>
                <th>Operador</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {checklists.map(c => {
                const tipoLabel = TIPOS_EQUIPO.find(t => t.key === c.tipo_equipo)?.label ?? c.tipo_equipo;
                return (
                  <tr key={c.id}>
                    <td>{formatDate(c.fecha)}</td>
                    <td><span className="cheq-tipo-chip">{tipoLabel}</span></td>
                    <td>{c.interno_nro || '—'}</td>
                    <td>{c.km_hrs || '—'}</td>
                    <td>{c.operador?.full_name || '—'}</td>
                    <td>
                      <button className="cheq-ver-btn" onClick={() => onViewDetalle(c.id)}>
                        <Eye size={13} /> Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Vista: Detalle de un checklist ─────────────────────────────────────────────
function ChecklistDetalle({ checklistId, onBack }) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate('/sgi/checklists-equipo'));
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [detalle, setDetalle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPDF, setShowPDF] = useState(false);

  useEffect(() => {
    fetchCheqDetalle(checklistId).then(({ data }) => {
      setDetalle(data);
      setIsLoading(false);
    });
  }, [checklistId]);

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este checklist?')) return;
    await deleteCheqChecklist(checklistId);
    handleBack();
  };

  if (isLoading) return <div className="cheq-container"><LoadingSpinner /></div>;
  if (!detalle) return <div className="cheq-container"><EmptyState mensaje="No se encontró el checklist." /></div>;

  const tipoLabel = TIPOS_EQUIPO.find(t => t.key === detalle.tipo_equipo)?.label ?? detalle.tipo_equipo;
  const respOrdenadas = [...(detalle.respuestas ?? [])].sort((a, b) => (a.item?.orden ?? 0) - (b.item?.orden ?? 0));

  return (
    <div className="cheq-container">
      <div className="cheq-page-header">
        <button className="cheq-back-btn" onClick={handleBack}><ChevronLeft size={18} /> Volver</button>
        <div className="cheq-header-icon"><ClipboardList size={24} /></div>
        <div>
          <h2>{tipoLabel}</h2>
          <p>{formatDate(detalle.fecha)} · {detalle.lugar || 'Sin lugar'}</p>
        </div>
        <div className="cheq-header-actions">
          <button className="cheq-btn-pdf" onClick={() => setShowPDF(true)}>
            <FileText size={14} /> Exportar PDF
          </button>
          {isAdmin && (
            <button className="cheq-btn-danger" onClick={handleDelete}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="cheq-card">
        <div className="cheq-card-title"><FileText size={14} /> Datos del equipo</div>
        <div className="cheq-detalle-grid">
          {[
            ['Fecha', formatDate(detalle.fecha)],
            ['Lugar', detalle.lugar],
            ['Interno N°', detalle.interno_nro],
            ['Km / Hrs', detalle.km_hrs],
            ['Operador', detalle.operador?.full_name],
          ].map(([label, val]) => (
            <div key={label} className="cheq-detalle-field">
              <span className="cheq-detalle-label">{label}</span>
              <span className="cheq-detalle-val">{val || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cheq-card">
        <div className="cheq-card-title"><ClipboardList size={14} /> Verificaciones</div>
        <div className="cheq-items-list readonly">
          {respOrdenadas.map((r, idx) => {
            const cfg = ESTADO_CONFIG[r.estado];
            const Icon = cfg?.icon ?? Minus;
            return (
              <div key={r.id} className={`cheq-item-row estado-${r.estado}`}>
                <div className="cheq-item-num">{idx + 1}</div>
                <div className="cheq-item-body">
                  <div className="cheq-item-nombre">{r.item?.nombre ?? '—'}</div>
                  {r.observacion && <div className="cheq-obs-readonly">{r.observacion}</div>}
                </div>
                <span
                  className="cheq-estado-badge"
                  style={{ background: cfg?.bg, color: cfg?.color }}
                >
                  <Icon size={12} /> {cfg?.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {showPDF && (
        <ChecklistPDF detalle={detalle} tipoLabel={tipoLabel} onClose={() => setShowPDF(false)} />
      )}
    </div>
  );
}

// ── Gradientes por tipo ────────────────────────────────────────────────────────
const TIPO_GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#ef4444,#f59e0b)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#14b8a6,#6366f1)',
  'linear-gradient(135deg,#f97316,#ef4444)',
  'linear-gradient(135deg,#6366f1,#14b8a6)',
];

// ── Componente raíz ────────────────────────────────────────────────────────────
const ChecklistEquipos = () => {
  const navigate                                        = useNavigate();
  const { id: paramId }                                 = useParams();
  const [vista, setVista]                               = useState(paramId ? 'detalle' : 'landing');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
  const [tipoSeleccionado, setTipoSeleccionado]         = useState(null);
  const [detalleId, setDetalleId]                       = useState(paramId ?? null);
  const [showQR, setShowQR]                             = useState(false);

  // Lectura de ?v=CODIGO al ingresar desde un QR
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigoQR = params.get('v');
    if (!codigoQR) return;
    // Limpiar el param de la URL sin recargar
    const url = new URL(window.location.href);
    url.searchParams.delete('v');
    window.history.replaceState({}, '', url.toString());
    // Cargar el vehículo por código
    import('../../../services/vehiculosService').then(({ fetchVehiculos }) => {
      fetchVehiculos().then(({ data }) => {
        const v = (data ?? []).find(x => x['Codigo'] === codigoQR);
        if (!v) return;
        handleVehiculoSelect({
          interno_nro: v['Codigo'],
          nombre:      v['Nombre'],
          marca:       v['Marca'],
          patente:     v['Patente'],
          tipo_equipo: v['tipo_equipo'] ?? null,
        });
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVehiculoSelect = (v) => {
    setVehiculoSeleccionado(v);
    const tipo = TIPOS_EQUIPO.find(t => t.key === v.tipo_equipo);
    if (tipo) {
      // Familia asignada → checklist directo
      setTipoSeleccionado(tipo);
      setVista('form');
    } else {
      // Sin familia → el usuario elige el tipo
      setVista('tipo-selector');
    }
  };

  const handleTipoSelect = (t) => {
    setTipoSeleccionado(t);
    setVista('form');
  };

  const handleBack = () => {
    setVista('landing');
    setVehiculoSeleccionado(null);
    setTipoSeleccionado(null);
  };

  if (vista === 'form' && vehiculoSeleccionado && tipoSeleccionado) {
    return (
      <ChecklistForm
        tipo={tipoSeleccionado}
        vehiculoInicial={vehiculoSeleccionado}
        onBack={handleBack}
        onSaved={(id) => navigate(`/sgi/checklists-equipo/${id}`)}
      />
    );
  }

  if (vista === 'tipo-selector' && vehiculoSeleccionado) {
    return (
      <div className="cheq-container">
        <div className="cheq-page-header">
          <button className="cheq-back-btn" onClick={handleBack}><ChevronLeft size={18} /> Volver</button>
          <div className="cheq-header-icon"><ClipboardList size={24} /></div>
          <div>
            <h2>Tipo de checklist</h2>
            <p>
              <strong>{vehiculoSeleccionado.interno_nro}</strong> no tiene familia asignada —
              seleccioná el tipo de control a completar
            </p>
          </div>
        </div>
        <div className="cheq-tipo-grid">
          {TIPOS_EQUIPO.map((t, i) => (
            <button
              key={t.key}
              className="cheq-tipo-card-v2"
              onClick={() => handleTipoSelect(t)}
            >
              <div className="cheq-tipo-card-v2-icon"><ClipboardList size={26} /></div>
              <span className="cheq-tipo-card-v2-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (vista === 'historial') {
    return (
      <Historial
        onBack={() => setVista('landing')}
        onViewDetalle={(id) => navigate(`/sgi/checklists-equipo/${id}`)}
      />
    );
  }

  if (vista === 'detalle' && detalleId) {
    return (
      <ChecklistDetalle
        checklistId={detalleId}
        onBack={() => setVista('historial')}
      />
    );
  }

  // Landing
  return (
    <div className="cheq-container">
      <div className="cheq-page-header">
        <div className="cheq-header-icon"><ClipboardList size={26} /></div>
        <div>
          <h2>Checklists de Equipo</h2>
          <p>Registros de control pre-operacional de maquinaria y vehículos</p>
        </div>
        <div className="cheq-header-actions">
          <button className="cheq-btn-qr" onClick={() => setShowQR(true)}>
            <QrCode size={15} /> Generar QR
          </button>
          <button className="cheq-btn-secondary" onClick={() => setVista('historial')}>
            <Search size={14} /> Ver historial
          </button>
        </div>
        {showQR && <QRStickerModal onClose={() => setShowQR(false)} />}
      </div>
      <div className="cheq-landing-section">
        <p className="cheq-section-label"><Truck size={13} /> Seleccioná el equipo para iniciar el control</p>
        <VehiculoPicker value={null} onChange={handleVehiculoSelect} />
      </div>
    </div>
  );
};

export default ChecklistEquipos;
