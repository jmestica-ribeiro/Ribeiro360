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
import { useToast, SubmitButton, FieldError } from '../../../components/common';
import { useRequiredFields } from '../../../hooks/useRequiredFields';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Select } from '../../../components/common';

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
  const confirm = useConfirm();
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
  const vs = useRequiredFields([
    { id: 'herr-sector-nombre', label: 'Nombre', valid: !!sectorForm.nombre.trim() },
  ]);
  const vl = useRequiredFields([
    { id: 'herr-link-nombre', label: 'Nombre', valid: !!linkForm.nombre.trim() },
    { id: 'herr-link-url', label: 'URL', valid: !!linkForm.url?.trim(), when: linkForm.tipo === 'link' },
    { id: 'herr-link-archivo', label: 'Archivo', valid: !!(archivoSeleccionado || linkForm.file_path), when: linkForm.tipo === 'archivo' },
  ]);
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
    vs.reset();
    setShowSectorForm(true);
  };

  const openEditSector = (s) => {
    setEditingSector(s.id);
    setSectorForm({ nombre: s.nombre, icono: s.icono, orden: s.orden, activo: s.activo });
    vs.reset();
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
    if (!(await confirm({ message: `¿Eliminar el sector "${s.nombre}" y todos sus links?`, destructive: true }))) return;
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
    vl.reset();
    setShowLinkForm(true);
  };

  const openEditLink = (l) => {
    setEditingLink(l.id);
    setArchivoSeleccionado(null);
    setLinkForm({ nombre: l.nombre, url: l.url || '', descripcion: l.descripcion || '', icono: l.icono, orden: l.orden, activo: l.activo, sector_id: l.sector_id, tipo: l.tipo || 'link', file_path: l.file_path || null });
    vl.reset();
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
    if (!(await confirm({ message: `¿Eliminar "${l.nombre}"?`, destructive: true }))) return;
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
      <div className="adm-pane-head">
        <h3>Herramientas por Sector <span className="admin-count">{sectores.length}</span></h3>
        <p>Links y accesos rápidos agrupados por área o sector, visibles para todos los empleados.</p>
      </div>

      <div className="herr-layout">

        {/* ── Panel izquierdo: sectores ─────────────────────────────────────── */}
        <aside className="herr-sectores" aria-label="Sectores">
          <div className="herr-sectores-head">
            <span className="adm-group-label">Sectores</span>
            <button type="button" className="adm-pill-btn sm" onClick={openNewSector}>
              <Plus size={14} strokeWidth={1.5} /> Nuevo
            </button>
          </div>

          {sectores.length === 0 ? (
            <p className="adm-empty">Sin sectores todavía.</p>
          ) : (
            <ul className="herr-sector-list">
              {sectores.map((s, idx) => (
                <li
                  key={s.id}
                  className={`herr-sector${activeSector === s.id ? ' active' : ''}`}
                  onClick={() => { setActiveSector(s.id); setShowLinkForm(false); }}
                >
                  <Wrench size={16} strokeWidth={1.5} className="herr-sector-icon" aria-hidden="true" />
                  <button
                    type="button"
                    className="herr-sector-name adm-ellipsis"
                    aria-current={activeSector === s.id ? 'true' : undefined}
                  >
                    {s.nombre}
                  </button>
                  <span className="herr-sector-count">{linksForSector(s.id).length}</span>

                  <div className="adm-actions hover-reveal herr-sector-actions" onClick={e => e.stopPropagation()}>
                    <button type="button" className="adm-action sm" aria-label={`Subir ${s.nombre}`} disabled={idx === 0} onClick={() => handleMoveSector(idx, -1)}>
                      <ChevronUp size={14} strokeWidth={1.5} />
                    </button>
                    <button type="button" className="adm-action sm" aria-label={`Bajar ${s.nombre}`} disabled={idx === sectores.length - 1} onClick={() => handleMoveSector(idx, 1)}>
                      <ChevronDown size={14} strokeWidth={1.5} />
                    </button>
                    <button type="button" className="adm-action sm" aria-label={`Editar ${s.nombre}`} onClick={() => openEditSector(s)}>
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                    <button type="button" className="adm-action sm danger" aria-label={`Eliminar ${s.nombre}`} onClick={() => handleDeleteSector(s)}>
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ── Panel derecho: links del sector activo ────────────────────────── */}
        <div className="herr-main">
          {/* Formulario sector */}
          {showSectorForm && (
            <div className="adm-card herr-form">
              <div className="herr-form-head">
                <h4>{editingSector ? 'Editar sector' : 'Nuevo sector'}</h4>
                <button type="button" className="adm-action" aria-label="Cerrar" onClick={() => setShowSectorForm(false)}><X size={16} strokeWidth={1.5} /></button>
              </div>
              <div className="herr-form-grid">
                <div className="form-group">
                  <label htmlFor="herr-sector-nombre">Nombre *</label>
                  <input id="herr-sector-nombre" {...vs.fieldProps('herr-sector-nombre')} className="form-control" value={sectorForm.nombre} onChange={e => setSectorForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Recursos Humanos" />
                  <FieldError show={vs.isInvalid('herr-sector-nombre')}>Ingresá un nombre</FieldError>
                </div>
                <div className="form-group">
                  <label>Ícono</label>
                  <Select value={sectorForm.icono} onChange={v => setSectorForm(f => ({ ...f, icono: v }))} options={ICON_OPTIONS} aria-label="Ícono" />
                </div>
              </div>
              <div className="herr-form-foot">
                <label className="herr-check">
                  <input type="checkbox" checked={sectorForm.activo} onChange={e => setSectorForm(f => ({ ...f, activo: e.target.checked }))} />
                  Activo
                </label>
                <SubmitButton className="btn-primary" missing={vs.missing} onMissing={vs.revealAll} onClick={handleSaveSector} saving={saving}>
                  <Check size={16} strokeWidth={1.5} /> Guardar
                </SubmitButton>
              </div>
            </div>
          )}

          {/* Formulario link / archivo */}
          {showLinkForm && (
            <div className="adm-card herr-form">
              <div className="herr-form-head">
                <h4>{editingLink ? 'Editar elemento' : 'Nuevo elemento'}</h4>
                <button type="button" className="adm-action" aria-label="Cerrar" onClick={() => { setShowLinkForm(false); setArchivoSeleccionado(null); }}><X size={16} strokeWidth={1.5} /></button>
              </div>

              {/* Selector de tipo */}
              <div className="org-segmented herr-tipo" role="radiogroup" aria-label="Tipo de elemento">
                {[{ key: 'link', label: 'Link externo', Icon: LinkIcon }, { key: 'archivo', label: 'Archivo', Icon: FileUp }].map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={linkForm.tipo === key}
                    className={linkForm.tipo === key ? 'active' : ''}
                    onClick={() => setLinkForm(f => ({ ...f, tipo: key }))}
                  >
                    <Icon size={14} strokeWidth={1.5} /> {label}
                  </button>
                ))}
              </div>

              <div className="herr-form-grid">
                <div className="form-group">
                  <label htmlFor="herr-link-nombre">Nombre *</label>
                  <input id="herr-link-nombre" {...vl.fieldProps('herr-link-nombre')} className="form-control" value={linkForm.nombre} onChange={e => setLinkForm(f => ({ ...f, nombre: e.target.value }))} placeholder={linkForm.tipo === 'archivo' ? 'Ej: Manual de Calidad' : 'Ej: Portal SAP'} />
                  <FieldError show={vl.isInvalid('herr-link-nombre')}>Ingresá un nombre</FieldError>
                </div>

                {linkForm.tipo === 'link' ? (
                  <div className="form-group">
                    <label htmlFor="herr-link-url">URL *</label>
                    <input id="herr-link-url" {...vl.fieldProps('herr-link-url')} className="form-control" type="url" inputMode="url" value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
                    <FieldError show={vl.isInvalid('herr-link-url')}>Ingresá la URL</FieldError>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Archivo *</label>
                    <button id="herr-link-archivo" type="button" className="herr-dropzone" onBlur={() => vl.touch('herr-link-archivo')} onClick={() => fileInputRef.current?.click()}>
                      <FileUp size={16} strokeWidth={1.5} aria-hidden="true" />
                      <span className={`adm-ellipsis${archivoSeleccionado ? ' has-file' : ''}`}>
                        {archivoSeleccionado ? archivoSeleccionado.name : (linkForm.file_path ? 'Archivo guardado (click para reemplazar)' : 'Click para seleccionar archivo')}
                      </span>
                    </button>
                    <input ref={fileInputRef} type="file" hidden onChange={e => setArchivoSeleccionado(e.target.files?.[0] ?? null)} />
                    <FieldError show={vl.isInvalid('herr-link-archivo')}>Seleccioná un archivo</FieldError>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="herr-link-desc">Descripción</label>
                  <input id="herr-link-desc" className="form-control" value={linkForm.descripcion} onChange={e => setLinkForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Breve descripción (opcional)" />
                </div>
                <div className="form-group">
                  <label>Ícono</label>
                  <Select value={linkForm.icono} onChange={v => setLinkForm(f => ({ ...f, icono: v }))} options={ICON_OPTIONS} aria-label="Ícono" />
                </div>
              </div>

              <div className="herr-form-foot">
                <label className="herr-check">
                  <input type="checkbox" checked={linkForm.activo} onChange={e => setLinkForm(f => ({ ...f, activo: e.target.checked }))} />
                  Activo
                </label>
                <SubmitButton className="btn-primary" missing={vl.missing} onMissing={vl.revealAll} onClick={handleSaveLink} saving={saving}>
                  <Check size={16} strokeWidth={1.5} /> Guardar
                </SubmitButton>
              </div>
            </div>
          )}

          {/* Lista de links */}
          {currentSector ? (
            <>
              <div className="herr-main-head">
                <h4>
                  {currentSector.nombre}
                  <span className="admin-count">{linksForSector(activeSector).length}</span>
                </h4>
                <button type="button" className="btn-add-admin" onClick={openNewLink}>
                  <Plus size={16} strokeWidth={1.5} /> Agregar link
                </button>
              </div>

              {linksForSector(activeSector).length === 0 ? (
                <p className="adm-empty">Sin links en este sector todavía.</p>
              ) : (
                <ul className="adm-list">
                  {linksForSector(activeSector).map((l, idx, arr) => (
                    <li key={l.id} className={`adm-row${l.activo ? '' : ' muted'}`}>
                      <span className="adm-row-icon">
                        {l.tipo === 'archivo'
                          ? <FileText size={18} strokeWidth={1.5} />
                          : <ExternalLink size={18} strokeWidth={1.5} />}
                      </span>
                      <div className="adm-row-info">
                        <div className="adm-row-title">
                          <span className="adm-ellipsis">{l.nombre}</span>
                          <span className={`adm-badge${l.tipo === 'archivo' ? '' : (l.activo ? ' success' : ' neutral')}`}>
                            {l.tipo === 'archivo' ? 'Archivo' : (l.activo ? 'Activo' : 'Inactivo')}
                          </span>
                        </div>
                        <div className="adm-row-meta">
                          <span className="adm-ellipsis herr-url">{l.tipo === 'archivo' ? 'Archivo adjunto' : l.url}</span>
                          {l.descripcion && <span className="adm-sub adm-ellipsis">{l.descripcion}</span>}
                        </div>
                      </div>
                      <div className="adm-actions hover-reveal">
                        <button type="button" className="adm-action" aria-label={`Subir ${l.nombre}`} onClick={() => handleMoveLink(idx, -1, activeSector)} disabled={idx === 0}><ChevronUp size={16} strokeWidth={1.5} /></button>
                        <button type="button" className="adm-action" aria-label={`Bajar ${l.nombre}`} onClick={() => handleMoveLink(idx, 1, activeSector)} disabled={idx === arr.length - 1}><ChevronDown size={16} strokeWidth={1.5} /></button>
                        <button type="button" className="adm-action" aria-label={`Editar ${l.nombre}`} onClick={() => openEditLink(l)}><Pencil size={16} strokeWidth={1.5} /></button>
                        <button type="button" className="adm-action danger" aria-label={`Eliminar ${l.nombre}`} onClick={() => handleDeleteLink(l)}><Trash2 size={16} strokeWidth={1.5} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="adm-empty">Seleccioná un sector para ver sus links.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HerramientasTab;
