import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const featureName = process.argv[2];

if (!featureName) {
  console.error("❌ Error: Debes especificar el nombre de la feature. Ej: npm run scaffold:feature eventos");
  process.exit(1);
}

// Helpers formatters
const toCamelCase = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
const toPascalCase = (str) => str.charAt(0).toUpperCase() + toCamelCase(str.slice(1));
const camelName = toCamelCase(featureName);
const pascalName = toPascalCase(featureName);

// Rutas
const projectRoot = path.join(__dirname, '..');
const featureDir = path.join(projectRoot, 'src', 'features', featureName);
const servicePath = path.join(projectRoot, 'src', 'services', `${camelName}Service.js`);

// Crear directorio de la feature
if (!fs.existsSync(featureDir)) {
  fs.mkdirSync(featureDir, { recursive: true });
}

// 1. Crear Componente JSX
const jsxContent = `import React, { useEffect, useState } from 'react';
import { LoadingSpinner, PageLoader, EmptyState } from '../../components/common';
import { fetch${pascalName} } from '../../services/${camelName}Service';
import './${pascalName}.css';

export default function ${pascalName}() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: res, error } = await fetch${pascalName}();
    if (!error) setData(res);
    setLoading(false);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="${featureName}-container">
      <header className="${featureName}-header">
        <h2>${pascalName}</h2>
      </header>
      
      <main className="${featureName}-content">
        {data.length === 0 ? (
          <EmptyState message="No hay datos registrados aún." />
        ) : (
          <div className="${featureName}-grid">
            {/* Iterar sobre data */}
          </div>
        )}
      </main>
    </div>
  );
}
`;

fs.writeFileSync(path.join(featureDir, `${pascalName}.jsx`), jsxContent);

// 2. Crear CSS
const cssContent = `.${featureName}-container {
  padding: 24px;
  background: var(--bg-main);
  min-height: 100vh;
}

.${featureName}-header {
  margin-bottom: 32px;
}

.${featureName}-header h2 {
  color: var(--text-main);
  font-size: 24px;
}

.${featureName}-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
`;

fs.writeFileSync(path.join(featureDir, `${pascalName}.css`), cssContent);

// 3. Crear Servicio Base
const serviceContent = `import { supabase } from '../lib/supabase';

export async function fetch${pascalName}() {
  const { data, error } = await supabase
    .from('${featureName}') // AVISO: Actualizar con nombre de tabla real
    .select('*');
    
  if (error) console.error('[${camelName}Service] fetch${pascalName}:', error.message);
  return { data: data ?? [], error };
}

export async function save${pascalName}(payload) {
  const { id, ...fields } = payload;
  const query = id
    ? supabase.from('${featureName}').update(fields).eq('id', id).select()
    : supabase.from('${featureName}').insert(fields).select();

  const { data, error } = await query;
  if (error) console.error('[${camelName}Service] save${pascalName}:', error.message);
  return { data, error };
}

export async function delete${pascalName}(id) {
  const { error } = await supabase.from('${featureName}').delete().eq('id', id);
  if (error) console.error('[${camelName}Service] delete${pascalName}:', error.message);
  return { error };
}
`;

if (!fs.existsSync(servicePath)) {
  fs.writeFileSync(servicePath, serviceContent);
} else {
  console.log(`⚠️  Aviso: el servicio ${camelName}Service.js ya existía. No se sobreescribió.`);
}

console.log(`✅ ¡Módulo ${pascalName} andamiado con éxito!`);
console.log(`📁 Rutas creadas:`);
console.log(`  - src/features/${featureName}/${pascalName}.jsx`);
console.log(`  - src/features/${featureName}/${pascalName}.css`);
console.log(`  - src/services/${camelName}Service.js`);
