import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // TOTAL GLOBAL de verificaciones
    const { count: totalGlobal } = await supabase
      .from('verifications')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      totalGlobal: totalGlobal || 0
    });

  } catch (error) {
    console.error('Error en /api/global-stats:', error);
    return res.status(500).json({
      error: error.message,
      totalGlobal: 0
    });
  }
}