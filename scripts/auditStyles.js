import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const featuresDir = path.join(__dirname, '..', 'src', 'features');

// Patrones a evitar en el código (colores estáticos)
const HEX_REGEX = /:[ \t]*#([0-9a-fA-F]{3,6})\b/g;
const RGB_REGEX = /:[ \t]*rgba?\(/g;

let hasErrors = false;

function scanDirectory(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith('.css') || fullPath.endsWith('.jsx')) {
      auditFile(fullPath);
    }
  });
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let fileErrors = 0;

  lines.forEach((line, index) => {
    if (fileErrors >= 5) return;

    if (HEX_REGEX.test(line) || RGB_REGEX.test(line)) {
      if (!line.includes('eslint-disable') && !line.includes('var(')) {
        if (fileErrors === 0) console.error(`❌ Estilo Hardcodeado: ${filePath}`);
        console.error(`   L${index + 1}: ${line.trim().slice(0, 50)}...`);
        fileErrors++;
        hasErrors = true;
      }
    }
  });
  
  if (fileErrors >= 5) console.error(`   ... y más errores de estilo.`);
}

console.log("🔍 Iniciando Auditoría de Diseño UI/UX...");
scanDirectory(featuresDir);

if (hasErrors) {
  console.error("⛔ La auditoría falló. Por favor reemplace los colores estáticos por variables CSS.");
  process.exit(1);
} else {
  console.log("✅ ¡Auditoría correcta! No se detectaron colores estáticos.");
}
