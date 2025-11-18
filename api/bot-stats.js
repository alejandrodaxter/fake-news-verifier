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

    // Fecha de hoy a las 00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // TOTALES GLOBALES (todos los usuarios)
    const { data: allVerifications } = await supabase
      .from('verifications')
      .select('level');

    const totalHistorico = allVerifications?.length || 0;
    const confiablesHistorico = allVerifications?.filter(v => v.level === 'ok').length || 0;
    const dudosasHistorico = allVerifications?.filter(v => v.level === 'warn').length || 0;
    const falsasHistorico = allVerifications?.filter(v => v.level === 'danger').length || 0;

    // HOY GLOBALES
    const { data: todayVerifications } = await supabase
      .from('verifications')
      .select('level')
      .gte('created_at', today.toISOString());

    const totalHoy = todayVerifications?.length || 0;
    const confiablesHoy = todayVerifications?.filter(v => v.level === 'ok').length || 0;
    const dudosasHoy = todayVerifications?.filter(v => v.level === 'warn').length || 0;
    const falsasHoy = todayVerifications?.filter(v => v.level === 'danger').length || 0;

    // Usuarios únicos (globales)
    const uniqueIPs = allVerifications 
      ? new Set(allVerifications.map(v => v.user_ip)).size 
      : 0;

    // Total reportes globales
    const { count: totalReportes } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      // Histórico global
      totalHistorico,
      confiablesHistorico,
      dudosasHistorico,
      falsasHistorico,
      usuariosUnicos: uniqueIPs,
      reportesGlobales: totalReportes || 0,
      // Hoy global
      totalHoy,
      confiablesHoy,
      dudosasHoy,
      falsasHoy
    });

  } catch (error) {
    console.error('Error en /api/bot-stats:', error);
    return res.status(200).json({
      totalHistorico: 0,
      confiablesHistorico: 0,
      dudosasHistorico: 0,
      falsasHistorico: 0,
      usuariosUnicos: 0,
      reportesGlobales: 0,
      totalHoy: 0,
      confiablesHoy: 0,
      dudosasHoy: 0,
      falsasHoy: 0
    });
  }
}