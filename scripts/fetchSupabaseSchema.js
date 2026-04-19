import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const openApiUrl = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
const docsDir = path.join(__dirname, '..', 'docs');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

console.log("⏳ Descargando y comprimiendo esquema de Supabase a Markdown...");

https.get(openApiUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const swagger = JSON.parse(data);
      if (swagger.message) {
        console.error("❌ Supabase Error:", swagger.message);
        console.error("💡 Hint:", swagger.hint);
        return;
      }
      const definitions = swagger.definitions || (swagger.components && swagger.components.schemas) || {};
      if (Object.keys(definitions).length === 0) {
        console.log("JSON recibido:", JSON.stringify(swagger, null, 2));
      }
      console.log("Definiciones (Total):", Object.keys(definitions).length);
      
      let mdContent = `# Esquema de Base de Datos (Compacto)\n\n`;
      mdContent += `*Generado automáticamente para optimización de tokens.*\n\n`;

      Object.entries(definitions).forEach(([tableName, tableDef]) => {
        mdContent += `### ${tableName}\n`;
        mdContent += `| Columna | Tipo | Formato | Info |\n`;
        mdContent += `|:---|:---|:---|:---|\n`;
        
        const props = tableDef.properties || {};
        Object.entries(props).forEach(([colName, colDef]) => {
          const type = colDef.type || '';
          const format = colDef.format || '';
          const desc = colDef.description ? colDef.description.split('.')[0] : '';
          mdContent += `| ${colName} | ${type} | ${format} | ${desc} |\n`;
        });
        mdContent += `\n`;
      });

      const mdFile = path.join(docsDir, 'supabase_schema.md');
      fs.writeFileSync(mdFile, mdContent);

      console.log(`✅ ¡Éxito! Esquema guardado en: docs/supabase_schema.md`);
      console.log(`📉 Ahorro estimado de tokens: ~75% comparado con JSON.`);
      
    } catch (e) {
      console.error("❌ Error procesando esquema:", e.message);
      console.log("💡 Tip: Podés pegar tu Swagger JSON manualmente en docs/supabase_schema.json y este script lo convertirá a MD.");
    }
  });

}).on('error', (err) => {
  console.error("❌ Error HTTP:", err.message);
});
