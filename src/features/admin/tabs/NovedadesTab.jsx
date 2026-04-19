import React, { useState, useRef } from 'react';
import { Trash2, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import {
  fetchNovedades,
  uploadNovedadImagen,
  insertNovedad,
  updateNovedad,
  deleteNovedad,
  swapNovedadOrden,
  getNovedadPublicUrl,
} from '../../../services/novedadesService';
import { useToast } from '../../../components/common';

const EMPTY_FORM = { titulo: '', link_url: '', activo: true, fecha_hasta: '' };

const NovedadesTab = () => {
  const { showToast } = useToast();
  const [novedades, setNovedades] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Fetch lazy: se llama cuando el tab se monta (al activarlo por primera vez)
  React.useEffect(() => {
    if (!loaded) {
      loadNovedades();
      setLoaded(true);
    }
  }, [loaded]);

  const loadNovedades = async () => {
    const { data } = await fetchNovedades();
    setNovedades(data);
  };

  const handleSave = async () => {
    if (!file && !form.imagen_url) return;
    setUploading(true);
    try {
      let imagen_url = form.imagen_url || null;
      if (file) {
        const { path, error: upErr } = await uploadNovedadImagen(file);
        if (upErr) throw upErr;
        imagen_url = path;
      }
      const maxOrden = novedades.length > 0 ? Math.max(...novedades.map(n => n.orden || 0)) + 1 : 1;
      await insertNovedad({
        titulo: form.titulo || null,
        link_url: form.link_url || null,
        imagen_url,
        activo: form.activo,
        orden: maxOrden,
        fecha_hasta: form.fecha_hasta || null,
      });
      setForm({ ...EMPTY_FORM });
      setFile(null);
      await loadNovedades();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (nov) => {
    if (!window.confirm('¿Eliminar esta novedad?')) return;
    await deleteNovedad(nov.id, nov.imagen_url);
    await loadNovedades();
  };

  const handleToggle = async (nov) => {
    await updateNovedad(nov.id, { activo: !nov.activo });
    await loadNovedades();
  };

  const handleMove = async (idx, dir) => {
    const arr = [...novedades];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    await swapNovedadOrden(
      { id: arr[idx].id, orden: arr[idx].orden },
      { id: arr[swapIdx].id, orden: arr[swapIdx].orden }
    );
    await loadNovedades();
  };

  return (
    <div className="admin-list-panel">
      <div className="admin-list-header">
        <h3>Novedades <span className="admin-count">{novedades.length}</span></h3>
        <p className="text-muted text-xs" style={{ marginTop: 4 }}>Banners que se muestran en el Dashboard entre Accesos Rápidos y Próximos Eventos.</p>
      </div>

      {/* Formulario agregar */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Agregar novedad</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <input className="form-control" placeholder="Título (opcional)" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
          <input className="form-control" placeholder="Link (opcional)" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} />
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Visible hasta (opcional)</label>
            <input className="form-control" type="date" value={form.fecha_hasta} onChange={e => setForm(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={15} /> {file ? file.name : 'Seleccionar imagen'}
          </button>
          {file && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB</span>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginLeft: 'auto', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
            Activo
          </label>
          <button className="btn-primary" onClick={handleSave} disabled={uploading || !file}>
            {uploading ? 'Subiendo...' : '+ Agregar'}
          </button>
        </div>
      </div>

      {/* Lista */}
      {novedades.length === 0 ? (
        <p className="text-muted text-sm">No hay novedades todavía.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {novedades.map((nov, idx) => {
            const imgUrl = getNovedadPublicUrl(nov.imagen_url);
            const today = new Date().toISOString().split('T')[0];
            const vencida = nov.fecha_hasta && nov.fecha_hasta < today;
            const porVencer = nov.fecha_hasta && !vencida && nov.fecha_hasta <= new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
            return (
              <div key={nov.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-secondary)', border: `1px solid ${vencida ? '#fca5a5' : 'var(--border-color)'}`, borderRadius: 10, padding: '12px 16px', opacity: vencida ? 0.6 : 1 }}>
                <div style={{ width: 100, height: 36, borderRadius: 6, overflow: 'hidden', background: '#eee', flexShrink: 0 }}>
                  {imgUrl && <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{nov.titulo || <em style={{ color: 'var(--text-muted)' }}>Sin título</em>}</span>
                  {nov.link_url && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nov.link_url}</div>}
                  {nov.fecha_hasta && (
                    <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600, color: vencida ? '#ef4444' : porVencer ? '#f59e0b' : '#6b7280' }}>
                      {vencida ? '⛔ Vencida' : porVencer ? '⚠️ Vence' : 'Hasta'} {new Date(nov.fecha_hasta + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(nov)}
                  style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', background: nov.activo ? '#d1fae5' : '#f3f4f6', color: nov.activo ? '#059669' : '#6b7280', borderColor: nov.activo ? '#6ee7b7' : '#e5e7eb', fontWeight: 600 }}
                >
                  {nov.activo ? 'Activo' : 'Inactivo'}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button className="action-btn" onClick={() => handleMove(idx, -1)} disabled={idx === 0} style={{ padding: '2px 6px' }}><ChevronUp size={14} /></button>
                  <button className="action-btn" onClick={() => handleMove(idx, 1)} disabled={idx === novedades.length - 1} style={{ padding: '2px 6px' }}><ChevronDown size={14} /></button>
                </div>
                <button className="action-btn delete" onClick={() => handleDelete(nov)}><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NovedadesTab;
