import DOMPurify from 'dompurify';

// Los links que abren en otra pestaña no deben poder controlar window.opener
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// Lo que produce el editor de texto (TipTap: StarterKit + subrayado, color, alineación)
const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'mark', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
};

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html ?? '', CONFIG);
}
