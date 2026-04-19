import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const servicesDir = path.join(__dirname, '..', 'src', 'services');
const docsDir = path.join(__dirname, '..', 'docs');

if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

console.log("⏳ Generando Mapa de Servicios (Contexto Compacto)...");

const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
let mdContent = `# Mapa de Servicios de Datos\n\n`;
mdContent += `*Índice de funciones disponibles en la capa de servicios para acceso rápido del Agente.*\n\n`;

files.forEach(file => {
  const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
  mdContent += `## [${file}](../../src/services/${file})\n`;
  
  // Regex para capturar nombres de funciones exportadas
  const regex = /export async function ([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
  let match;
  let found = false;

  while ((match = regex.exec(content)) !== null) {
    const funcName = match[1];
    const params = match[2].trim();
    mdContent += `- \`${funcName}(${params})\`\n`;
    found = true;
  }
  
  if (!found) mdContent += `*(No se detectaron funciones exportadas async compatibles)*\n`;
  mdContent += `\n`;
});

fs.writeFileSync(path.join(docsDir, 'services_map.md'), mdContent);
console.log(`✅ ¡Mapa generado en docs/services_map.md!`);
