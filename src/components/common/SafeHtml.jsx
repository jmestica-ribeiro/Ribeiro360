import React from 'react';
import { sanitizeHtml } from '../../lib/sanitize';

/** Renderiza HTML guardado (ej. texto enriquecido de cursos) sanitizado contra XSS. */
export function SafeHtml({ html, as: Tag = 'div', ...rest }) {
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
