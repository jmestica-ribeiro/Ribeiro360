import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

const DB_MUTATION_REGEX = /supabase\.from\(['"][^'"]+['"]\)\.(insert|update)\(/g;
const NOTIFICATION_IMPORT_REGEX = /import.*notific.*from/i;

let warnings = 0;

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
  
  // Reiniciar Regex
  DB_MUTATION_REGEX.lastIndex = 0;
  NOTIFICATION_IMPORT_REGEX.lastIndex = 0;

  if (DB_MUTATION_REGEX.test(content)) {
    // El archivo tiene una mutación en Base de Datos (Creación o Actualización).
    // Verificamos si al menos considera usar el sistema de notificaciones.
    if (!NOTIFICATION_IMPORT_REGEX.test(content)) {
      console.warn(`\n🔔 RECORDATORIO DE NOTIFICACIÓN en: ${filePath}`);
      console.warn(`   > Se detectó creación o edición de datos (insert/update), pero NO se está importando el sistema de notificaciones.`);
      console.warn(`   > AI/Agente: Por favor, evaluá proactivamente si esta mutación requiere llamar a 'notificarAsignacion' u otra alerta global para el usuario final según el contexto de negocio.`);
      warnings++;
    }
  }
}

console.log("📬 Iniciando Auditoría Reactiva de Notificaciones...");
try {
  scanDirectory(srcDir);
} catch (e) {
  console.error("Error escaneando el directorio:", e.message);
  process.exit(1);
}

if (warnings > 0) {
  console.log(`\n⚠️ Se generaron ${warnings} recordatorios de Notificación. (Agente IA: Asegurate de no haber olvidado notificar al usuario si la lógica lo requiere).`);
} else {
  console.log("\n✅ Integridad de notificaciones chequeada: Todos los servicios de escritura están considerando el sistema de alertas.");
}
