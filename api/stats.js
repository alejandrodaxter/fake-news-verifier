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

    // Total de verificaciones
    const { count: totalVerificaciones } = await supabase
      .from('verifications')
      .select('*', { count: 'exact', head: true });

    // Total de reportes
    const { count: totalReportes } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    // Usuarios únicos (por IP)
    const { data: uniqueIPs } = await supabase
      .from('verifications')
      .select('user_ip');

    const usuariosUnicos = uniqueIPs 
      ? new Set(uniqueIPs.map(v => v.user_ip)).size 
      : 0;

    return res.status(200).json({
      totalVerificaciones: totalVerificaciones || 0,
      totalReportes: totalReportes || 0,
      usuariosActivos: usuariosUnicos || 0
    });

  } catch (error) {
    console.error('Error en /api/stats:', error);
    return res.status(200).json({
      totalVerificaciones: 0,
      totalReportes: 0,
      usuariosActivos: 0
    });
  }
}