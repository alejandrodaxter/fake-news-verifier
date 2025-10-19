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

    let message;
    if (score >= 60) {
      message = "Puedes disfrutar de esta noticia sin problemas.";
    } else if (score >= 35) {
      message = "Recomendamos indagar más en la página. Aquí tienes algunas fuentes confiables.";
    } else {
      message = "Aléjate de esta página. Mejor consulta estas fuentes recomendadas.";
    }

    return { score, message, reasons };
  }

const result = evaluate(url);

// 🔹 Llamada a la API de Google Fact Check Tools
const query = encodeURIComponent(url);
const apiKey = process.env.GOOGLE_FACTCHECK_KEY;
const apiUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${query}&key=${apiKey}`;

const responseApi = await fetch(apiUrl);
const factData = await responseApi.json();

// Normalizar resultados
const factChecks = (factData.claims || []).map(c => ({
  text: c.text,
  claimReview: c.claimReview
}));

// Combinar tu evaluación local con los fact-checks reales
return res.status(200).json({
  ...result,
  factChecks
});
}