// Lista blanca de medios confiables (ajusta/expande según tu criterio)
const TRUSTED = [
  "bbc.com","nytimes.com","elpais.com","reuters.com","apnews.com",
  "dw.com","eltiempo.com","elespectador.com","semana.com","theguardian.com",
  "washingtonpost.com","lemonde.fr","aljazeera.com","infobae.com"
];

// TLD potencialmente riesgosos
const RISKY_TLDS = [".xyz",".click",".buzz",".top",".loan",".info",".club",".work",".tk",".gq",".ml"];

// Acortadores (lista gris: requieren expandir)
const SHORTENERS = ["bit.ly","t.co","tinyurl.com","goo.gl","ow.ly","is.gd","buff.ly","rb.gy"];

// Palabras/expresiones de clickbait comunes en el slug/ruta
const CLICKBAIT = [
  /incre[ií]ble/i,/no lo (vas|vas a) creer/i,/impactante/i,/urgente/i,/secreto/i,
  /esc[áa]ndalo/i,/pol[ée]mica/i,/imperdible/i,/as[ií] fue/i,/lo que nadie/i
];

// Confusiones de dominio (typosquatting básico)
const LOOKALIKES = [
  { legit: "nytimes.com", fake: /nytimes\.(co|cn|tk|ml)$/i },
  { legit: "bbc.com",     fake: /bbc\.(co|cn|tk|ml)$/i },
  { legit: "reuters.com", fake: /reuters\.(co|cn|tk|ml)$/i }
];

// Utilidad: extraer dominio y partes
function parseUrl(input) {
  try {
    const u = new URL(input);
    const hostname = u.hostname.replace(/^www\./,"");
    const protocol = u.protocol; // "https:" o "http:"
    const path = decodeURIComponent(u.pathname + u.search);
    const parts = hostname.split(".");
    const tld = "." + parts[parts.length - 1];
    const subdomains = parts.length > 2 ? parts.slice(0, parts.length - 2) : [];
    return { ok: true, hostname, protocol, path, tld, subdomains, url: u.toString() };
  } catch {
    return { ok: false };
  }
}

