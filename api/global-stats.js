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

    // TOTAL GLOBAL de URLs ÚNICAS verificadas
const { data: uniqueUrls } = await supabase
  .from('verifications')
  .select('url');

   // Contar URLs únicas
   const totalGlobal = new Set(uniqueUrls?.map(v => v.url) || []).size;;

   // 🆕 TOTAL de reportes
    const { count: totalReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      totalGlobal: totalGlobal || 0,
      totalReports: totalReports || 0  // 🆕
    });

  } catch (error) {
    console.error('Error en /api/global-stats:', error);
    return res.status(500).json({
      error: error.message,
      totalGlobal: 0,
      totalReports: 0
    });
  }
}