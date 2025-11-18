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

    // Total de verificaciones HOY
    const { data: todayVerifications } = await supabase
      .from('verifications')
      .select('level')
      .gte('created_at', today.toISOString());

    const total = todayVerifications?.length || 0;
    const confiables = todayVerifications?.filter(v => v.level === 'ok').length || 0;
    const dudosas = todayVerifications?.filter(v => v.level === 'warn').length || 0;
    const falsas = todayVerifications?.filter(v => v.level === 'danger').length || 0;

    return res.status(200).json({
      today: total,
      confiables: confiables,
      dudosas: dudosas,
      falsas: falsas
    });

  } catch (error) {
    console.error('Error en /api/bot-stats:', error);
    return res.status(200).json({
      today: 0,
      confiables: 0,
      dudosas: 0,
      falsas: 0
    });
  }
}