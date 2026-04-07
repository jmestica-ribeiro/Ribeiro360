import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const WINDOW_DAYS = 30;

const visMatchesProfile = (rules, profile) => {
  if (rules.length === 0) return true;
  return rules.every(r => {
    const v = profile?.[r.campo];
    return v && v.toLowerCase() === r.valor.toLowerCase();
  });
};

export const useNotificaciones = (profile) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // lastSeen como estado local — independiente del profile del AuthContext
  const [lastSeen, setLastSeen] = useState(null);
  const initializedRef = useRef(false);

  // Inicializar lastSeen UNA sola vez desde el perfil
  useEffect(() => {
    if (!initializedRef.current && profile?.id) {
      setLastSeen(profile.notifications_last_seen_at || new Date(0).toISOString());
      initializedRef.current = true;
    }
  }, [profile?.id, profile?.notifications_last_seen_at]);

  const buildItems = useCallback((eventosData, eventosVisData, cursosData, cursosVisData, sgiData, currentLastSeen) => {
    const items = [];

    (eventosData || []).forEach(evento => {
      const rules = (eventosVisData || []).filter(r => r.evento_id === evento.id);
      if (visMatchesProfile(rules, profile)) {
        items.push({
          id: `evento-${evento.id}`,
          tipo: 'evento',
          itemId: evento.id,
          titulo: evento.titulo,
          subtitulo: evento.categoria?.nombre || null,
          color: evento.categoria?.color || '#6C757D',
          fecha: evento.fecha,
          created_at: evento.created_at,
          leida: evento.created_at <= currentLastSeen,
        });
      }
    });

    (cursosData || []).forEach(curso => {
      const rules = (cursosVisData || []).filter(r => r.curso_id === curso.id);
      if (visMatchesProfile(rules, profile)) {
        items.push({
          id: `curso-${curso.id}`,
          tipo: 'capacitacion',
          itemId: curso.id,
          titulo: curso.titulo,
          subtitulo: curso.categoria?.nombre || null,
          color: curso.categoria?.color || '#6C757D',
          created_at: curso.created_at,
          leida: curso.created_at <= currentLastSeen,
        });
      }
    });

    (sgiData || []).forEach(ver => {
      const createdAt = ver.fecha_emision;
      items.push({
        id: `sgi-${ver.id}`,
        tipo: 'documento',
        itemId: ver.documento_id,
        titulo: ver.documento?.titulo || `Versión ${ver.numero_version}`,
        subtitulo: ver.numero_version ? `v${ver.numero_version}` : null,
        color: '#3B82F6',
        created_at: createdAt,
        leida: createdAt <= currentLastSeen,
      });
    });

    items.sort((a, b) => {
      if (a.leida !== b.leida) return a.leida ? 1 : -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return items.slice(0, 10);
  }, [profile]);

  // Guardamos los datos crudos para poder recalcular leida sin re-fetch
  const rawDataRef = useRef(null);

  const fetchNotificaciones = useCallback(async (currentLastSeen) => {
    if (!profile?.id || currentLastSeen === null) return;
    setIsLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - WINDOW_DAYS);
    const sinceISO = since.toISOString();

    const [eventosRes, eventosVisRes, cursosRes, cursosVisRes, sgiRes] = await Promise.all([
      supabase
        .from('eventos')
        .select('id, titulo, fecha, created_at, categoria:eventos_categorias(nombre, color)')
        .gt('created_at', sinceISO)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('eventos_visibilidad').select('*'),
      supabase
        .from('cursos')
        .select('id, titulo, created_at, categoria:cursos_categorias(nombre, color)')
        .gt('created_at', sinceISO)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('cursos_visibilidad').select('*'),
      supabase
        .from('sgi_versiones')
        .select('id, numero_version, fecha_emision, documento_id, documento:sgi_documentos(titulo)')
        .gte('fecha_emision', sinceISO.split('T')[0])
        .order('fecha_emision', { ascending: false })
        .limit(10),
    ]);

    if (eventosRes.error) console.error('[notif] eventos:', eventosRes.error.message);
    if (cursosRes.error)  console.error('[notif] cursos:', cursosRes.error.message);
    if (sgiRes.error)     console.error('[notif] sgi_versiones:', sgiRes.error.message);

    rawDataRef.current = {
      eventos: eventosRes.data,
      eventosVis: eventosVisRes.data,
      cursos: cursosRes.data,
      cursosVis: cursosVisRes.data,
      sgi: sgiRes.data,
    };

    const items = buildItems(
      eventosRes.data, eventosVisRes.data,
      cursosRes.data, cursosVisRes.data,
      sgiRes.data,
      currentLastSeen
    );

    setNotificaciones(items);
    setCount(items.filter(i => !i.leida).length);
    setIsLoading(false);
  }, [profile?.id, buildItems]);

  useEffect(() => {
    if (lastSeen !== null) {
      fetchNotificaciones(lastSeen);
    }
  }, [lastSeen, fetchNotificaciones]);

  // Refetch al volver a la pestaña
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && lastSeen !== null) {
        fetchNotificaciones(lastSeen);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [lastSeen, fetchNotificaciones]);

  const markAsRead = useCallback(async () => {
    if (!profile?.id) return;
    const now = new Date().toISOString();

    await supabase
      .from('profiles')
      .update({ notifications_last_seen_at: now })
      .eq('id', profile.id);

    // Recalcular leida con el nuevo timestamp usando datos ya cargados
    if (rawDataRef.current) {
      const { eventos, eventosVis, cursos, cursosVis, sgi } = rawDataRef.current;
      const items = buildItems(eventos, eventosVis, cursos, cursosVis, sgi, now);
      setNotificaciones(items);
    }

    setLastSeen(now);
    setCount(0);
  }, [profile?.id, buildItems]);

  return { notificaciones, count, isLoading, markAsRead };
};
