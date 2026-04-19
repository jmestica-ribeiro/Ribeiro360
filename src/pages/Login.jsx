import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Logo from '../assets/Logo.png';
import './Login.css';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile openid User.Read',
        redirectTo: window.location.origin,
      },
    });
    if (error) { setError(error.message); setIsLoading(false); }
  };

  return (
    <div className="login-container">
      <div className="login-grid" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-card">
        <div className="login-logo">
          <img src={Logo} alt="Ribeiro" />
          <h1>Ribeiro <span>360</span></h1>
        </div>

        <div className="login-body">
          <h2>Bienvenido</h2>
          <p>Ingresá con tu cuenta corporativa de Microsoft 365 para acceder a la plataforma.</p>

          {error && <div className="login-error">{error}</div>}

          <button
            className="btn-microsoft"
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            {isLoading ? 'Redirigiendo...' : 'Continuar con Microsoft 365'}
          </button>
        </div>

        <p className="login-footer">
          Solo usuarios de Ribeiro SRL tienen acceso a esta plataforma.
        </p>
      </div>
    </div>
  );
};

export default Login;
