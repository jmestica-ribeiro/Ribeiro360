import { createClient } from '@supabase/supabase-js';

// process.env se populará automáticamente usando "node --env-file=.env"
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Arrays de datos sintéticos
const TIPOS = ['Auditoría Externa', 'Auditoría Interna', 'Incidente Operativo', 'Reclamo Cliente', 'Desvío de Proceso'];
const ESTADOS = ['abierto', 'en_proceso', 'cerrado'];
const GERENCIAS = ['Comercial', 'Operaciones', 'Recursos Humanos', 'Sistemas', 'Logística', 'Finanzas'];
const DESCRIPCIONES = [
  "No se encontró el registro de control de stock al día.",
  "El matafuego estaba vencido en el depósito principal.",
  "Falta de capacitación registrada en el nuevo procedimiento del área.",
  "Software del servidor sin actualización de seguridad aplicada según norma.",
  "Diferencia de inventario en el sector de despachos.",
  "El empleado no utilizaba los Elementos de Protección Personal (EPP).",
  "Hubo un retraso mayor a 48hs en la respuesta al cliente corporativo."
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function runMock() {
  console.log("⏳ Iniciando inyección de Mock Data para módulos SGI...");

  // Obtenemos un emisor al azar para respetar las Foreign Keys si aplican
  const { data: perfiles } = await supabase.from('profiles').select('id').limit(10);
  const emisor_id = perfiles?.length > 0 ? randomChoice(perfiles).id : null;

  const mocks = [];
  const cantidad = 25; // Cantidad de reportes a generar

  for (let i = 0; i < cantidad; i++) {
    // Genera una fecha aleatoria en el último año
    const fechaRandom = new Date(Date.now() - Math.floor(Math.random() * 31536000000));
    const fechaString = fechaRandom.toISOString().split('T')[0];
    
    mocks.push({
      tipo: randomChoice(TIPOS),
      estado: randomChoice(ESTADOS),
      gerencia: randomChoice(GERENCIAS),
      paso_actual: Math.floor(Math.random() * 4) + 1,
      fecha: fechaString,
      descripcion: `[DATA MOCK BI] - ${randomChoice(DESCRIPCIONES)}`,
      numero: `NC-${fechaRandom.getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      emisor_id: emisor_id
    });
  }

  const { error } = await supabase.from('nc_hallazgos').insert(mocks);

  if (error) {
    console.error("❌ Error inyectando datos en Supabase:", error.message);
  } else {
    console.log(`✅ ¡Éxito! Se inyectaron ${cantidad} No Conformidades sintéticas listas para gráficos y vistas de SGI.`);
  }
}

runMock().catch(console.error);
