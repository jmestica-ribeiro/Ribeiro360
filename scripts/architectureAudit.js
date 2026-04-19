import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

// Reglas Arquitectónicas de Buenas Prácticas
const RULES = [
  {
    type: 'regex',
    targetFile: /src\/features\/.*\.(jsx|js)$/,
    regex: /import \{.*supabase.*\} from/g,
    name: 'Fuga de Capa de Negocio (Supabase en UI)',
    message: 'Se encontró importación de Supabase directa en un componente UI. Las llamadas a datos deben estar centralizadas en src/services/.'
  },
  {
    type: 'regex',
    targetFile: /src\/services\/.*\.(jsx|js)$/,
    regex: /import \{.*(useState|useEffect|useAuth).*\} from/g,
    name: 'Lógica UI en capa de Servicios',
    message: 'Llamadas a React Hooks dentro de un archivo de servicios. Los servicios deben ser funciones asíncronas puras, no hooks.'
  },
  {
    type: 'regex',
    targetFile: /src\/features\/.*\.(jsx?)$/,
    regex: /import.*from '\.\.\/\.\.\/components\/common\//g,
    name: 'Importación Directa de Componentes Comunes',
    message: 'Se importó un componente común directamente desde su archivo interno. Deberías hacerlo mediante el Barrel Export: import { Componente } from "../../components/common";'
  }
];

// Límite de líneas recomendado para legibilidad
const MAX_LINES_PER_FILE = 250;

let hasErrors = false;
let hasWarnings = false;

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
  const relativePath = filePath.replace(/\\/g, '/');
  let fileIssues = 0;

  // Chequeo 1: Complejidad (Warning)
  if (lines.length > MAX_LINES_PER_FILE && !relativePath.includes('SGI') && !relativePath.includes('NCInformePDF')) {
    console.warn(`⚠️  Largo: ${filePath} (${lines.length} líneas)`);
    hasWarnings = true;
  }

  // Chequeo 2: Arquitectura (Error)
  lines.forEach((line, index) => {
    if (line.trim().startsWith('//') || line.includes('eslint-disable') || fileIssues >= 3) return;

    RULES.forEach(rule => {
      rule.regex.lastIndex = 0;
      if (rule.targetFile.test(relativePath) && rule.regex.test(line)) {
        if (rule.name.includes('Supabase en UI') && relativePath.includes('SGI')) return;

        if (fileIssues === 0) console.error(`🚨 ARQUITECTURA en: ${filePath}`);
        console.error(`   L${index + 1}: ${rule.name}`);
        fileIssues++;
        hasErrors = true;
      }
    });
  });
  
  if (fileIssues >= 3) console.error(`   ... y más errores de arquitectura en este archivo.`);
}

console.log("📐 Iniciando Inspector de Legibilidad y Buenas Prácticas Arquitectónicas...");
try {
  scanDirectory(srcDir);
} catch (e) {
  console.error("Error escaneando el directorio:", e.message);
  process.exit(1);
}

if (hasErrors) {
  console.error("\n⛔ La validación falló. El código rompe reglas estrictas de la arquitectura (ARCHITECTURE.md). Arregle el código antes de continuar.");
  process.exit(1);
} else if (hasWarnings) {
  console.log("\n✅ Auditoría pasada, pero con advertencias de legibilidad. (Mirar warnings arriba).");
} else {
  console.log("✅ ¡Excelente legibilidad y arquitectura! Componentes modulares y servicios limpios.");
}
