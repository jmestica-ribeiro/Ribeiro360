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
    <section className="quiz-section" aria-labelledby="quiz-title">
      <div className="quiz-head">
        <div>
          <span className="blk-section-label">Paso 5</span>
          <h4 id="quiz-title" className="quiz-title">Cuestionario final</h4>
          <p className="quiz-subtitle">
            Preguntas que el usuario debe responder al completar todos los módulos.
          </p>
        </div>
        <button type="button" className="blk-pill-btn" onClick={handleAddPregunta}>
          <Plus size={16} strokeWidth={1.5} /> Nueva pregunta
        </button>
      </div>

      {preguntas.length === 0 ? (
        <div className="quiz-empty">
          <HelpCircle size={28} strokeWidth={1.5} />
          <p>Sin cuestionario. Las preguntas son opcionales — si no agregás ninguna, el curso finaliza al completar los módulos.</p>
        </div>
      ) : (
        <div className="quiz-list">
          {preguntas.map((pregunta, pIdx) => (
            <div key={pregunta.id} className="quiz-card">
              <div className="quiz-card-head">
                <span className="blk-index">{pIdx + 1}</span>
                <input
                  className="quiz-question"
                  value={pregunta.texto}
                  aria-label={`Pregunta ${pIdx + 1}`}
                  placeholder="Escribí la pregunta aquí…"
                  onChange={e => handleUpdatePregunta(pIdx, e.target.value)}
                />
                <button
                  type="button"
                  className="adm-action danger"
                  aria-label={`Eliminar pregunta ${pIdx + 1}`}
                  onClick={() => handleRemovePregunta(pIdx)}
                ><Trash2 size={16} strokeWidth={1.5} /></button>
              </div>

              <div className="quiz-options" role="radiogroup" aria-label={`Respuesta correcta de la pregunta ${pIdx + 1}`}>
                <p className="quiz-hint">Marcá la respuesta correcta</p>
                {pregunta.opciones.map((opcion, oIdx) => (
                  <div key={opcion.id} className={`quiz-option${opcion.correcta ? ' correct' : ''}`}>
                    <label className="quiz-radio" title="Marcar como correcta">
                      <input
                        type="radio"
                        name={`correct-${pregunta.id}`}
                        checked={opcion.correcta}
                        aria-label={`Opción ${oIdx + 1} correcta`}
                        onChange={() => handleSetCorrecta(pIdx, oIdx)}
                      />
                      <span className="quiz-radio-dot" aria-hidden="true" />
                    </label>
                    <input
                      className="quiz-option-input"
                      value={opcion.texto}
                      aria-label={`Texto de la opción ${oIdx + 1}`}
                      placeholder={`Opción ${oIdx + 1}…`}
                      onChange={e => handleUpdateOpcion(pIdx, oIdx, e.target.value)}
                    />
                    {opcion.correcta && <span className="adm-badge success">Correcta</span>}
                    {pregunta.opciones.length > 2 && (
                      <button
                        type="button"
                        className="adm-action danger"
                        aria-label={`Quitar opción ${oIdx + 1}`}
                        onClick={() => handleRemoveOpcion(pIdx, oIdx)}
                      ><X size={14} strokeWidth={1.5} /></button>
                    )}
                  </div>
                ))}
                {pregunta.opciones.length < 4 && (
                  <button type="button" className="blk-dashed-btn quiz-add-option" onClick={() => handleAddOpcion(pIdx)}>
                    <Plus size={14} strokeWidth={1.5} /> Agregar opción
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default QuizBuilder;
