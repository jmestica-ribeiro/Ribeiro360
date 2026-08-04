import React, { useState } from 'react';
import { Megaphone, Image as ImageIcon } from 'lucide-react';
import NovedadesTab from './NovedadesTab';
import MultimediaTab from './MultimediaTab';

const SUBTABS = [
  { key: 'anuncios', label: 'Anuncios', icon: Megaphone },
  { key: 'fotos',    label: 'Fotos',    icon: ImageIcon },
];

const SocialTab = () => {
  const [sub, setSub] = useState('anuncios');

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
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

      {sub === 'anuncios' && <NovedadesTab />}
      {sub === 'fotos'    && <MultimediaTab />}
    </div>
  );
};

export default SocialTab;
