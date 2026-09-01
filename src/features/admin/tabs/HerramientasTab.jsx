import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2, ChevronUp, ChevronDown, Plus, Pencil, X, Check,
  ExternalLink, Wrench, FileUp, Link as LinkIcon, FileText,
} from 'lucide-react';
import {
  fetchSectores, saveSector, deleteSector,
  fetchAllLinks, saveLink, deleteLink,
  swapSectorOrden, swapLinkOrden,
  uploadHerramientaArchivo, deleteHerramientaArchivo,
} from '../../../services/herramientasService';
import { useToast } from '../../../components/common';

// Subconjunto de íconos Lucide disponibles para elegir
const ICON_OPTIONS = [
  'Wrench', 'Link', 'Globe', 'FileText', 'FolderOpen', 'Settings',
  'Monitor', 'Database', 'BarChart2', 'ShieldCheck', 'Users', 'Mail',
  'Phone', 'Calendar', 'Printer', 'Cpu', 'Cloud', 'Lock', 'Key',
  'HelpCircle', 'BookOpen', 'Briefcase', 'Truck', 'Package', 'Tool',
  'Server', 'Code', 'Layers', 'Map', 'Clipboard', 'ClipboardList',
];

const EMPTY_SECTOR = { nombre: '', icono: 'Wrench', orden: 0, activo: true };
const EMPTY_LINK   = { nombre: '', url: '', descripcion: '', icono: 'Link', orden: 0, activo: true, sector_id: null, tipo: 'link', file_path: null };

