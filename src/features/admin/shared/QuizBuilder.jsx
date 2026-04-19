import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { HelpCircle } from 'lucide-react';

/**
 * Editor de cuestionario final para un curso.
 *
 * @param {Array} preguntas - lista de preguntas actuales
 * @param {function} setPreguntas - setter del estado de preguntas
 */
const QuizBuilder = ({ preguntas, setPreguntas }) => {
  const handleAddPregunta = () => {
    const ts = Date.now();
    setPreguntas(prev => [...prev, {
      id: 'p-' + ts,
      texto: '',
      opciones: [
        { id: 'o-' + ts + '-1', texto: '', correcta: true },
        { id: 'o-' + ts + '-2', texto: '', correcta: false },
      ]
    }]);
  };

  const handleUpdatePregunta = (pIdx, texto) => {
    setPreguntas(prev => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], texto };
      return next;
    });
  };

  const handleRemovePregunta = (pIdx) => {
    setPreguntas(prev => prev.filter((_, i) => i !== pIdx));
  };

  const handleAddOpcion = (pIdx) => {
    setPreguntas(prev => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], opciones: [...next[pIdx].opciones, { id: 'o-' + Date.now(), texto: '', correcta: false }] };
      return next;
    });
  };

  const handleUpdateOpcion = (pIdx, oIdx, texto) => {
    setPreguntas(prev => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], opciones: next[pIdx].opciones.map((o, i) => i === oIdx ? { ...o, texto } : o) };
      return next;
    });
  };

  const handleSetCorrecta = (pIdx, oIdx) => {
    setPreguntas(prev => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], opciones: next[pIdx].opciones.map((o, i) => ({ ...o, correcta: i === oIdx })) };
      return next;
    });
  };

  const handleRemoveOpcion = (pIdx, oIdx) => {
    setPreguntas(prev => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], opciones: next[pIdx].opciones.filter((_, i) => i !== oIdx) };
      return next;
    });
  };

  return (
    <>
      <div className="section-divider" style={{ margin: '48px 0', borderBottom: '2px solid #f0f0f0' }} />
      <div className="flex-between mb-6">
        <div>
          <h4 style={{ fontSize: '18px', fontWeight: '800' }}>5. Cuestionario Final</h4>
          <p className="text-muted text-sm" style={{ marginTop: '6px' }}>
            Preguntas que el usuario debe responder al completar todos los módulos.
          </p>
        </div>
        <button className="btn-secondary" onClick={handleAddPregunta}><Plus size={16} /> Nueva Pregunta</button>
      </div>

      {preguntas.length === 0 ? (
        <div className="empty-quiz-hint">
          <HelpCircle size={28} />
          <p>Sin cuestionario. Las preguntas son opcionales — si no agregás ninguna, el curso finaliza al completar los módulos.</p>
        </div>
      ) : (
        <div className="preguntas-list">
          {preguntas.map((pregunta, pIdx) => (
            <div key={pregunta.id} className="pregunta-card">
              <div className="pregunta-card-header">
                <span className="mod-number">{pIdx + 1}</span>
                <input
                  className="form-control-ghost"
                  style={{ flex: 1, fontSize: '15px', fontWeight: '700' }}
                  value={pregunta.texto}
                  placeholder="Escribe la pregunta aquí..."
                  onChange={e => handleUpdatePregunta(pIdx, e.target.value)}
                />
                <button className="delete-mod" onClick={() => handleRemovePregunta(pIdx)}><Trash2 size={16} /></button>
              </div>

              <div className="opciones-editor">
                <p className="opciones-hint">Seleccioná el radio de la respuesta correcta</p>
                {pregunta.opciones.map((opcion, oIdx) => (
                  <div key={opcion.id} className={`opcion-row ${opcion.correcta ? 'correcta' : ''}`}>
                    <input
                      type="radio"
                      name={`correct-${pregunta.id}`}
                      checked={opcion.correcta}
                      onChange={() => handleSetCorrecta(pIdx, oIdx)}
                      className="opcion-radio"
                    />
                    <input
                      className="form-control"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '14px' }}
                      value={opcion.texto}
                      placeholder={`Opción ${oIdx + 1}...`}
                      onChange={e => handleUpdateOpcion(pIdx, oIdx, e.target.value)}
                    />
                    {pregunta.opciones.length > 2 && (
                      <button className="btn-remove-block" onClick={() => handleRemoveOpcion(pIdx, oIdx)}><X size={12} /></button>
                    )}
                  </div>
                ))}
                {pregunta.opciones.length < 4 && (
                  <button className="btn-add-sub" onClick={() => handleAddOpcion(pIdx)}>+ Agregar opción</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default QuizBuilder;
