import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mail, MapPin, User, MessageCircle, Send, X, Filter, ChevronLeft, ChevronRight, ChevronDown, Building2, LayoutGrid, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import './Directorio.css';

const Avatar = ({ profile, size = 64 }) => {
  const initials = (profile.full_name || profile.email || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.full_name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #F2DC00, #D4C100)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#141414', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

const Highlight = ({ text, term }) => {
  if (!term) return <>{text}</>;
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
      )}
    </>
  );
};

const SkeletonCard = () => (
  <div className="employee-card skeleton-card">
    <div className="emp-card-header skeleton-header" />
    <div className="emp-card-body">
      <div className="emp-avatar-wrap">
        <div className="skeleton-avatar" />
      </div>
      <div className="skeleton-line skeleton-name" />
      <div className="skeleton-line skeleton-role" />
      <div className="skeleton-badge" />
    </div>
    <div className="emp-details">
      <div className="skeleton-line skeleton-detail" />
      <div className="skeleton-line skeleton-detail" />
    </div>
    <div className="skeleton-btn" />
  </div>
);

const Directorio = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDept, setActiveDept] = useState('Todos');
  const [activeLocation, setActiveLocation] = useState('Cualquiera');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState('grid');
  const gridRef = useRef(null);

  const recalcItemsPerPage = useCallback(() => {
    if (!gridRef.current) return;
    if (viewMode === 'list') {
      const available = window.innerHeight - gridRef.current.getBoundingClientRect().top - 80;
      setItemsPerPage(Math.max(5, Math.floor(available / 64)));
    } else {
      const gridWidth = gridRef.current.offsetWidth;
      const cols = Math.max(1, Math.floor((gridWidth + 16) / (230 + 16)));
      setItemsPerPage(cols * 2);
    }
  }, [viewMode]);

  useEffect(() => {
    const ro = new ResizeObserver(recalcItemsPerPage);
    if (gridRef.current) ro.observe(gridRef.current);
    recalcItemsPerPage();
    return () => ro.disconnect();
  }, [recalcItemsPerPage, profiles, viewMode]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeDept, activeLocation, itemsPerPage]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, job_title, department, office_location, avatar_url, phone, whatsapp_consent')
      .order('full_name', { ascending: true });
    if (data) setProfiles(data);
    setIsLoading(false);
  };

  const departments = ['Todos', ...new Set(profiles.map(p => p.department).filter(Boolean))].sort();
  const locations = ['Cualquiera', ...new Set(profiles.map(p => p.office_location).filter(Boolean))].sort();

  const filtered = profiles.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (p.full_name || '').toLowerCase().includes(term) ||
      (p.job_title || '').toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term);
    const matchDept = activeDept === 'Todos' || p.department === activeDept;
    const matchLoc = activeLocation === 'Cualquiera' || p.office_location === activeLocation;
    return matchSearch && matchDept && matchLoc;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openTeams = (email) => {
    window.open(`https://teams.microsoft.com/l/chat/0/0?users=${email}`, '_blank');
  };

  const openMail = (email) => {
    window.open(`mailto:${email}`, '_blank');
  };

  const openWhatsApp = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  return (
    <div className="directorio-container">
      <div className="directory-header">
        <div>
          <h2>Directorio de Personas</h2>
          <p>Encontrá y contactá a tus compañeros de Ribeiro SRL</p>
        </div>
        {!isLoading && (
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '4px 14px', fontWeight: 600 }}>
            {profiles.length} personas
          </span>
        )}
      </div>

      <div className="directory-toolbar-advanced">
        <div className="search-row">
          <div className="search-box-large">
            <Search size={22} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, puesto o email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {(departments.length > 1 || locations.length > 1) && (
          <div className="filters-inline-row">
            {departments.length > 1 && (
              <div className={`filter-select-wrap${activeDept !== 'Todos' ? ' is-active' : ''}`}>
                <Filter size={13} />
                <select
                  className="filter-select"
                  value={activeDept}
                  onChange={e => setActiveDept(e.target.value)}
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>
            )}
            {locations.length > 1 && (
              <div className={`filter-select-wrap${activeLocation !== 'Cualquiera' ? ' is-active' : ''}`}>
                <MapPin size={13} />
                <select
                  className="filter-select"
                  value={activeLocation}
                  onChange={e => setActiveLocation(e.target.value)}
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>
            )}
            {(activeDept !== 'Todos' || activeLocation !== 'Cualquiera' || searchTerm !== '') && (
              <button className="btn-clear-filters-inline" onClick={() => { setActiveDept('Todos'); setActiveLocation('Cualquiera'); setSearchTerm(''); }}>
                <X size={13} />
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <div className="results-count">
          <span>Mostrando {currentItems.length} de {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          <div className="view-toggle">
            <button className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Vista grilla">
              <LayoutGrid size={16} />
            </button>
            <button className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="Vista lista">
              <List size={16} />
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={viewMode === 'grid' ? 'directory-grid' : 'directory-list'} ref={gridRef}>
          {Array.from({ length: itemsPerPage }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-results">
          <User size={64} className="text-muted" />
          <h3>{profiles.length === 0 ? 'Aún no hay perfiles registrados' : 'No encontramos resultados'}</h3>
          <p>{profiles.length === 0 ? 'Los perfiles aparecerán aquí una vez que los usuarios inicien sesión.' : 'Probá ajustando los filtros.'}</p>
          {profiles.length > 0 && (
            <button className="btn-clear-filters mt-4" onClick={() => { setActiveDept('Todos'); setActiveLocation('Cualquiera'); setSearchTerm(''); }}>
              Ver todos
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'directory-grid' : 'directory-list'} ref={gridRef}>
          <AnimatePresence mode="popLayout">
            {currentItems.map((profile, i) => viewMode === 'grid' ? (
              <motion.div
                key={profile.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 35, delay: i * 0.03 }}
                className="employee-card"
              >
                <div className="emp-card-header" />
                <div className="emp-card-body">
                  <div className="emp-avatar-wrap">
                    <Avatar profile={profile} size={56} />
                  </div>
                  <h3 className="emp-name"><Highlight text={profile.full_name || 'Desconocido'} term={searchTerm} /></h3>
                  <p className="emp-role"><Highlight text={profile.job_title || 'Desconocido'} term={searchTerm} /></p>
                  <span className="emp-dept-badge">{profile.department || 'Desconocido'}</span>
                </div>
                <div className="emp-details">
                  <div className="detail-item">
                    <Mail size={12} />
                    <span><Highlight text={profile.email || 'Desconocido'} term={searchTerm} /></span>
                  </div>
                  <div className="detail-item">
                    <MapPin size={12} />
                    <span>{profile.office_location || 'Desconocido'}</span>
                  </div>
                </div>
                <button className="btn-contact-ghost" onClick={() => setSelectedProfile(profile)}>
                  <MessageCircle size={14} />
                  Contactar
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={profile.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 35, delay: i * 0.015 }}
                className="employee-list-row"
              >
                <Avatar profile={profile} size={40} />
                <div className="list-row-name">
                  <span className="list-name"><Highlight text={profile.full_name || 'Desconocido'} term={searchTerm} /></span>
                  <span className="list-role"><Highlight text={profile.job_title || 'Desconocido'} term={searchTerm} /></span>
                </div>
                <span className="list-badge">{profile.department || 'Desconocido'}</span>
                <div className="list-row-detail">
                  <Mail size={12} />
                  <span><Highlight text={profile.email || 'Desconocido'} term={searchTerm} /></span>
                </div>
                <div className="list-row-detail">
                  <MapPin size={12} />
                  <span>{profile.office_location || 'Desconocido'}</span>
                </div>
                <button className="btn-contact-ghost list-btn" onClick={() => setSelectedProfile(profile)}>
                  <MessageCircle size={13} />
                  Contactar
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="pagination-btn">
            <ChevronLeft size={18} /> Anterior
          </button>
          <div className="page-numbers">
            {(() => {
              const pages = [];
              const delta = 2;
              const left = Math.max(2, currentPage - delta);
              const right = Math.min(totalPages - 1, currentPage + delta);

              pages.push(
                <button key={1} className={`page-num ${currentPage === 1 ? 'active' : ''}`} onClick={() => setCurrentPage(1)}>1</button>
              );
              if (left > 2) pages.push(<span key="left-ellipsis" className="page-ellipsis">…</span>);
              for (let i = left; i <= right; i++) {
                pages.push(
                  <button key={i} className={`page-num ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>{i}</button>
                );
              }
              if (right < totalPages - 1) pages.push(<span key="right-ellipsis" className="page-ellipsis">…</span>);
              if (totalPages > 1) pages.push(
                <button key={totalPages} className={`page-num ${currentPage === totalPages ? 'active' : ''}`} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
              );
              return pages;
            })()}
          </div>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="pagination-btn">
            Siguiente <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Contact modal */}
      <AnimatePresence mode="wait">
        {selectedProfile && (
          <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
            <motion.div
              className="contact-modal"
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelectedProfile(null)}><X size={20} /></button>

              <div className="modal-header">
                <Avatar profile={selectedProfile} size={80} />
                <h3>{selectedProfile.full_name}</h3>
                {selectedProfile.job_title && <p>{selectedProfile.job_title}</p>}
                {selectedProfile.department && (
                  <span className="modal-dept-badge">{selectedProfile.department}</span>
                )}
              </div>

              <div className="contact-options">
                <p className="contact-label">Contactar por:</p>

                <button className="contact-option-btn" onClick={() => openTeams(selectedProfile.email)}>
                  <div className="option-icon teams-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                      <path d="M20.625 6.75h-4.5a.375.375 0 0 0-.375.375v5.25a3.75 3.75 0 0 0 7.5 0V7.125a.375.375 0 0 0-.375-.375h-2.25Z" fill="#5059C9"/>
                      <circle cx="18.375" cy="4.875" r="1.875" fill="#5059C9"/>
                      <circle cx="10.5" cy="4.5" r="2.25" fill="#7B83EB"/>
                      <path d="M15 8.25H6a.75.75 0 0 0-.75.75v6a4.5 4.5 0 0 0 9 0V9a.75.75 0 0 0-.75-.75Z" fill="#7B83EB"/>
                      <path opacity=".1" d="M11.25 8.25v7.912A4.503 4.503 0 0 1 6.098 15H6a.75.75 0 0 1-.75-.75V9a.75.75 0 0 1 .75-.75h5.25Z" fill="#000"/>
                      <path opacity=".2" d="M10.5 8.25v8.662a4.503 4.503 0 0 1-4.402-3.35A4.48 4.48 0 0 1 6 15V9a.75.75 0 0 1 .75-.75h3.75Z" fill="#000"/>
                      <path d="M10.5 14.25H3a.75.75 0 0 1-.75-.75V7.5A.75.75 0 0 1 3 6.75h7.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-.75.75Z" fill="#4B53BC"/>
                      <path d="M8.1 9.525H6.9v3.45h-.825V9.525H4.875V8.7H8.1v.825Z" fill="#fff"/>
                    </svg>
                  </div>
                  <div className="option-text">
                    <strong>Microsoft Teams</strong>
                    <span>Abrir chat corporativo</span>
                  </div>
                  <Send size={16} className="option-arrow" />
                </button>

                <button className="contact-option-btn" onClick={() => openMail(selectedProfile.email)}>
                  <div className="option-icon mail-icon">
                    <Mail size={20} />
                  </div>
                  <div className="option-text">
                    <strong>Email</strong>
                    <span>{selectedProfile.email}</span>
                  </div>
                  <Send size={16} className="option-arrow" />
                </button>

                {selectedProfile.phone && selectedProfile.whatsapp_consent && (
                  <button className="contact-option-btn" onClick={() => openWhatsApp(selectedProfile.phone)}>
                    <div className="option-icon whatsapp-icon">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div className="option-text">
                      <strong>WhatsApp</strong>
                      <span>{selectedProfile.phone}</span>
                    </div>
                    <Send size={16} className="option-arrow" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Directorio;
