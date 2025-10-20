// Lista blanca de medios confiables
const TRUSTED = [
  "bbc.com","nytimes.com","elpais.com","reuters.com","apnews.com",
  "dw.com","eltiempo.com","elespectador.com","semana.com","theguardian.com",
  "washingtonpost.com","lemonde.fr","aljazeera.com","infobae.com",
  "rcnradio.com","caracol.com.co","noticias.caracoltv.com","lasillavacia.com",
  "elcolombiano.com","portafolio.co"
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
  { legit: "bbc.com", fake: /bbc\.(co|cn|tk|ml)$/i },
  { legit: "reuters.com", fake: /reuters\.(co|cn|tk|ml)$/i },
  { legit: "eltiempo.com", fake: /eltiempo\.(co|cn|tk|ml)$/i }
];

function renderResult(evalRes) {
  const resultado = document.getElementById("resultado");
  const detalles = document.getElementById("detalles");
  const badge = document.getElementById("scoreBadge");

  // Normalizar el nivel recibido
  evalRes.level = evalRes.level?.toLowerCase();
  if (evalRes.level === "harm") evalRes.level = "bad";

  console.log("Nivel recibido:", evalRes.level);

  // Asignar clase según nivel
  resultado.className = `resultado-${evalRes.level}`;
  badge.className = "badge";

  // Renderizar detalles (razones)
  if (evalRes.reasons && evalRes.reasons.length > 0) {
    detalles.innerHTML = "<ul>" + evalRes.reasons.map(r => `<li>${r}</li>`).join("") + "</ul>";
  }

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
  
  if (!input) {
    alert("Por favor ingresa una URL");
    return;
  }

  // Mostrar indicador de carga
  const resultado = document.getElementById("resultado");
  resultado.innerHTML = "<p>🔍 Verificando la URL...</p>";
  
  const relatedDiv = document.getElementById("corroborations");
  relatedDiv.innerHTML = "";

  try {
    // Detectar automáticamente si es Netlify o Vercel
const API_URL = window.location.hostname.includes('netlify') 
  ? '/.netlify/functions/verify' 
  : '/api/verify';

const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input })
    });

    if (!response.ok) {
      throw new Error("Error en la respuesta del servidor");
    }

    const data = await response.json();

    // Renderizar resultado principal
    renderResult(data);

    // 🔹 Unificar fact-checks (Google) y corroboraciones (NewsAPI)
    const combined = [];

    // Agregar fact-checks de Google (si existen)
    if (data.factChecks && data.factChecks.length > 0) {
      data.factChecks.forEach(fc => {
        if (fc.claimReview && fc.claimReview[0]) {
          combined.push({
            source: fc.claimReview[0].publisher?.name || "Fact-checker",
            title: fc.text || fc.claimReview[0].title || "Verificación encontrada",
            url: fc.claimReview[0].url,
            rating: fc.claimReview[0].textualRating || ""
          });
        }
      });
    }

    // Agregar corroboraciones de NewsAPI (si existen)
    if (data.corroborations && data.corroborations.length > 0) {
      data.corroborations.forEach(c => {
        combined.push({
          source: c.source,
          title: c.title,
          url: c.url
        });
      });
    }

    // Renderizar resultados
    if (combined.length > 0) {
      relatedDiv.innerHTML = `
        <div style="background: #1a1d29; padding: 20px; border-radius: 12px; margin-top: 20px;">
          <h3 style="color: #22c55e; margin-bottom: 15px;">✅ Verificaciones encontradas:</h3>
          <ul style="list-style: none; padding: 0;">
            ${combined.map(item => `
              <li style="margin-bottom: 15px; padding: 12px; background: #2a2d3a; border-radius: 8px;">
                <strong style="color: #facc15;">${item.source}</strong>
                ${item.rating ? `<span style="color: #ef4444;"> - ${item.rating}</span>` : ""}
                <br>
                <a href="${item.url}" target="_blank" style="color: #60a5fa; text-decoration: none;">
                  ${item.title}
                </a>
              </li>
            `).join("")}
          </ul>
        </div>
      `;
    } else {
      relatedDiv.innerHTML = `
        <div style="background: #1a1d29; padding: 20px; border-radius: 12px; margin-top: 20px;">
          <h3 style="color: #facc15;">😕 Ups, no encontramos verificaciones para esta noticia</h3>
          <p style="color: #94a3b8; line-height: 1.6; margin-top: 15px;">
            Esto no significa que sea falsa, solo que aún no está en nuestras bases de datos.<br><br>
            <strong style="color: #22c55e;">💡 Pero tranquilo, puedes verificarla manualmente en:</strong><br>
            <a href="https://colombiacheck.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">ColombiaCheck</a> | 
            <a href="https://chequeado.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">Chequeado</a> | 
            <a href="https://www.politifact.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">Politifact</a>
          </p>
        </div>
      `;
    }

  } catch (err) {
    console.error("Error llamando a la API:", err);
    resultado.innerHTML = `
      <p style="color: #ef4444;">❌ Error al verificar la URL. 
      Por favor verifica que la URL sea correcta e intenta nuevamente.</p>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVerificar").addEventListener("click", verificar);
  
  // Permitir verificar con Enter
  document.getElementById("inputUrl").addEventListener("keypress", (e) => {
    if (e.key === "Enter") verificar();
  });
});