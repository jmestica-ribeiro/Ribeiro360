import fs from 'fs';

try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  let url = '';
  let key = '';

  envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
  });

  async function test() {
    try {
      const res = await fetch(`${url}/rest/v1/sgi_versiones?select=*&order=created_at.desc`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      const data = await res.json();
      console.log('GET created_at sort response:', data.length !== undefined ? `Success, rows: ${data.length}` : data);
    } catch(err) {
      console.error(err);
    }

    try {
      const res2 = await fetch(`${url}/rest/v1/sgi_versiones?select=*&order=id.desc`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      const data2 = await res2.json();
      console.log('GET id sort response:', data2.length !== undefined ? `Success, rows: ${data2.length}` : data2);
    } catch(err) {
      console.error(err);
    }
  }

  test();
} catch (e) {
  console.error("Error running script:", e);
}
