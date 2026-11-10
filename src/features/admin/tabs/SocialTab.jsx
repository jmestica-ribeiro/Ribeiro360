import React, { useState } from 'react';
import { Megaphone, Image as ImageIcon, Send, CheckCircle } from 'lucide-react';
import NovedadesTab from './NovedadesTab';
import MultimediaTab from './MultimediaTab';
import { notificarNuevaPublicacion } from '../../../lib/notificaciones';

const TEST_EMAIL = 'juan.mestica@ribeirosrl.com.ar';

const SUBTABS = [
  { key: 'anuncios', label: 'Anuncios', icon: Megaphone },
  { key: 'fotos',    label: 'Fotos',    icon: ImageIcon },
];

const SocialTab = () => {
  const [sub, setSub] = useState('anuncios');
  const [testSent, setTestSent] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const handleTestEmail = async () => {
    setTestSending(true);
    notificarNuevaPublicacion({ titulo: 'Prueba de email Social', tipo: 'foto', testEmail: TEST_EMAIL });
    await new Promise(r => setTimeout(r, 1200));
    setTestSending(false);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <div>
      <div className="adm-toolbar adm-social-bar">
        <div className="org-segmented" role="tablist" aria-label="Contenido social">
          {SUBTABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={sub === key}
              className={sub === key ? 'active' : ''}
              onClick={() => setSub(key)}
            >
              <Icon size={15} strokeWidth={1.5} /> {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="adm-pill-btn"
          onClick={handleTestEmail}
          disabled={testSending || testSent}
          title={`Enviar email de prueba a ${TEST_EMAIL}`}
        >
          {testSent
            ? <><CheckCircle size={14} strokeWidth={1.5} /> Email enviado</>
            : <><Send size={14} strokeWidth={1.5} /> {testSending ? 'Enviando…' : 'Probar email'}</>}
        </button>
      </div>

      {sub === 'anuncios' && <NovedadesTab />}
      {sub === 'fotos'    && <MultimediaTab />}
    </div>
  );
};

export default SocialTab;
