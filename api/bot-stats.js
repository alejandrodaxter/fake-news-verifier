import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId requerido' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Fecha de hoy a las 00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // HISTÓRICO PERSONAL (por chatId como user_ip)
    const { data: myVerifications, error } = await supabase
      .from('verifications')
      .select('level')
      .eq('user_ip', `telegram_${chatId}`);

// 🆕 AGREGAR ESTO
console.log('🔍 Buscando chatId:', chatId);
console.log('🔍 Buscando user_ip:', `telegram_${chatId}`);
console.log('📊 Data:', myVerifications);
console.log('❌ Error:', error);
console.log('📊 Verificaciones encontradas:', myVerifications?.length);

    const totalHistorico = myVerifications?.length || 0;
    const confiablesHistorico = myVerifications?.filter(v => v.level === 'ok').length || 0;
    const dudosasHistorico = myVerifications?.filter(v => v.level === 'warn').length || 0;
    const falsasHistorico = myVerifications?.filter(v => v.level === 'bad').length || 0;

    // HOY PERSONAL
    const { data: todayVerifications } = await supabase
      .from('verifications')
      .select('level')
      .eq('user_ip', `telegram_${chatId}`)
      .gte('created_at', today.toISOString());

    const totalHoy = todayVerifications?.length || 0;
    const confiablesHoy = todayVerifications?.filter(v => v.level === 'ok').length || 0;
    const dudosasHoy = todayVerifications?.filter(v => v.level === 'warn').length || 0;
    const falsasHoy = todayVerifications?.filter(v => v.level === 'bad').length || 0;

    return res.status(200).json({
      totalHistorico,
      confiablesHistorico,
      dudosasHistorico,
      falsasHistorico,
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
      totalHoy: 0,
      confiablesHoy: 0,
      dudosasHoy: 0,
      falsasHoy: 0
    });
  }
}