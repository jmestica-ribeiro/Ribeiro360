import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TIPOS_NC } from '../lib/notificaciones';
import { visMatchesProfile, courseIsVisible } from '../lib/visibilidad';
import { fetchNotifConfig, NOTIF_SGI_PUBLICADO, SGI_PUBLICADO_DEFAULTS } from '../services/notifConfigService';
import { fetchLecturasPendientesSgi } from '../services/sgiService';

// Aplica la config de Admin › SGI a las versiones SGI que aparecen en la campana
function filtrarSgiPorConfig(versiones, cfg) {
  const enabled = cfg?.enabled ?? SGI_PUBLICADO_DEFAULTS.enabled;
  const op = { ...SGI_PUBLICADO_DEFAULTS.opciones, ...(cfg?.opciones || {}) };
  if (!enabled || !op.campana) return [];
  return (versiones || []).filter(v =>
    !op.excluir_confidenciales || !v.documento?.acceso || v.documento.acceso === 'No Confidencial'
  );
}

const WINDOW_DAYS = 30;

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

  const buildItems = useCallback((eventosData, eventosVisData, cursosData, cursosVisData, cursosDestData, sgiData, ncData, currentLastSeen, lecturasData) => {
    const items = [];

    // Lectura obligatoria pendiente: queda sin leer hasta que el usuario confirme la lectura del documento
    const lecturaDocIds = new Set();
    (lecturasData || []).forEach(ver => {
      lecturaDocIds.add(ver.documento?.id);
      items.push({
        id: `lectura-${ver.id}`,
        tipo: 'documento',
        itemId: ver.documento?.id,
        titulo: ver.documento?.titulo || `Versión ${ver.numero_version}`,
        subtitulo: `Lectura obligatoria pendiente · Rev. ${ver.numero_version}`,
        color: '#D97706',
        created_at: ver.fecha_emision || new Date().toISOString(),
        leida: false,
        obligatoria: true,
      });
    });

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
      if (courseIsVisible(curso.id, destCursoIds, cursosVisData, profile)) {
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

    const sgiDedup = (sgiData || []).filter(
      (ver, idx, arr) => arr.findIndex(v => v.documento_id === ver.documento_id) === idx
    );
    sgiDedup.filter(ver => !lecturaDocIds.has(ver.documento_id)).forEach(ver => {
      // fecha_emision es YYYY-MM-DD — comparamos contra la fecha del lastSeen
      const createdAt = ver.fecha_emision;
      const lastSeenDate = currentLastSeen ? currentLastSeen.split('T')[0] : '';
      items.push({
        id: `sgi-${ver.id}`,
        tipo: 'documento',
        itemId: ver.documento_id,
        titulo: ver.documento?.titulo || `Versión ${ver.numero_version}`,
        subtitulo: ver.numero_version ? `v${ver.numero_version}` : null,
        color: '#3B82F6',
        created_at: createdAt,
        leida: createdAt <= lastSeenDate,
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

    const [eventosRes, eventosVisRes, cursosRes, cursosVisRes, cursosDestRes, sgiRes, ncRes, sgiCfgRes, lecturasRes] = await Promise.all([
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
        .select('id, numero_version, fecha_emision, documento_id, documento:sgi_documentos(titulo, acceso)')
        .gte('fecha_emision', sinceISO.split('T')[0])
        .eq('vigente', true)
        .order('fecha_emision', { ascending: false })
        .limit(10),
      supabase
        .from('nc_notificaciones')
        .select('id, hallazgo_id, hallazgo_numero, tipo, leida, created_at')
        .eq('user_id', profile.id)
        .gt('created_at', sinceISO)
        .order('created_at', { ascending: false })
        .limit(20),
      fetchNotifConfig(NOTIF_SGI_PUBLICADO),
      fetchLecturasPendientesSgi(profile.id),
    ]);
    const sgiVisibles = filtrarSgiPorConfig(sgiRes.data, sgiCfgRes.data);

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
      sgi: sgiVisibles,
      nc: ncRes.data,
      lecturas: lecturasRes.data,
    };

    const items = buildItems(
      eventosRes.data, eventosVisRes.data,
      cursosRes.data, cursosVisRes.data, cursosDestRes.data,
      sgiVisibles, ncRes.data,
      currentLastSeen, lecturasRes.data
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

    // Usar como lastSeen la fecha más tardía entre ahora y las fechas de los docs SGI visibles,
    // para que documentos con fecha_emision de hoy o futura queden marcados como leídos.
    const sgiDates = (rawDataRef.current?.sgi || []).map(v => v.fecha_emision + 'T23:59:59');
    const effectiveNow = sgiDates.reduce((max, d) => (d > max ? d : max), now);

    await Promise.all([
      supabase
        .from('profiles')
        .update({ notifications_last_seen_at: effectiveNow })
        .eq('id', profile.id),
      supabase
        .from('nc_notificaciones')
        .update({ leida: true })
        .eq('user_id', profile.id)
        .eq('leida', false),
    ]);

    // Recalcular leida con el nuevo timestamp usando datos ya cargados
    if (rawDataRef.current) {
      const { eventos, eventosVis, cursos, cursosVis, cursosDest, sgi, nc, lecturas } = rawDataRef.current;
      const updatedNc = (nc || []).map(n => ({ ...n, leida: true }));
      rawDataRef.current.nc = updatedNc;
      const items = buildItems(eventos, eventosVis, cursos, cursosVis, cursosDest, sgi, updatedNc, effectiveNow, lecturas);
      setNotificaciones(items);
      setCount(items.filter(i => !i.leida).length); // las lecturas obligatorias siguen pendientes
    } else {
      setCount(0);
    }

    setLastSeen(effectiveNow);
  }, [profile?.id, buildItems]);

  return { notificaciones, count, isLoading, markAsRead };
};
