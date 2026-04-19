import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TIPOS_NC } from '../lib/ncNotificaciones';

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

  const buildItems = useCallback((eventosData, eventosVisData, cursosData, cursosVisData, cursosDestData, sgiData, ncData, currentLastSeen) => {
    const items = [];

    (ncData || []).forEach(n => {
      const config = TIPOS_NC[n.tipo];
      items.push({
        id: `nc-${n.id}`,
        tipo: 'hallazgo',
        itemId: n.hallazgo_id,
        titulo: config?.subtitulo(n.hallazgo_numero) || `Asignación en ${n.hallazgo_numero}`,
        subtitulo: config?.label || null,
        color: '#E71D36',
        created_at: n.created_at,
        leida: n.leida || n.created_at <= currentLastSeen,
        ncId: n.id,
      });
    });

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

    const destCursoIds = new Set((cursosDestData || []).map(d => d.curso_id));
    (cursosData || []).forEach(curso => {
      const rules = (cursosVisData || []).filter(r => r.curso_id === curso.id);
      if (destCursoIds.has(curso.id) || visMatchesProfile(rules, profile)) {
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

    return items.slice(0, 20);
  }, [profile]);

  // Guardamos los datos crudos para poder recalcular leida sin re-fetch
  const rawDataRef = useRef(null);

  const fetchNotificaciones = useCallback(async (currentLastSeen) => {
    if (!profile?.id || currentLastSeen === null) return;
    setIsLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - WINDOW_DAYS);
    const sinceISO = since.toISOString();

    const [eventosRes, eventosVisRes, cursosRes, cursosVisRes, cursosDestRes, sgiRes, ncRes] = await Promise.all([
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
      supabase.from('cursos_destinatarios').select('curso_id').eq('user_id', profile.id),
      supabase
        .from('sgi_versiones')
        .select('id, numero_version, fecha_emision, documento_id, documento:sgi_documentos(titulo)')
        .gte('fecha_emision', sinceISO.split('T')[0])
        .order('fecha_emision', { ascending: false })
        .limit(10),
      supabase
        .from('nc_notificaciones')
        .select('id, hallazgo_id, hallazgo_numero, tipo, leida, created_at')
        .eq('user_id', profile.id)
        .gt('created_at', sinceISO)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (eventosRes.error) console.error('[notif] eventos:', eventosRes.error.message);
    if (cursosRes.error)  console.error('[notif] cursos:', cursosRes.error.message);
    if (sgiRes.error)     console.error('[notif] sgi_versiones:', sgiRes.error.message);
    if (ncRes.error)      console.error('[notif] nc_notificaciones:', ncRes.error.message);

    rawDataRef.current = {
      eventos: eventosRes.data,
      eventosVis: eventosVisRes.data,
      cursos: cursosRes.data,
      cursosVis: cursosVisRes.data,
      cursosDest: cursosDestRes.data,
      sgi: sgiRes.data,
      nc: ncRes.data,
    };

    const items = buildItems(
      eventosRes.data, eventosVisRes.data,
      cursosRes.data, cursosVisRes.data, cursosDestRes.data,
      sgiRes.data, ncRes.data,
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

    await Promise.all([
      supabase
        .from('profiles')
        .update({ notifications_last_seen_at: now })
        .eq('id', profile.id),
      supabase
        .from('nc_notificaciones')
        .update({ leida: true })
        .eq('user_id', profile.id)
        .eq('leida', false),
    ]);

    // Recalcular leida con el nuevo timestamp usando datos ya cargados
    if (rawDataRef.current) {
      const { eventos, eventosVis, cursos, cursosVis, cursosDest, sgi, nc } = rawDataRef.current;
      const updatedNc = (nc || []).map(n => ({ ...n, leida: true }));
      rawDataRef.current.nc = updatedNc;
      const items = buildItems(eventos, eventosVis, cursos, cursosVis, cursosDest, sgi, updatedNc, now);
      setNotificaciones(items);
    }

    setLastSeen(now);
    setCount(0);
  }, [profile?.id, buildItems]);

  return { notificaciones, count, isLoading, markAsRead };
};
