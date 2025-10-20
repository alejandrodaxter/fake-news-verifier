export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { url } = req.body;

  // Importa tu función evaluate (puedes copiarla aquí o importarla de otro archivo)
  function parseUrl(input) {
    try {
      const u = new URL(input);
      const hostname = u.hostname.replace(/^www\./,"");
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

  function evaluate(input) {
    const p = parseUrl(input);
    const reasons = [];
    let score = 50;

    if (!p.ok) {
      return { score: 0, level: "bad", message: "URL inválida", reasons };
    }

    const { hostname, protocol } = p;

    if (hostname.endsWith("eltiempo.com") || hostname.endsWith("elespectador.com")) {
      score += 35;
      reasons.push("Dominio en lista confiable de Colombia.");
    } else {
      score -= 10;
      reasons.push("Dominio fuera de la lista confiable definida.");
    }

    if (protocol === "https:") {
      score += 10;
      reasons.push("Conexión segura (HTTPS).");
    } else {
      score -= 15;
      reasons.push("Conexión no segura (HTTP).");
    }

    score = Math.max(0, Math.min(100, score));

    let message, level;
    if (score >= 60) {
      message = "Puedes disfrutar de esta noticia sin problemas.";
      level = "ok";
    } else if (score >= 35) {
      message = "Recomendamos indagar más en la página. Aquí tienes algunas fuentes confiables.";
      level = "warn";
    } else {
      message = "Aléjate de esta página. Mejor consulta estas fuentes recomendadas.";
      level = "bad";
    }

    return { score,level, message, reasons };
  }

const result = evaluate(url);

// 🔹 Preparar query: intentamos usar el <title> de la página, si no, la URL
let query = encodeURIComponent(url); // fallback
try {
  const page = await fetch(url);
  const html = await page.text();
  const match = html.match(/<title>(.*?)<\/title>/i);
  if (match && match[1]) {
    query = encodeURIComponent(match[1]); // usamos el título si existe
  }
} catch (err) {
  console.error("No se pudo extraer título:", err);
}

const apiKey = process.env.GOOGLE_FACTCHECK_KEY;
const apiUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${query}&key=${apiKey}`;

let factChecks = [];
try {
  const responseApi = await fetch(apiUrl);
  const factData = await responseApi.json();
  factChecks = (factData.claims || []).map(c => ({
    text: c.text,
    claimReview: c.claimReview
  }));
} catch (err) {
  console.error("Error consultando la API de Google:", err);
}

// 🔹 Consulta NewsAPI para ver si la noticia aparece en medios confiables colombianos
let corroborations = [];
try {
  const newsUrl = `https://newsapi.org/v2/everything?q=${query}&language=es&apiKey=${process.env.NEWSAPI_KEY}`;
  const respNews = await fetch(newsUrl);
  const newsData = await respNews.json();

  const TRUSTED_CO = [
    "eltiempo.com",
    "elespectador.com",
    "semana.com",
    "rcnradio.com",
    "caracol.com.co",
    "noticias.caracoltv.com",
    "lasillavacia.com",
    "elcolombiano.com",
    "portafolio.co"
  ];

  corroborations = (newsData.articles || [])
    .filter(a => TRUSTED_CO.some(domain => a.url.includes(domain)))
    .map(a => ({
      source: a.source.name,
      title: a.title,
      url: a.url
    }));
} catch (err) {
  console.error("Error consultando NewsAPI:", err);
}

// Combinar tu evaluación local con los fact-checks reales y corroboraciones
return res.status(200).json({
  ...result,       // tu evaluación local
  factChecks,      // verificaciones de Google
  corroborations   // coincidencias en medios confiables colombianos
});
}