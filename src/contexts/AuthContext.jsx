import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchNavConfig } from '../services/navService';

const AuthContext = createContext({});

const fetchMicrosoftProfile = async (providerToken) => {
  const res = await fetch(
    'https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,jobTitle,department,officeLocation,mail,mobilePhone,userPrincipalName',
    { headers: { Authorization: `Bearer ${providerToken}` } }
  );
  if (!res.ok) return null;
  return res.json();
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navConfig, setNavConfig] = useState({});

  const refreshNavConfig = async () => {
    const { data } = await fetchNavConfig();
    const map = {};
    data.forEach(({ key, visible }) => { map[key] = visible; });
    setNavConfig(map);
  };

  useEffect(() => {
    // onAuthStateChange captura tanto el login inicial (con provider_token)
    // como las sesiones restauradas (sin provider_token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) initProfile(session);
      else { setProfile(null); setIsLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initProfile = async (session) => {
    const userId = session.user.id;

    // Si hay provider_token (login fresco), sincronizar datos de Microsoft Graph
    if (session.provider_token) {
      const msData = await fetchMicrosoftProfile(session.provider_token);
      if (msData) {
        const msPayload = {
          email: msData.mail || msData.userPrincipalName || session.user.email,
          full_name: msData.displayName,
          job_title: msData.jobTitle || null,
          department: msData.department || null,
          office_location: msData.officeLocation || null,
          avatar_url: session.user.user_metadata?.avatar_url || null,
        };
        // upsert ignorando role/admin_tabs — solo actualiza campos de Microsoft
        await supabase.from('profiles').upsert(
          { id: userId, ...msPayload },
          { onConflict: 'id', ignoreDuplicates: false }
        );
      }
    }

    // Leer perfil (ya sea recién creado o existente)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
    else {
      // Fallback: crear perfil mínimo si no existe
      const fallback = {
        id: userId,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || session.user.email,
      };
      await supabase.from('profiles').upsert(fallback, { onConflict: 'id' });
      setProfile(fallback);
    }

    // Cargar config de navegación una sola vez por sesión
    await refreshNavConfig();
    setIsLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, setProfile, isLoading, signOut, navConfig, refreshNavConfig }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
