import { useEffect, useState } from 'react';
import { fetchSgiCircuitoConfig, SGI_CIRCUITO_DEFAULTS } from '../../services/notifConfigService';

/**
 * Opciones del circuito de aprobación SGI configuradas en Admin › SGI
 * (área revisora, revisores adicionales, alertas, recordatorios).
 * Devuelve los defaults mientras carga, así la UI nunca queda sin datos.
 */
export function useSgiCircuito() {
  const [opciones, setOpciones] = useState(SGI_CIRCUITO_DEFAULTS.opciones);
  useEffect(() => {
    let alive = true;
    fetchSgiCircuitoConfig().then(({ data }) => { if (alive) setOpciones(data.opciones); });
    return () => { alive = false; };
  }, []);
  return opciones;
}
