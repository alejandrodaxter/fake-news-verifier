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

  // 🆕 Inicializar Supabase AL INICIO
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // ===== CONSTANTES DE SEGURIDAD =====
  const TRUSTED = [
    "bbc.com","nytimes.com","elpais.com","reuters.com","apnews.com",
    "dw.com","eltiempo.com","elespectador.com","semana.com","theguardian.com",
    "washingtonpost.com","lemonde.fr","aljazeera.com","infobae.com",
    "rcnradio.com","caracol.com.co","noticias.caracoltv.com","lasillavacia.com",
    "elcolombiano.com","portafolio.co"
  ];

  const RISKY_TLDS = [".xyz",".click",".buzz",".top",".loan",".info",".club",".work",".tk",".gq",".ml"];
  
  const SHORTENERS = ["bit.ly","t.co","tinyurl.com","goo.gl","ow.ly","is.gd","buff.ly","rb.gy","n9.cl","cutt.ly","short.io","tiny.cc"];
  
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

  // ===== FUNCIÓN PARA EXPANDIR URLs ACORTADAS =====
  async function expandShortUrl(shortUrl) {
    try {
      const unshortenToken = process.env.UNSHORTEN_API_TOKEN;
      
      if (!unshortenToken) {
        console.log('UNSHORTEN_API_TOKEN no configurado');
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const apiUrl = `https://unshorten.me/api/v2/unshorten?url=${encodeURIComponent(shortUrl)}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${unshortenToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('Unshorten API error:', response.status);
        return null;
      }

      const data = await response.json();
      
      // La respuesta tiene la URL expandida en diferentes campos según la API
      const expandedUrl = data.unshortened_url || data.resolved_url || data.url;
      
      return expandedUrl || null;
      
    } catch (error) {
      console.log('Error expandiendo URL:', error.message);
      return null;
    }
  }

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
    penalties.push('⚠️ Título con mayúsculas excesivas: estilo sensacionalista');
  }
  
  // 2. SIGNOS DE EXCLAMACIÓN MÚLTIPLES
  if (/!!!+/.test(title)) {
    contentScore -= 10;
    penalties.push('⚠️ Múltiples signos de exclamación: técnica de clickbait');
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
    penalties.push('❌ Múltiples palabras de clickbait: "impactante", "increíble", "urgente", etc.');
  } else if (sensationalCount >= 2) {
    contentScore -= 10;
    penalties.push('⚠️ Título sensacionalista: usa palabras emocionales para atraer clicks');
  }
  
  // 4. NÚMEROS EXAGERADOS sin contexto
  const bigNumbers = text.match(/\d{5,}/g); // 5+ dígitos
  if (bigNumbers && bigNumbers.length >= 2) {
    contentScore -= 8;
    penalties.push('⚠️ Título con números exagerados: técnica común de clickbait para llamar tu atención');
  }
  
  // 5. PALABRAS TODO EN MAYÚSCULAS
  const allCapsWords = title.match(/\b[A-Z]{3,}\b/g);
  if (allCapsWords && allCapsWords.length >= 2) {
    contentScore -= 12;
    penalties.push('⚠️ TEXTO EN MAYÚSCULAS: estilo sensacionalista usado para generar clicks');
  }
  
  return { contentScore, penalties };
}

// ===== VERIFICAR RIESGO DEL DOMINIO =====
async function checkDomainRisk(hostname) {
  try {
    // TIMEOUT DE 3 SEGUNDOS
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Resolver IP del dominio
    const dnsUrl = `https://dns.google/resolve?name=${hostname}&type=A`;
    const dnsResponse = await fetch(dnsUrl, { signal: controller.signal });
    
    clearTimeout(timeoutId);
    
    const dnsData = await dnsResponse.json();
    
    if (!dnsData.Answer || dnsData.Answer.length === 0) {
      return { score: 0, penalties: [] };
    }
    
    const ip = dnsData.Answer[0].data;
    
    // Verificar información del IP (con otro timeout)
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
    
    const ipUrl = `https://ipapi.co/${ip}/json/`;
    const ipResponse = await fetch(ipUrl, { signal: controller2.signal });
    
    clearTimeout(timeoutId2);
    
    const ipData = await ipResponse.json();
    
    let score = 0;
    const penalties = [];
    
    // Verificar país sospechoso
    const suspiciousCountries = ['CN', 'RU', 'KP', 'IR'];
    if (suspiciousCountries.includes(ipData.country_code)) {
      score -= 15;
      penalties.push(`⚠️ Servidor en ${ipData.country_name}: ubicación inusual para medios locales`);
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
    // Si hay timeout o error, falla silenciosamente
    console.log('checkDomainRisk timeout o error:', error.message);
    return { score: 0, penalties: [] };
  }
}

  async function evaluate(input, supabase, url) {
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
      reasons.push("⚠️ Medio no verificado: no está en nuestra lista de fuentes confiables reconocidas");
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
      const expandedUrl = await expandShortUrl(input);
      
      if (expandedUrl && expandedUrl !== input) {
        score -= 10;
        reasons.push(`⚠️ URL acortada (${hostname}). Destino real: ${expandedUrl}`);
      } else {
        score -= 10;
        reasons.push(`⚠️ Acortador de URL (${hostname}): oculta el destino real, verifica antes de hacer click`);
      }
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
      reasons.push("⚠️ URL con subdominios sospechosos: verifica que sea el sitio oficial y no una copia falsa");
    }

    // 📊 Parámetros y tracking
    const paramCount = (path.match(/[?&][^=&]+=/g) || []).length;
    if (paramCount >= 4) {
      score -= 10;
      reasons.push("⚠️ URL con múltiples rastreadores: puede estar recopilando información sobre ti");
    }
    if (/utm_/i.test(path) || /ref=/i.test(path)) {
      score -= 5;
      reasons.push("⚠️ URL de marketing: puede redirigir a sitios de publicidad o recolectar tus datos");
    }

    // 📏 Longitud del slug
    const slugLen = path.replace(/^\//, "").length;
    if (slugLen > 180) {
      score -= 8;
      reasons.push("⚠️ URL inusualmente larga: posible intento de ocultar el destino real");
    }

    // 🎣 Clickbait en la ruta
    const clicks = CLICKBAIT.filter(r => r.test(path));
    if (clicks.length > 0) {
      score -= 20;
      reasons.push("❌ Patrón de clickbait detectado en el título");
    }

    // Análisis de contenido del título
    const titleAnalysis = analyzeText(path, p.url);
    score += titleAnalysis.contentScore;
    reasons.push(...titleAnalysis.penalties);

    // Verificar reportes comunitarios
    const { data: reportData } = await supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .eq('url', url);

    const reportCount = reportData?.length || 0;

    if (reportCount >= 2) {
      score -= 25;
      reasons.push(`❌ ${reportCount} usuarios reportaron esta noticia como falsa`);
    } else if (reportCount >= 1) {
      score -= 15;
      reasons.push(`🚨 ${reportCount} usuario${reportCount > 1 ? 's' : ''} reportó esta noticia como sospechosa`);
    }

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
  const result = await evaluate(url, supabase, url);

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

  // Guardar verificación en Supabase
  try {
    const userIp = req.body.userIp ||
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   'unknown';
    console.log('💾 Guardando con user_ip:', userIp);
    
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
    searchQuery: decodeURIComponent(query)
  });
}