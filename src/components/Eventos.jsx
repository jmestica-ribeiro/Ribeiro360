import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Eventos.css';

function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday=0 (European grid)
  return (day + 6) % 7;
}

export default function Eventos() {
  const { profile } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [activeCategoria, setActiveCategoria] = useState('todas');
  const [isLoading, setIsLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 2, 0).toISOString().split('T')[0];

      const [eventosRes, categoriasRes, visRes] = await Promise.all([
        supabase
          .from('eventos')
          .select('*, categoria:eventos_categorias(nombre, color), area:areas(nombre, color)')
          .gte('fecha', firstDay)
          .lte('fecha', lastDay),
        supabase.from('eventos_categorias').select('*'),
        supabase.from('eventos_visibilidad').select('*'),
      ]);

      if (eventosRes.data) {
        const visRules = visRes.data || [];
        const filtered = eventosRes.data.filter(ev => {
          const rules = visRules.filter(r => r.evento_id === ev.id);
          if (rules.length === 0) return true;
          return rules.some(r => {
            const val = profile?.[r.campo];
            return val && val.toLowerCase() === r.valor.toLowerCase();
          });
        });
        setEventos(filtered);
      }
      if (categoriasRes.data) setCategorias(categoriasRes.data);
    } catch (error) {
      console.error('Error fetching eventos data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const monthName = currentDate
    .toLocaleDateString('es-AR', { month: 'long' })
    .replace(/^\w/, (c) => c.toUpperCase());

  const days = getDaysInMonth(year, month);
  const offset = getFirstDayOfWeek(year, month);

  const filteredEvents =
    activeCategoria === 'todas'
      ? eventos
      : eventos.filter((e) => e.categoria_id === activeCategoria);

  const dayEvents = selectedDay
    ? filteredEvents.filter(
        (e) => e.fecha === selectedDay.toISOString().split('T')[0]
      )
    : [];

  return (
    <div className="eventos-container">
      <div className="eventos-header">
        <h2>Eventos</h2>
        <p>Calendario institucional</p>
      </div>

      <div className="eventos-toolbar">
        <div className="area-chips">
          <button
            className={`area-chip ${activeCategoria === 'todas' ? 'active' : ''}`}
            onClick={() => setActiveCategoria('todas')}
          >
            Todas
            {eventos.length > 0 && (
              <span className={`chip-badge ${activeCategoria === 'todas' ? 'chip-badge-active' : ''}`}>
                {eventos.filter((e) => {
                  const d = new Date(e.fecha + 'T00:00:00');
                  return d.getFullYear() === year && d.getMonth() === month;
                }).length}
              </span>
            )}
          </button>
          {categorias.map((cat) => {
            const count = eventos.filter((e) => {
              if (e.categoria_id !== cat.id) return false;
              const d = new Date(e.fecha + 'T00:00:00');
              return d.getFullYear() === year && d.getMonth() === month;
            }).length;
            return (
              <button
                key={cat.id}
                className={`area-chip ${activeCategoria === cat.id ? 'active' : ''}`}
                style={
                  activeCategoria === cat.id
                    ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff' }
                    : {}
                }
                onClick={() => setActiveCategoria(cat.id)}
              >
                {cat.nombre}
                {count > 0 && (
                  <span
                    className={`chip-badge ${activeCategoria === cat.id ? 'chip-badge-active' : ''}`}
                    style={activeCategoria === cat.id ? { backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff' } : {}}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="calendar-wrapper">
        {/* Calendar panel */}
        <div className="calendar-panel">
          <div className="calendar-nav">
            <button onClick={prevMonth}>
              <ChevronLeft size={20} />
            </button>
            <h3>
              {monthName} {year}
            </h3>
            <button onClick={nextMonth}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-grid">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="calendar-dow">
                {d}
              </div>
            ))}

            {Array.from({ length: offset }).map((_, i) => (
              <div key={'e' + i} className="calendar-cell empty" />
            ))}

            {days.map((day) => {
              const dayStr = day.toISOString().split('T')[0];
              const dayEventsForCell = filteredEvents.filter(
                (e) => e.fecha === dayStr
              );
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected =
                selectedDay?.toDateString() === day.toDateString();
              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEventsForCell.length > 0 ? 'has-events' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="day-number">{day.getDate()}</span>
                  <div className="day-dots">
                    {dayEventsForCell.slice(0, 3).map((ev, i) => (
                      <span
                        key={i}
                        className="event-dot"
                        style={{ backgroundColor: ev.categoria?.color || '#ccc' }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel - always visible */}
        <div className="day-detail-panel">
          {!selectedDay ? (
            <div className="no-day-events">
              <Calendar size={32} />
              <p>Seleccioná un día para ver sus eventos</p>
            </div>
          ) : (
            <>
              <div className="day-detail-header">
                <h3>
                  {selectedDay.toLocaleDateString('es-AR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </h3>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDay.toDateString()}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {dayEvents.length === 0 ? (
                    <div className="no-day-events">
                      <Calendar size={32} />
                      <p>Sin eventos este día</p>
                    </div>
                  ) : (
                    <div className="day-events-list">
                      {dayEvents.map((ev) => (
                        <div key={ev.id} className="day-event-card">
                          <div className="day-event-color-bar" style={{ backgroundColor: ev.categoria?.color || '#ccc' }} />
                          <div className="day-event-info">
                            <span className="day-event-title">{ev.titulo}</span>
                            <div className="day-event-meta">
                              {ev.categoria && (
                                <span className="day-event-cat" style={{ color: ev.categoria.color }}>
                                  {ev.categoria.nombre}
                                </span>
                              )}
                              {ev.area && (
                                <span className="day-event-area" style={{ backgroundColor: ev.area.color + '20', color: ev.area.color }}>
                                  {ev.area.nombre}
                                </span>
                              )}
                            </div>
                            {ev.descripcion && <p className="day-event-desc">{ev.descripcion}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
