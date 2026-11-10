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
import { useToast, SubmitButton, FieldError } from '../../../components/common';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import { hoyISO } from '../../../lib/fechas';
import { notificarNuevaPublicacion } from '../../../lib/notificaciones';
import { useConfirm } from '../../../contexts/ConfirmContext';

const EMPTY_FORM = { titulo: '', link_url: '', activo: true, fecha_hasta: '' };

const NovedadesTab = () => {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [novedades, setNovedades] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const vn = useRequiredFields([
    { id: 'nov-imagen', label: 'Imagen', valid: !!(file || form.imagen_url) },
  ]);

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
      const { data: nueva } = await insertNovedad({
        titulo: form.titulo || null,
        link_url: form.link_url || null,
        imagen_url,
        activo: form.activo,
        orden: maxOrden,
        fecha_hasta: form.fecha_hasta || null,
      });
      notificarNuevaPublicacion({ titulo: form.titulo || 'Nuevo anuncio', tipo: 'anuncio', id: nueva?.[0]?.id });
      setForm({ ...EMPTY_FORM });
      setFile(null);
      vn.reset();
      await loadNovedades();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (nov) => {
    if (!(await confirm({ message: '¿Eliminar esta novedad?', destructive: true }))) return;
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
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <h4 className="adm-card-title">Agregar novedad</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <input className="form-control" placeholder="Título (opcional)" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
          <input className="form-control" placeholder="Link (opcional)" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} />
          <div>
            <label className="adm-field-label">Visible hasta (opcional)</label>
            <input className="form-control" type="date" value={form.fecha_hasta} onChange={e => setForm(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
          <button id="nov-imagen" className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={15} /> {file ? file.name : 'Seleccionar imagen'}
          </button>
          {file && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB</span>}
          <FieldError show={vn.isInvalid('nov-imagen')}>Seleccioná una imagen</FieldError>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginLeft: 'auto', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
            Activo
          </label>
          <SubmitButton className="btn-primary" missing={vn.missing} onMissing={vn.revealAll} onClick={handleSave} saving={uploading} savingLabel="Subiendo...">
            + Agregar
          </SubmitButton>
        </div>
      </div>

      {/* Lista */}
      {novedades.length === 0 ? (
        <p className="adm-empty">No hay novedades todavía.</p>
      ) : (
        <ul className="adm-list">
          {novedades.map((nov, idx) => {
            const imgUrl = getNovedadPublicUrl(nov.imagen_url);
            const today = hoyISO();
            const vencida = nov.fecha_hasta && nov.fecha_hasta < today;
            const porVencer = nov.fecha_hasta && !vencida && nov.fecha_hasta <= hoyISO(new Date(Date.now() + 3 * 86400000));
            return (
              <li key={nov.id} className={`adm-row${vencida ? ' muted' : ''}`}>
                <span className="adm-row-thumb adm-row-thumb-wide">
                  {imgUrl && <img src={imgUrl} alt="" />}
                </span>
                <div className="adm-row-info">
                  <div className="adm-row-title">
                    {nov.titulo
                      ? <span className="adm-ellipsis">{nov.titulo}</span>
                      : <em className="adm-ellipsis adm-placeholder">Sin título</em>}
                    {nov.fecha_hasta && (
                      <span className={`adm-badge ${vencida ? 'danger' : porVencer ? 'warning' : 'neutral'}`}>
                        {vencida ? 'Vencida' : porVencer ? 'Vence' : 'Hasta'} {new Date(nov.fecha_hasta + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {nov.link_url && <div className="adm-row-meta"><span className="adm-ellipsis">{nov.link_url}</span></div>}
                </div>
                <div className="adm-row-side">
                  <button
                    type="button"
                    className={`adm-badge adm-badge-btn ${nov.activo ? 'success' : 'neutral'}`}
                    aria-pressed={nov.activo}
                    onClick={() => handleToggle(nov)}
                  >
                    {nov.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <div className="adm-actions">
                    <button type="button" className="adm-action" aria-label="Subir" onClick={() => handleMove(idx, -1)} disabled={idx === 0}><ChevronUp size={16} strokeWidth={1.5} /></button>
                    <button type="button" className="adm-action" aria-label="Bajar" onClick={() => handleMove(idx, 1)} disabled={idx === novedades.length - 1}><ChevronDown size={16} strokeWidth={1.5} /></button>
                    <button type="button" className="adm-action danger" aria-label="Eliminar novedad" onClick={() => handleDelete(nov)}><Trash2 size={16} strokeWidth={1.5} /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NovedadesTab;
