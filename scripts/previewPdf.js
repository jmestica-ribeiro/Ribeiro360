import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generador genérico en HTML para simular la vista print() sin prender React.
const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Simulador de PDF SGI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #525659; padding: 40px; display: flex; justify-content: center; }
    .page { background: #fff; width: 210mm; min-height: 297mm; padding: 12mm; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
    .header { border-bottom: 3px solid #111827; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; font-weight: 800; color: #111827; }
    .header-sub { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
    .section { margin: 20px 0 12px; border-bottom: 2px solid #f2dc00; padding-bottom: 6px; display: flex; align-items: center; gap: 10px; }
    .circle { width: 24px; height: 24px; border-radius: 50%; background: #f2dc00; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
    .title { font-size: 13px; font-weight: 700; color: #111827; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-sub">Informe de Hallazgo (SIMULACIÓN PREVIEW)</div>
      <h1>NC-Mock-2026</h1>
    </div>
    
    <div class="section">
      <div class="circle">1</div>
      <div class="title">Registro del Hallazgo</div>
    </div>
    <p style="font-size: 12px; color: #6b7280;">Este documento es un renderizado HTML simulando las métricas de impresión A4 del PDF que arroja NCInformePDF.jsx de SGI. Utilizado por agentes IA para validar proporciones sin render engine.</p>
  </div>
</body>
</html>`;

const outputDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const filePath = path.join(outputDir, 'pdf_preview.html');
fs.writeFileSync(filePath, htmlTemplate);

console.log(`✅ Visor PDF generado iterativamente en: ${filePath}`);
console.log(`🤖 Agente: podés usar el visor web y abrir file://${filePath.replace(/\\/g, '/')} para confirmar cómo se renderiza el PDF A4.`);
