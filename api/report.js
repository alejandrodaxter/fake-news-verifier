import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
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
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL no proporcionada' });
    }

    // Inicializar Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Obtener IP del usuario (opcional)
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Guardar reporte
    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          url: url,
          user_ip: userIp
        }
      ]);

    if (error) {
      console.error('Error al guardar reporte:', error);
      return res.status(500).json({ error: 'Error al guardar reporte' });
    }

    // Contar total de reportes para esta URL
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('url', url);

    return res.status(200).json({
      success: true,
      message: 'Reporte guardado',
      totalReports: count || 1
    });

  } catch (error) {
    console.error('Error en /api/report:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}