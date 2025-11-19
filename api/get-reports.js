import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: allReports, error } = await supabase
      .from('reports')
      .select('url, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const urlCounts = {};
    allReports.forEach(report => {
      if (!urlCounts[report.url]) {
        urlCounts[report.url] = {
          url: report.url,
          count: 0,
          last_reported: report.created_at
        };
      }
      urlCounts[report.url].count++;
      
      if (new Date(report.created_at) > new Date(urlCounts[report.url].last_reported)) {
        urlCounts[report.url].last_reported = report.created_at;
      }
    });

    const reports = Object.values(urlCounts).sort((a, b) => b.count - a.count);

    return res.status(200).json({
      totalReports: allReports.length,
      uniqueUrls: reports.length,
      reports: reports
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}