const HerramientasTab = () => {
  const { showToast } = useToast();
  const [loaded, setLoaded]       = useState(false);
  const [sectores, setSectores]   = useState([]);
  const [links, setLinks]         = useState([]);
  const [activeSector, setActiveSector] = useState(null);

  // formulario sector
  const [sectorForm, setSectorForm]       = useState({ ...EMPTY_SECTOR });
  const [editingSector, setEditingSector] = useState(null);
  const [showSectorForm, setShowSectorForm] = useState(false);

  // formulario link
  const [linkForm, setLinkForm]       = useState({ ...EMPTY_LINK });
  const [editingLink, setEditingLink] = useState(null);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!loaded) { load(); setLoaded(true); }
  }, [loaded]);

  const load = async () => {
    const [{ data: s }, { data: l }] = await Promise.all([fetchSectores(), fetchAllLinks()]);
    setSectores(s);
    setLinks(l);
    if (!activeSector && s.length > 0) setActiveSector(s[0].id);
  };

  const linksForSector = (sectorId) => links.filter(l => l.sector_id === sectorId);

  // ── Sectores ────────────────────────────────────────────────────────────────

  const openNewSector = () => {
    setEditingSector(null);
    setSectorForm({ ...EMPTY_SECTOR, orden: sectores.length + 1 });
    setShowSectorForm(true);
  };

  const openEditSector = (s) => {
    setEditingSector(s.id);
    setSectorForm({ nombre: s.nombre, icono: s.icono, orden: s.orden, activo: s.activo });
    setShowSectorForm(true);
  };

  const handleSaveSector = async () => {
    if (!sectorForm.nombre.trim()) return showToast('El nombre es obligatorio', 'error');
    setSaving(true);
    const payload = editingSector
      ? { id: editingSector, ...sectorForm }
      : { ...sectorForm };
    const { error } = await saveSector(payload);
    setSaving(false);
    if (error) return showToast('Error al guardar sector', 'error');
    showToast('Sector guardado', 'success');
    setShowSectorForm(false);
    await load();
  };

  const handleDeleteSector = async (s) => {
    if (!window.confirm(`¿Eliminar el sector "${s.nombre}" y todos sus links?`)) return;
    await deleteSector(s.id);
    if (activeSector === s.id) setActiveSector(null);
    await load();
  };

  const handleMoveSector = async (idx, dir) => {
    const arr = [...sectores];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    await swapSectorOrden(
      { id: arr[idx].id, orden: arr[idx].orden },
      { id: arr[swap].id, orden: arr[swap].orden },
    );
    await load();
  };

  // ── Links ───────────────────────────────────────────────────────────────────

  const openNewLink = () => {
    if (!activeSector) return showToast('Seleccioná un sector primero', 'warning');
    setEditingLink(null);
    setArchivoSeleccionado(null);
    setLinkForm({ ...EMPTY_LINK, sector_id: activeSector, orden: linksForSector(activeSector).length + 1 });
    setShowLinkForm(true);
  };

  const openEditLink = (l) => {
    setEditingLink(l.id);
    setArchivoSeleccionado(null);
    setLinkForm({ nombre: l.nombre, url: l.url || '', descripcion: l.descripcion || '', icono: l.icono, orden: l.orden, activo: l.activo, sector_id: l.sector_id, tipo: l.tipo || 'link', file_path: l.file_path || null });
    setShowLinkForm(true);
  };

  const handleSaveLink = async () => {
    if (!linkForm.nombre.trim()) return showToast('El nombre es obligatorio', 'error');
    if (linkForm.tipo === 'link' && !linkForm.url.trim()) return showToast('La URL es obligatoria', 'error');
    if (linkForm.tipo === 'archivo' && !archivoSeleccionado && !linkForm.file_path) return showToast('Seleccioná un archivo', 'error');

    setSaving(true);
    let file_path = linkForm.file_path;

    if (linkForm.tipo === 'archivo' && archivoSeleccionado) {
      // Si estamos reemplazando un archivo existente, borrar el anterior
      if (editingLink && linkForm.file_path) {
        await deleteHerramientaArchivo(linkForm.file_path);
      }
      const { path, error: upErr } = await uploadHerramientaArchivo(archivoSeleccionado);
      if (upErr) { setSaving(false); return showToast('Error al subir el archivo', 'error'); }
      file_path = path;
    }

    const payload = {
      ...(editingLink ? { id: editingLink } : {}),
      nombre:      linkForm.nombre,
      descripcion: linkForm.descripcion,
      icono:       linkForm.icono,
      orden:       linkForm.orden,
      activo:      linkForm.activo,
      sector_id:   linkForm.sector_id,
      tipo:        linkForm.tipo,
      url:         linkForm.tipo === 'link' ? linkForm.url : null,
      file_path:   linkForm.tipo === 'archivo' ? file_path : null,
    };

    const { error } = await saveLink(payload);
    setSaving(false);
    if (error) return showToast('Error al guardar', 'error');
    showToast(linkForm.tipo === 'archivo' ? 'Archivo guardado' : 'Link guardado', 'success');
    setShowLinkForm(false);
    setArchivoSeleccionado(null);
    await load();
  };

  const handleDeleteLink = async (l) => {
    if (!window.confirm(`¿Eliminar "${l.nombre}"?`)) return;
    if (l.tipo === 'archivo' && l.file_path) await deleteHerramientaArchivo(l.file_path);
    await deleteLink(l.id);
    await load();
  };

  const handleMoveLink = async (idx, dir, sectorId) => {
    const arr = linksForSector(sectorId);
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    await swapLinkOrden(
      { id: arr[idx].id, orden: arr[idx].orden },
      { id: arr[swap].id, orden: arr[swap].orden },
    );
    await load();
  };

  const currentSector = sectores.find(s => s.id === activeSector);

  return (
    <div className="admin-list-panel">
      <div className="admin-list-header">
        <h3>Herramientas por Sector <span className="admin-count">{sectores.length}</span></h3>
        <p className="text-muted text-xs" style={{ marginTop: 4 }}>
          Links y accesos rápidos agrupados por área o sector, visibles para todos los empleados.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Panel izquierdo: sectores ─────────────────────────────────────── */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Sectores</span>
            <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={openNewSector}>
              <Plus size={13} /> Nuevo
            </button>
          </div>

          {sectores.length === 0 ? (
            <p className="text-muted text-sm" style={{ padding: 16 }}>Sin sectores todavía.</p>
          ) : (
            <div>
              {sectores.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => { setActiveSector(s.id); setShowLinkForm(false); }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: activeSector === s.id ? 'var(--primary-color)' : 'transparent',
                    color: activeSector === s.id ? '#fff' : 'var(--text-main)',
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.15s',
                  }}
                >
                  <Wrench size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre}</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>{linksForSector(s.id).length}</span>

                  {/* controles inline (sólo en hover via stop-propagation) */}
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      title="Subir"
                      className="action-btn"
                      style={{ padding: '2px 4px', color: activeSector === s.id ? '#fff' : undefined, opacity: idx === 0 ? 0.3 : 1 }}
                      disabled={idx === 0}
                      onClick={() => handleMoveSector(idx, -1)}
                    ><ChevronUp size={12} /></button>
                    <button
                      title="Bajar"
                      className="action-btn"
                      style={{ padding: '2px 4px', color: activeSector === s.id ? '#fff' : undefined, opacity: idx === sectores.length - 1 ? 0.3 : 1 }}
                      disabled={idx === sectores.length - 1}
                      onClick={() => handleMoveSector(idx, 1)}
                    ><ChevronDown size={12} /></button>
                    <button
                      title="Editar"
                      className="action-btn"
                      style={{ padding: '2px 4px', color: activeSector === s.id ? '#fff' : undefined }}
                      onClick={() => openEditSector(s)}
                    ><Pencil size={12} /></button>
                    <button
                      title="Eliminar"
                      className="action-btn delete"
                      style={{ padding: '2px 4px' }}
                      onClick={() => handleDeleteSector(s)}
                    ><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Panel derecho: links del sector activo ────────────────────────── */}
        <div style={{ minWidth: 0 }}>
          {/* Formulario sector */}
          {showSectorForm && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ fontWeight: 700, fontSize: 14 }}>{editingSector ? 'Editar sector' : 'Nuevo sector'}</h4>
                <button className="action-btn" onClick={() => setShowSectorForm(false)}><X size={16} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nombre *</label>
                  <input className="form-control" value={sectorForm.nombre} onChange={e => setSectorForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Recursos Humanos" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ícono</label>
                  <select className="form-control" value={sectorForm.icono} onChange={e => setSectorForm(f => ({ ...f, icono: e.target.value }))}>
                    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={sectorForm.activo} onChange={e => setSectorForm(f => ({ ...f, activo: e.target.checked }))} />
                  Activo
                </label>
                <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSaveSector} disabled={saving}>
                  <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* Formulario link / archivo */}
          {showLinkForm && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ fontWeight: 700, fontSize: 14 }}>{editingLink ? 'Editar elemento' : 'Nuevo elemento'}</h4>
                <button className="action-btn" onClick={() => { setShowLinkForm(false); setArchivoSeleccionado(null); }}><X size={16} /></button>
              </div>

              {/* Selector de tipo */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ key: 'link', label: 'Link externo', Icon: LinkIcon }, { key: 'archivo', label: 'Archivo', Icon: FileUp }].map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLinkForm(f => ({ ...f, tipo: key }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: `2px solid ${linkForm.tipo === key ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      background: linkForm.tipo === key ? 'var(--primary-color)' : 'transparent',
                      color: linkForm.tipo === key ? '#000' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nombre *</label>
                  <input className="form-control" value={linkForm.nombre} onChange={e => setLinkForm(f => ({ ...f, nombre: e.target.value }))} placeholder={linkForm.tipo === 'archivo' ? 'Ej: Manual de Calidad' : 'Ej: Portal SAP'} />
                </div>

                {linkForm.tipo === 'link' ? (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>URL *</label>
                    <input className="form-control" value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Archivo *</label>
                    <div
                      style={{ border: '2px dashed var(--border-color)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: archivoSeleccionado ? 'var(--text-main)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {archivoSeleccionado ? archivoSeleccionado.name : (linkForm.file_path ? '📎 Archivo guardado (click para reemplazar)' : 'Click para seleccionar archivo')}
                      </span>
                    </div>
                    <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => setArchivoSeleccionado(e.target.files?.[0] ?? null)} />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Descripción</label>
                  <input className="form-control" value={linkForm.descripcion} onChange={e => setLinkForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Breve descripción (opcional)" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ícono</label>
                  <select className="form-control" value={linkForm.icono} onChange={e => setLinkForm(f => ({ ...f, icono: e.target.value }))}>
                    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={linkForm.activo} onChange={e => setLinkForm(f => ({ ...f, activo: e.target.checked }))} />
                  Activo
                </label>
                <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSaveLink} disabled={saving}>
                  <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de links */}
          {currentSector ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, fontSize: 15 }}>
                  {currentSector.nombre}
                  <span className="admin-count" style={{ marginLeft: 8 }}>{linksForSector(activeSector).length}</span>
                </h4>
                <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={openNewLink}>
                  <Plus size={14} /> Agregar link
                </button>
              </div>

              {linksForSector(activeSector).length === 0 ? (
                <p className="text-muted text-sm">Sin links en este sector todavía.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {linksForSector(activeSector).map((l, idx, arr) => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px', minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {l.tipo === 'archivo'
                          ? <FileText size={16} style={{ color: 'var(--primary-color)' }} />
                          : <ExternalLink size={16} style={{ color: 'var(--primary-color)' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.tipo === 'archivo' ? '📎 Archivo adjunto' : l.url}
                        </div>
                        {l.descripcion && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descripcion}</div>}
                      </div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: l.tipo === 'archivo' ? '#eff6ff' : (l.activo ? '#d1fae5' : '#f3f4f6'), color: l.tipo === 'archivo' ? '#3b82f6' : (l.activo ? '#059669' : '#6b7280'), fontWeight: 600, flexShrink: 0 }}>
                        {l.tipo === 'archivo' ? 'Archivo' : (l.activo ? 'Activo' : 'Inactivo')}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                        <button className="action-btn" onClick={() => handleMoveLink(idx, -1, activeSector)} disabled={idx === 0} style={{ padding: '2px 6px' }}><ChevronUp size={14} /></button>
                        <button className="action-btn" onClick={() => handleMoveLink(idx, 1, activeSector)} disabled={idx === arr.length - 1} style={{ padding: '2px 6px' }}><ChevronDown size={14} /></button>
                      </div>
                      <button className="action-btn" onClick={() => openEditLink(l)}><Pencil size={15} /></button>
                      <button className="action-btn delete" onClick={() => handleDeleteLink(l)}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted text-sm">Seleccioná un sector para ver sus links.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HerramientasTab;
