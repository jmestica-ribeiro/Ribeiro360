import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

// Reglas de Seguridad e Integridad Puras para React/Supabase
const SECURITY_RULES = [
  {
    regex: /dangerouslySetInnerHTML/g,
    name: 'Posible XSS (Cross-Site Scripting)',
    severity: 'ALTA',
    message: 'El uso de dangerouslySetInnerHTML expone la intranet a inyección de scripts externos. Evitar su uso o garantizar la sanitización (ej: DOMPurify).'
  },
  {
    regex: /VITE_SUPABASE_SERVICE_ROLE/g,
    name: 'Fuga de Llaves Administrativas',
    severity: 'CRÍTICA',
    message: 'NUNCA debe invocarse un Service Role Key desde el cliente (Frontend). Use siempre VITE_SUPABASE_ANON_KEY. El Service Role otorga bypass total de la base de datos.'
  },
  {
    regex: /localStorage\.setItem\(['"](token|password|session|auth)['"]/i,
    name: 'Almacenamiento Inseguro',
    severity: 'MEDIA',
    message: 'Estás guardando tokens manualmente de forma plana. Supabase ya maneja el almacenamiento seguro de la sesión nativamente.'
  },
  {
    regex: /console\.log\(.*(password|contrase[ñn]a|token|session|auth).*\)/i,
    name: 'Fuga de Información en Consola (Information Disclosure)',
    severity: 'BAJA',
    message: 'Se encontró un console.log que podría revelar datos sensibles o de sesión en el navegador del usuario final.'
  },
  {
    regex: /supabase\.from\(['"][^'"]+['"]\)\.(delete|update)\(\)(?!\.eq|\.in|\.match)/g,
    name: 'Destrucción de Datos Masiva (Unsafe Supabase Query)',
    severity: 'CRÍTICA',
    message: 'Se detectó una consulta de update() o delete() genérica sin un filtro .eq() inmediatamente asociado. Podría afectar/borrar toda la tabla accidentalmente.'
  }
];

let hasErrors = false;

function scanDirectory(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      auditFile(fullPath);
    }
  });
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let fileErrors = 0;

  lines.forEach((line, index) => {
    if (fileErrors >= 3) return;

    // Si la línea está comentada con // /* o ignora eslint, la salteamos
    if (line.trim().startsWith('//') || line.includes('eslint-disable')) return;

    SECURITY_RULES.forEach(rule => {
      rule.regex.lastIndex = 0; 
      if (rule.regex.test(line)) {
        if (fileErrors === 0) console.error(`🚨 SEGURIDAD en: ${filePath}`);
        console.error(`   L${index + 1}: [${rule.severity}] ${rule.name}`);
        fileErrors++;
        hasErrors = true;
      }
    });
  });

  if (fileErrors >= 3) console.error(`   ... y más riesgos detectados.`);
}

console.log("🛡️  Iniciando Escáner de Ciberseguridad y Data Integrity...");
try {
  scanDirectory(srcDir);
} catch (e) {
  console.error("Error escaneando el directorio:", e.message);
  process.exit(1);
}

if (hasErrors) {
  console.error("\n⛔ La validación de seguridad bloqueó la ejecución. Revise y parchee las vulnerabilidades arriba marcadas.");
  process.exit(1);
} else {
  console.log("✅ ¡Auditoría Limpia! El código pasó los checks de inyección y privacidad de credenciales.");
}
