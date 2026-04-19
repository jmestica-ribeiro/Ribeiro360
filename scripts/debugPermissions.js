import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const userEmail = process.argv[2];
const cursoId = process.argv[3];

if (!userEmail || !cursoId) {
  console.error("❌ Uso: npm run debug:permissions <email_usuario> <curso_id>");
  process.exit(1);
}

// Simulador de la lógica de visibilidad.js
function visMatchesProfile(rules, profile) {
  if (!rules || rules.length === 0) return { passed: true, reason: 'Sin reglas (Visible global)' };
  
  for (let r of rules) {
    const v = profile[r.campo];
    if (!v || v.toLowerCase() !== r.valor.toLowerCase()) {
      return { passed: false, reason: `Regla fallida: Requiere [${r.campo} = ${r.valor}]. El usuario tiene [${v || 'nulo'}]` };
    }
  }
  return { passed: true, reason: 'Cumple todas las reglas' };
}

async function debugPermissions() {
  console.log(`🔍 Analizando visibilidad para: ${userEmail} en el curso: ${cursoId}`);

  // 1. Obtener perfil
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').eq('email', userEmail);
  if (pErr || !profiles || profiles.length === 0) {
    console.error(`❌ Error: No se encontró al usuario ${userEmail}.`);
    return;
  }
  const user = profiles[0];
  console.log(`✅ Perfil encontrado: ${user.full_name} | Puesto: ${user.job_title} | Depto: ${user.department}`);

  // 2. Verificar destinatarios directos (cursos_destinatarios)
  const { data: dest } = await supabase.from('cursos_destinatarios').select('*').eq('curso_id', cursoId).eq('user_id', user.id);
  if (dest && dest.length > 0) {
    console.log(`✅ Resultado: VISIBLE. El usuario está asignado como DESTINATARIO DIRECTO del curso.`);
    return;
  }

  // 3. Verificar reglas matriciales (cursos_visibilidad)
  const { data: rules } = await supabase.from('cursos_visibilidad').select('*').eq('curso_id', cursoId);
  console.log(`\n📄 Reglas del curso:`, rules && rules.length > 0 ? rules : 'Ninguna (Aplica a todos)');
  
  const result = visMatchesProfile(rules, user);
  
  if (result.passed) {
    console.log(`✅ Resultado: VISIBLE. (${result.reason})`);
  } else {
    console.log(`⛔ Resultado: OCULTO. (${result.reason})`);
  }
}

debugPermissions();
