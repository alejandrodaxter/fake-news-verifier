import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL no proporcionada' });
    }

    // Inicializar Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Contar reportes para esta URL
    const { count, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('url', url);

    if (error) {
      console.error('Error al obtener reportes:', error);
      return res.status(500).json({ error: 'Error al obtener reportes' });
    }

    return res.status(200).json({
      url: url,
      reports: count || 0
    });

  } catch (error) {
    console.error('Error en /api/get-reports:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}