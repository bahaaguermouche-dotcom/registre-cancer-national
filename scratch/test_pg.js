const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://backend_admin:SupabaseAdmin123!@db.lzjzmegvxhkdysozxkmq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('Connected successfully:', res.rows[0]);
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.end();
  }
}

testConnection();
