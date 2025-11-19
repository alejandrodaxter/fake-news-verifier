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

    // TOTAL de URLs ÚNICAS verificadas
    const { data: uniqueUrls } = await supabase
      .from('verifications')
      .select('url');

    const totalGlobal = new Set(uniqueUrls?.map(v => v.url) || []).size;

    // TOTAL de usuarios únicos (IPs)
    const { data: uniqueIPs } = await supabase
      .from('verifications')
      .select('user_ip');

    const usuariosActivos = new Set(uniqueIPs?.map(v => v.user_ip) || []).size;

    // TOTAL de reportes
    const { count: totalReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      // Para index.html (app.js)
      totalVerificaciones: totalGlobal || 0,
      usuariosActivos: usuariosActivos || 0,
      totalReportes: totalReports || 0,
      // Para telegram.js
      totalGlobal: totalGlobal || 0,
      totalReports: totalReports || 0
    });

  } catch (error) {
    console.error('Error en /api/global-stats:', error);
    return res.status(500).json({
      error: error.message,
      totalVerificaciones: 0,
      usuariosActivos: 0,
      totalReportes: 0,
      totalGlobal: 0,
      totalReports: 0
    });
  }
}