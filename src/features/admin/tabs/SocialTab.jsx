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
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
          {SUBTABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSub(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: sub === key ? '2px solid var(--primary-color)' : '2px solid transparent',
                color: sub === key ? 'var(--primary-color)' : 'var(--text-muted)',
                fontWeight: sub === key ? 600 : 400,
                fontSize: '14px', cursor: 'pointer', marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <button
          onClick={handleTestEmail}
          disabled={testSending || testSent}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', marginBottom: '8px',
            background: testSent ? 'var(--bg-hover)' : 'none',
            border: '1px solid var(--border-color)',
            borderRadius: '8px', cursor: testSent ? 'default' : 'pointer',
            fontSize: '12px', fontWeight: 500,
            color: testSent ? 'var(--text-secondary)' : 'var(--text-muted)',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          title={`Enviar email de prueba a ${TEST_EMAIL}`}
        >
          {testSent
            ? <><CheckCircle size={13} /> Email enviado</>
            : <><Send size={13} /> {testSending ? 'Enviando…' : 'Probar email'}</>}
        </button>
      </div>

      {sub === 'anuncios' && <NovedadesTab />}
      {sub === 'fotos'    && <MultimediaTab />}
    </div>
  );
};

export default SocialTab;
