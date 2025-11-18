export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
   if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL no proporcionada" });
  }

  // ===== CONSTANTES DE SEGURIDAD =====
  const TRUSTED = [
    "bbc.com","nytimes.com","elpais.com","reuters.com","apnews.com",
    "dw.com","eltiempo.com","elespectador.com","semana.com","theguardian.com",
    "washingtonpost.com","lemonde.fr","aljazeera.com","infobae.com",
    "rcnradio.com","caracol.com.co","noticias.caracoltv.com","lasillavacia.com",
    "elcolombiano.com","portafolio.co"
  ];

  const RISKY_TLDS = [".xyz",".click",".buzz",".top",".loan",".info",".club",".work",".tk",".gq",".ml"];
  
  const SHORTENERS = ["bit.ly","t.co","tinyurl.com","goo.gl","ow.ly","is.gd","buff.ly","rb.gy"];
  
  const CLICKBAIT = [
    /increíble/i, /no lo (vas|vas a) creer/i, /impactante/i, /urgente/i, /secreto/i,
    /escándalo/i, /polémica/i, /imperdible/i, /así fue/i, /lo que nadie/i
  ];

  const LOOKALIKES = [
    { legit: "nytimes.com", fake: /nytimes\.(co|cn|tk|ml)$/i },
    { legit: "bbc.com", fake: /bbc\.(co|cn|tk|ml)$/i },
    { legit: "reuters.com", fake: /reuters\.(co|cn|tk|ml)$/i },
    { legit: "eltiempo.com", fake: /eltiempo\.(co|cn|tk|ml)$/i }
  ];

  // ===== FUNCIONES DE ANÁLISIS =====
  function parseUrl(input) {
    try {
      const u = new URL(input);
      const hostname = u.hostname.replace(/^www\./, "");
      const protocol = u.protocol;
      const path = decodeURIComponent(u.pathname + u.search);
      const parts = hostname.split(".");
      const tld = "." + parts[parts.length - 1];
      const subdomains = parts.length > 2 ? parts.slice(0, parts.length - 2) : [];
      return { ok: true, hostname, protocol, path, tld, subdomains, url: u.toString() };
    } catch {
      return { ok: false };
    }
  }

 // ===== ANÁLISIS DE CONTENIDO (solo título/URL) =====
function analyzeText(title, url) {
  const penalties = [];
  let contentScore = 0;
  
  const text = (title + ' ' + url).toLowerCase();
  
  // 1. MAYÚSCULAS EXCESIVAS en título
  const upperCaseCount = (title.match(/[A-Z]/g) || []).length;
  if (upperCaseCount > title.length * 0.4) {
    contentScore -= 15;
    penalties.push('⚠️ Título con mayúsculas excesivas');
  }
  
  // 2. SIGNOS DE EXCLAMACIÓN MÚLTIPLES
  if (/!!!+/.test(title)) {
    contentScore -= 10;
    penalties.push('⚠️ Múltiples signos de exclamación');
  }
  
  // 3. PALABRAS SENSACIONALISTAS
  const sensationalWords = [
    'impactante', 'increíble', 'shock', 'viral', 'no creerás',
    'urgente', 'última hora', 'bomba', 'escándalo', 'milagroso',
    'terrible', 'devastador', 'aterrador', 'exclusivo'
  ];
  
  let sensationalCount = 0;
  sensationalWords.forEach(word => {
    if (text.includes(word)) sensationalCount++;
  });
  
  if (sensationalCount >= 3) {
    contentScore -= 20;
    penalties.push('❌ Lenguaje sensacionalista excesivo');
  } else if (sensationalCount >= 2) {
    contentScore -= 10;
    penalties.push('⚠️ Lenguaje emocional detectado');
  }
  
  // 4. NÚMEROS EXAGERADOS sin contexto
  const bigNumbers = text.match(/\d{5,}/g); // 5+ dígitos
  if (bigNumbers && bigNumbers.length >= 2) {
    contentScore -= 8;
    penalties.push('⚠️ Cifras grandes sin contexto');
  }
  
  // 5. PALABRAS TODO EN MAYÚSCULAS
  const allCapsWords = title.match(/\b[A-Z]{3,}\b/g);
  if (allCapsWords && allCapsWords.length >= 2) {
    contentScore -= 12;
    penalties.push('⚠️ Palabras completas en mayúsculas');
  }
  
  return { contentScore, penalties };
}