// Calcular score y razones
function evaluate(input) {
  const p = parseUrl(input);
  const reasons = [];
  let score = 50; // punto de partida neutro

  if (!p.ok) {
    return { score: 0, level: "bad", message: "URL inválida. Revisa el formato.", reasons };
  }

  const { hostname, protocol, path, tld, subdomains } = p;

  // Lista blanca
if (TRUSTED.some(domain => hostname === domain || hostname.endsWith("." + domain))) {
  score += 35;
  reasons.push({ type: "pos", text: "Dominio en lista de medios confiables." });
} else {
  score -= 10;
  reasons.push({ type: "neg", text: "Dominio fuera de la lista confiable definida." });
}

  // HTTPS
  if (protocol === "https:") {
    score += 10;
    reasons.push({ type: "pos", text: "Conexión segura (HTTPS)." });
  } else {
    score -= 15;
    reasons.push({ type: "neg", text: "Conexión no segura (HTTP)." });
  }

  // TLD riesgoso
  if (RISKY_TLDS.includes(tld)) {
    score -= 20;
    reasons.push({ type: "neg", text: `TLD potencialmente riesgoso (${tld}).` });
  }

  // Acortadores
  if (SHORTENERS.includes(hostname)) {
    score -= 10;
    reasons.push({ type: "neu", text: "Acortador de URL: requiere expandir y verificar el destino." });
  }

  // Typosquatting simple
  LOOKALIKES.forEach(({ legit, fake }) => {
    if (fake.test(hostname)) {
      score -= 25;
      reasons.push({ type: "neg", text: `Dominio similar a ${legit} (posible suplantación).` });
    }
  });

  // Subdominios excesivos
  if (subdomains.length >= 2) {
    score -= 8;
    reasons.push({ type: "neu", text: "Varios subdominios: revisa si es sitio oficial." });
  }

  // Parámetros y tracking
  const paramCount = (path.match(/[?&][^=&]+=/g) || []).length;
  if (paramCount >= 4) {
    score -= 10;
    reasons.push({ type: "neu", text: "Demasiados parámetros en la URL." });
  }
  if (/utm_/i.test(path) || /ref=/i.test(path)) {
    score -= 5;
    reasons.push({ type: "neu", text: "Señales de tracking/marketing en la URL." });
  }

  // Longitud del slug
  const slugLen = path.replace(/^\//,"").length;
  if (slugLen > 180) {
    score -= 8;
    reasons.push({ type: "neu", text: "Ruta muy larga y críptica." });
  }

  // Clickbait en la ruta
  const clicks = CLICKBAIT.filter(r => r.test(path));
  if (clicks.length) {
    score -= 20;
    reasons.push({ type: "neg", text: "Patrón de clickbait detectado en el slug." });
  }

  // Normalizar score a 0–100
  score = Math.max(0, Math.min(100, score));

  // Nivel y mensaje
  let level, message;
  if (score >= 70) {
    level = "ok";
    message = "Confiable: señales positivas predominan. Verifica el contenido igualmente.";
  } else if (score >= 40) {
    level = "warn";
    message = "Precaución: mezcla de señales. Busca corroboración adicional.";
  } else {
    level = "bad";
    message = "Riesgo: varias señales de baja confiabilidad.";
  }

  return { score, level, message, reasons, hostname };
}

function renderResult(evalRes) {
  const resultado = document.getElementById("resultado");
  const detalles  = document.getElementById("detalles");
  const badge     = document.getElementById("scoreBadge");

  resultado.className = `resultado-${evalRes.level}`;
  badge.className = "badge";
  resultado.innerText = evalRes.message;

  detalles.innerHTML = "<ul>" + evalRes.reasons.map(r => `<li>${r.text}</li>`).join("") + "</ul>";

  // 🔹 Normalizar el nivel recibido
  evalRes.level = evalRes.level?.toLowerCase();
  if (evalRes.level === "harm") evalRes.level = "bad";

  console.log("Nivel recibido:", evalRes.level); // Para depurar

  // 🔹 Limpiar y asignar clase según nivel
  resultado.className = `resultado-${evalRes.level}`;
  badge.className = "badge";
  detalles.innerHTML = "<ul>" + evalRes.reasons.map(r => `<li>${r.text}</li>`).join("") + "</ul>";


  // Semáforo visual
  let html = `
    <div class="traffic-light">
      <div class="light red ${evalRes.level === "bad" ? "on" : ""}"></div>
      <div class="light yellow ${evalRes.level === "warn" ? "on" : ""}"></div>
      <div class="light green ${evalRes.level === "ok" ? "on" : ""}"></div>
    </div>
  `;

  // Mensaje según nivel
  if (evalRes.level === "ok") {
    html += `
      <p>🟢 <strong>Confiable</strong><br>
      Fuente verificada.<br>
      Todo indica que la información proviene de un medio confiable.<br>
      Puedes leer y compartir con tranquilidad.</p>
    `;
  } else if (evalRes.level === "warn") {
    html += `
      <p>🟡 <strong>Dudoso</strong><br>
      Fuente dudosa.<br>
      La información podría ser real, pero conviene contrastarla con otros medios.<br>
      Lee con cautela.</p>
    `;
  } else {
    html += `
      <p>🔴 <strong>Falso</strong><br>
      Fuente no verificada.<br>
      Alta posibilidad de contenido falso o engañoso.<br>
      No compartas sin confirmar en medios confiables.</p>
    `;
  }

  resultado.innerHTML = html;
}

async function verificar() {
  const input = document.getElementById("inputUrl").value.trim();
  if (!input) return;

  try {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input })
    });

    const data = await response.json();

// Usa directamente el resultado del backend
renderResult(data);

 
    // 🔹 Unificar fact-checks (Google) y corroboraciones (NewsAPI)
    const relatedDiv = document.getElementById("corroborations");

    // Combinar ambos arrays en uno solo
    const combined = [
      ...(data.factChecks || []).map(fc => ({
        source: fc.claimReview?.[0]?.publisher?.name || "Fuente desconocida",
        title: fc.text || fc.claimReview?.[0]?.title || "Sin descripción",
        url: fc.claimReview?.[0]?.url
      })),
      ...(data.corroborations || []).map(c => ({
        source: c.source,
        title: c.title,
        url: c.url
      }))
    ];

    // Renderizar
    if (combined.length > 0) {
      relatedDiv.innerHTML = `
        <h3>Noticias relacionadas en medios confiables:</h3>
        <ul>
          ${combined.map(item => `
            <li>
              <strong>${item.source}</strong>: 
              <a href="${item.url}" target="_blank">${item.title}</a>
            </li>
          `).join("")}
        </ul>
      `;
    } else {
      relatedDiv.innerHTML = `
        <p>Ups, parece que no hay resultados para esta noticia todavía.<br>
        Esto no significa que sea falsa, solo que aún no ha sido verificada en las bases de datos.</p>
      `;
    }

} catch (err) {
  console.error("Error llamando a la API:", err);
  alert("Hubo un problema verificando la URL.");
}
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVerificar").addEventListener("click", verificar);
});
