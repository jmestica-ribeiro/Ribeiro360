import { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase, Building2, MapPin, Linkedin, Save, CheckCircle, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import './Perfil.css';

const Perfil = () => {
  const { user, profile, setProfile } = useAuth();
  const [form, setForm] = useState({ full_name: '', job_title: '', department: '', office_location: '', phone: '', linkedin_url: '', whatsapp_consent: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
        office_location: profile.office_location || '',
        phone: profile.phone || '',
        linkedin_url: profile.linkedin_url || '',
        whatsapp_consent: profile.whatsapp_consent || false,
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [e.target.name]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('profiles')
      .update(form)
      .eq('id', user.id)
      .select()
      .single();
    setSaving(false);
    if (err) { setError('Error al guardar. Intentá de nuevo.'); return; }
    if (data && setProfile) setProfile(data);
    setSaved(true);
  };

  const initials = (form.full_name || user?.email || '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h2>Mi Perfil</h2>
        <p>Completá tu información para que tus compañeros puedan conocerte mejor</p>
      </div>

      <div className="perfil-content">
        <div className="perfil-avatar-card">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={form.full_name} className="perfil-avatar-img" />
            : <div className="perfil-avatar-initials">{initials}</div>
          }
          <h3>{form.full_name || 'Sin nombre'}</h3>
          {form.job_title && <p className="perfil-job">{form.job_title}</p>}
          {form.department && <span className="perfil-dept-badge">{form.department}</span>}
          <div className="perfil-email-row">
            <Mail size={14} />
            <span>{profile?.email || user?.email}</span>
          </div>
        </div>

        <form className="perfil-form" onSubmit={handleSubmit}>
          <div className="perfil-form-section">
            <h4>Información personal</h4>
            <div className="perfil-fields">
              <div className="perfil-field">
                <label><User size={14} /> Nombre completo</label>
                <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="perfil-field">
                <label><Linkedin size={14} /> LinkedIn</label>
                <input name="linkedin_url" value={form.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/tu-perfil" />
              </div>
              <div className="perfil-field perfil-field--full">
                <label><Phone size={14} /> Teléfono</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Ej: +54 299 4123456" />
              </div>
            </div>
            <label className="perfil-consent-label">
              <input
                type="checkbox"
                name="whatsapp_consent"
                checked={form.whatsapp_consent}
                onChange={handleChange}
                disabled={!form.phone}
              />
              <MessageCircle size={15} />
              Permitir que mis compañeros me contacten por WhatsApp
              {!form.phone && <span className="perfil-consent-hint">(Completá tu teléfono primero)</span>}
            </label>
          </div>

          <div className="perfil-form-section">
            <h4>Información laboral</h4>
            <div className="perfil-fields">
              <div className="perfil-field">
                <label><Briefcase size={14} /> Puesto</label>
                <input name="job_title" value={form.job_title} onChange={handleChange} placeholder="Ej: Analista Contable" />
              </div>
              <div className="perfil-field">
                <label><Building2 size={14} /> Sector</label>
                <input name="department" value={form.department} onChange={handleChange} placeholder="Ej: Administración" />
              </div>
              <div className="perfil-field">
                <label><MapPin size={14} /> Ubicación</label>
                <input name="office_location" value={form.office_location} onChange={handleChange} placeholder="Ej: Neuquén" />
              </div>
            </div>
          </div>

          {error && <p className="perfil-error">{error}</p>}

          <div className="perfil-form-footer">
            {saved && (
              <span className="perfil-saved-msg">
                <CheckCircle size={16} /> Cambios guardados
              </span>
            )}
            <button type="submit" className="btn-guardar" disabled={saving}>
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Perfil;