// ===== VERIFICAR RIESGO DEL DOMINIO =====
async function checkDomainRisk(hostname) {
  try {
    // Resolver IP del dominio
    const dnsUrl = `https://dns.google/resolve?name=${hostname}&type=A`;
    const dnsResponse = await fetch(dnsUrl, { timeout: 3000 });
    const dnsData = await dnsResponse.json();
    
    if (!dnsData.Answer || dnsData.Answer.length === 0) {
      return { score: 0, penalties: [] };
    }
    
    const ip = dnsData.Answer[0].data;
    
    // Verificar información del IP
    const ipUrl = `https://ipapi.co/${ip}/json/`;
    const ipResponse = await fetch(ipUrl, { timeout: 3000 });
    const ipData = await ipResponse.json();
    
    let score = 0;
    const penalties = [];
    
    // Verificar país sospechoso
    const suspiciousCountries = ['CN', 'RU', 'KP', 'IR'];
    if (suspiciousCountries.includes(ipData.country_code)) {
      score -= 15;
      penalties.push(`⚠️ Servidor en ${ipData.country_name} (ubicación inusual)`);
    }
    
    // Verificar hosting profesional
    if (ipData.org) {
      const org = ipData.org.toLowerCase();
      if (org.includes('cloudflare') || org.includes('google') || org.includes('amazon') || org.includes('microsoft')) {
        score += 5;
        penalties.push('✅ Hosting profesional detectado');
      }
    }
    
    return { score, penalties };
    
  } catch (error) {
    console.log('No se pudo verificar dominio:', error.message);
    return { score: 0, penalties: [] };
  }
}

  function evaluate(input) {
    const p = parseUrl(input);
    const reasons = [];
    let score = 50;

    if (!p.ok) {
      return { score: 0, level: "bad", message: "URL inválida. Revisa el formato.", reasons };
    }

    const { hostname, protocol, path, tld, subdomains } = p;

    // ✅ Lista blanca (medios confiables)
    if (TRUSTED.some(domain => hostname === domain || hostname.endsWith("." + domain))) {
      score += 35;
      reasons.push("✅ Dominio en lista de medios confiables");
    } else {
      score -= 10;
      reasons.push("⚠️ Dominio fuera de la lista confiable definida");
    }

    // 🔒 HTTPS
    if (protocol === "https:") {
      score += 10;
      reasons.push("🔒 Conexión segura (HTTPS)");
    } else {
      score -= 15;
      reasons.push("❌ Conexión no segura (HTTP)");
    }

    // ⚠️ TLD riesgoso
    if (RISKY_TLDS.includes(tld)) {
      score -= 20;
      reasons.push(`⚠️ TLD potencialmente riesgoso (${tld})`);
    }

    // 🔗 Acortadores
    if (SHORTENERS.includes(hostname)) {
      score -= 10;
      reasons.push("⚠️ Acortador de URL: requiere expandir y verificar el destino");
    }

    // 🎭 Typosquatting (dominios falsos)
    LOOKALIKES.forEach(({ legit, fake }) => {
      if (fake.test(hostname)) {
        score -= 25;
        reasons.push(`❌ Dominio similar a ${legit} (posible suplantación)`);
      }
    });

    // 🌐 Subdominios excesivos
    if (subdomains.length >= 2) {
      score -= 8;
      reasons.push("⚠️ Varios subdominios: revisa si es sitio oficial");
    }

    // 📊 Parámetros y tracking
    const paramCount = (path.match(/[?&][^=&]+=/g) || []).length;
    if (paramCount >= 4) {
      score -= 10;
      reasons.push("⚠️ Demasiados parámetros en la URL");
    }
    if (/utm_/i.test(path) || /ref=/i.test(path)) {
      score -= 5;
      reasons.push("⚠️ Señales de tracking/marketing en la URL");
    }

    // 📏 Longitud del slug
    const slugLen = path.replace(/^\//, "").length;
    if (slugLen > 180) {
      score -= 8;
      reasons.push("⚠️ Ruta muy larga y críptica");
    }

    // 🎣 Clickbait en la ruta
    const clicks = CLICKBAIT.filter(r => r.test(path));
    if (clicks.length > 0) {
      score -= 20;
      reasons.push("❌ Patrón de clickbait detectado en el slug");
    }

    // Análisis de contenido del título
    const titleAnalysis = analyzeText(path, p.url);
    score += titleAnalysis.contentScore;
    reasons.push(...titleAnalysis.penalties);

// Normalizar score (0-100)
score = Math.max(0, Math.min(100, score));

    // Determinar nivel y mensaje
    let message, level;
    if (score >= 70) {
      message = "Confiable: señales positivas predominan. Verifica el contenido igualmente.";
      level = "ok";
    } else if (score >= 40) {
      message = "Precaución: mezcla de señales. Busca corroboración adicional.";
      level = "warn";
    } else {
      message = "Riesgo: varias señales de baja confiabilidad.";
      level = "bad";
    }

    return { score, level, message, reasons, hostname };
  }

  // Evaluar la URL
const result = evaluate(url);

// Verificar riesgo del dominio por IP
const domainRisk = await checkDomainRisk(result.hostname);
result.score += domainRisk.score;
result.reasons.push(...domainRisk.penalties);

// Re-normalizar score
result.score = Math.max(0, Math.min(100, result.score));

// Re-evaluar level según nuevo score
if (result.score >= 70) {
  result.level = "ok";
} else if (result.score >= 40) {
  result.level = "warn";
} else {
  result.level = "bad";
}

  // ===== EXTRAER QUERY PARA APIs =====
  let query = "";
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    query = parts[parts.length - 1] || urlObj.hostname;
    // Limpiar el query (quitar extensiones, guiones)
    query = query.replace(/\.html?$/i, "").replace(/-/g, " ").substring(0, 50);
  } catch (e) {
    console.error("No se pudo extraer keyword:", e);
    query = result.hostname;
  }

  // Intentar obtener el título de la página (opcional, puede fallar por CORS)
  try {
    const page = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000 
    });
    const html = await page.text();
    const match = html.match(/<title>(.*?)<\/title>/i);
    if (match && match[1]) {
      query = match[1].substring(0, 100); // Limitar longitud
    }
  } catch (err) {
    console.log("No se pudo extraer título (normal si hay CORS):", err.message);
  }

  // Codificar query
  query = encodeURIComponent(query);

  // ===== GOOGLE FACT CHECK API =====
  let factChecks = [];
  const googleApiKey = process.env.GOOGLE_FACTCHECK_KEY;
  
  if (googleApiKey) {
    try {
      const apiUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${query}&key=${googleApiKey}`;
      const responseApi = await fetch(apiUrl);
      const factData = await responseApi.json();
      
      if (factData.claims && factData.claims.length > 0) {
        factChecks = factData.claims.slice(0, 5).map(c => ({
          text: c.text,
          claimReview: c.claimReview
        }));
      }
    } catch (err) {
      console.error("Error consultando Google Fact Check API:", err);
    }
  }

  // ===== NEWSAPI =====
  let corroborations = [];
  const newsApiKey = process.env.NEWSAPI_KEY;
  
  if (newsApiKey) {
    try {
      const newsUrl = `https://newsapi.org/v2/everything?q=${query}&language=es&sortBy=publishedAt&pageSize=10&apiKey=${newsApiKey}`;
      const respNews = await fetch(newsUrl);
      const newsData = await respNews.json();

      if (newsData.articles && newsData.articles.length > 0) {
        corroborations = newsData.articles
          .filter(a => a.url && TRUSTED.some(domain => a.url.includes(domain)))
          .slice(0, 5)
          .map(a => ({
            source: a.source.name,
            title: a.title,
            url: a.url,
            publishedAt: a.publishedAt
          }));
      }
    } catch (err) {
      console.error("Error consultando NewsAPI:", err);
    }
  }

  // 🆕 Guardar verificación en Supabase
try {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const userIp = req.body.userIp ||
                 req.headers['x-forwarded-for']?.split(',')[0] || 
                 req.headers['x-real-ip'] || 
                 'unknown';
  
  await supabase.from('verifications').insert([{
    url: url,
    result: result.level,
    user_ip: userIp
  }]);
} catch (error) {
  console.error('Error guardando verificación:', error);
  // No fallar la request si esto falla
}

  // ===== RESPUESTA FINAL =====
  return res.status(200).json({
    ...result,
    factChecks: factChecks,
    corroborations: corroborations,
    searchQuery: decodeURIComponent(query)
  });
}