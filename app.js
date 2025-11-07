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

  evalRes.level = evalRes.level?.toLowerCase();
  if (evalRes.level === "harm") evalRes.level = "bad";

  resultado.className = `resultado-${evalRes.level}`;

  const ocultar = [
    "✅ Dominio en lista de medios confiables",
    "🔒 Conexión segura (HTTPS)"
  ];
  const visibles = evalRes.reasons?.filter(r => !ocultar.includes(r)) || [];

  // 🆕 Score y label
  let scoreColor = "#22c55e";
  let scoreLabel = "CONFIABLE";
  
  if (evalRes.level === "warn") {
    scoreColor = "#facc15";
    scoreLabel = "DUDOSO";
  } else if (evalRes.level === "bad") {
    scoreColor = "#ef4444";
    scoreLabel = "RIESGO";
  }

  let html = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="
        display: inline-block;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        border: 8px solid ${scoreColor};
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        margin-bottom: 20px;
        background: rgba(255,255,255,0.05);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      ">
        <div style="font-size: 48px; font-weight: bold; color: ${scoreColor};">
          ${evalRes.score || 0}
        </div>
        <div style="font-size: 14px; color: ${scoreColor}; margin-top: 5px;">
          / 100
        </div>
      </div>
      
      <div style="
        display: inline-block;
        padding: 12px 24px;
        background: ${scoreColor}22;
        border: 2px solid ${scoreColor};
        border-radius: 50px;
        font-size: 20px;
        font-weight: bold;
        color: ${scoreColor};
        text-transform: uppercase;
        letter-spacing: 2px;
      ">
        ${scoreLabel}
      </div>
    </div>

    <div class="traffic-light">
      <div class="light red ${evalRes.level === "bad" ? "on" : ""}"></div>
      <div class="light yellow ${evalRes.level === "warn" ? "on" : ""}"></div>
      <div class="light green ${evalRes.level === "ok" ? "on" : ""}"></div>
    </div>
  `;

  if (evalRes.level === "ok") {
    html += `
      <div style="
        background: linear-gradient(135deg, #22c55e22, #10b98122);
        padding: 25px;
        border-radius: 16px;
        border-left: 4px solid #22c55e;
        margin-top: 20px;
      ">
        <h3 style="color: #22c55e; margin: 0 0 15px 0; font-size: 24px;">
          🟢 Fuente Confiable
        </h3>
        <p style="color: #94a3b8; line-height: 1.8; margin: 0;">
          <strong>Todo indica que esta información proviene de un medio verificado.</strong><br>
          Puedes leer y compartir con tranquilidad.
        </p>
      </div>
    `;
  } else if (evalRes.level === "warn") {
    html += `
      <div style="
        background: linear-gradient(135deg, #facc1522, #f59e0b22);
        padding: 25px;
        border-radius: 16px;
        border-left: 4px solid #facc15;
        margin-top: 20px;
      ">
        <h3 style="color: #facc15; margin: 0 0 15px 0; font-size: 24px;">
          🟡 Fuente Dudosa
        </h3>
        <p style="color: #94a3b8; line-height: 1.8; margin: 0;">
          <strong>La información podría ser real, pero conviene contrastarla.</strong><br>
          Verifica en otros medios antes de compartir.
        </p>
      </div>
    `;
  } else {
    html += `
      <div style="
        background: linear-gradient(135deg, #ef444422, #dc262622);
        padding: 25px;
        border-radius: 16px;
        border-left: 4px solid #ef4444;
        margin-top: 20px;
      ">
        <h3 style="color: #ef4444; margin: 0 0 15px 0; font-size: 24px;">
          🔴 Fuente No Verificada
        </h3>
        <p style="color: #94a3b8; line-height: 1.8; margin: 0;">
          <strong>Alta posibilidad de contenido falso o engañoso.</strong><br>
          NO compartas sin confirmar en medios confiables.
        </p>
      </div>
    `;
  }

  resultado.innerHTML = html;

  if (visibles.length > 0) {
    detalles.innerHTML = `
      <div style="
        background: #1a1d29;
        padding: 20px;
        border-radius: 12px;
        margin-top: 20px;
      ">
        <h4 style="color: #60a5fa; margin-bottom: 15px;">
          🔍 Factores detectados:
        </h4>
        <ul style="
          list-style: none;
          padding: 0;
          color: #cbd5e1;
          line-height: 2;
        ">
          ${visibles.map(r => `
            <li style="padding: 8px 0; border-bottom: 1px solid #2a2d3a;">
              ${r}
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  } else {
    detalles.innerHTML = "";
  }
}

async function verificar() {
  const input = document.getElementById("inputUrl").value.trim();
  
  if (!input) {
    alert("Por favor ingresa una URL");
    return;
  }

  // 🆕 Barra de progreso animada
  const resultado = document.getElementById("resultado");
  resultado.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
      <h3 style="color: #60a5fa; margin-bottom: 20px;">
        Analizando la URL...
      </h3>
      
      <div style="
        width: 100%;
        height: 8px;
        background: #2a2d3a;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 15px;
      ">
        <div style="
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
          border-radius: 10px;
          animation: progress 2s ease-in-out forwards;
        "></div>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px;">
        Consultando múltiples fuentes de verificación...
      </p>
    </div>
    
    <style>
      @keyframes progress {
        from { width: 0%; }
        to { width: 90%; }
      }
    </style>
  `;
  
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
          <h3 style="color: #22c55e; margin-bottom: 15px;">🔍 Información adicional encontrada:</h3>
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
    // Reemplaza el bloque "else" donde muestra "Esta noticia aún no ha sido verificada"
// por este código que cambia el mensaje según el color del semáforo

} else {
  // Mensaje diferente según el nivel de confiabilidad
  let noVerificationMessage = "";

  if (data.level === "ok") {
    // VERDE - Fuente confiable pero sin verificaciones encontradas
    noVerificationMessage = `
      <div style="background: #1a1d29; padding: 20px; border-radius: 12px; margin-top: 20px;">
        <h3 style="color: #22c55e;">✅ Esta noticia aún no ha sido verificada</h3>
        <p style="color: #94a3b8; line-height: 1.6; margin-top: 15px;">
          Esto no significa que sea falsa, solo que aún no está en nuestras bases de datos.<br><br>
          <strong style="color: #22c55e;">💡 Puedes verificarla manualmente en:</strong><br>
          <a href="https://colombiacheck.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">ColombiaCheck</a> | 
          <a href="https://chequeado.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">Chequeado</a> | 
          <a href="https://www.politifact.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">Politifact</a>
        </p>
      </div>
    `;
  } else if (data.level === "warn") {
    // AMARILLO - Fuente dudosa
    noVerificationMessage = `
      <div style="background: #1a1d29; padding: 20px; border-radius: 12px; margin-top: 20px;">
        <h3 style="color: #facc15;">⚠️ Procede con precaución</h3>
        <p style="color: #94a3b8; line-height: 1.6; margin-top: 15px;">
          No encontramos verificaciones de fact-checkers profesionales sobre esta noticia.<br><br>
          <strong style="color: #facc15;">💡 Antes de compartir, verifica en:</strong><br>
          <a href="https://colombiacheck.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">ColombiaCheck</a> | 
          <a href="https://chequeado.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">Chequeado</a> | 
          <a href="https://www.politifact.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">Politifact</a>
        </p>
      </div>
    `;
  } else {
    // ROJO - Fuente sospechosa
    noVerificationMessage = `
      <div style="background: #1a1d29; padding: 20px; border-radius: 12px; margin-top: 20px;">
        <h3 style="color: #ef4444;">🚫 ALTO: Señales de riesgo detectadas</h3>
        <p style="color: #94a3b8; line-height: 1.6; margin-top: 15px;">
          Este sitio presenta características comunes en fake news.<br><br>
          <strong style="color: #ef4444;">⚠️ Antes de creer o compartir, verifica en medios confiables:</strong><br>
          <a href="https://www.eltiempo.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">El Tiempo</a> | 
          <a href="https://www.elespectador.com/" target="_blank" style="color: #60a5fa; text-decoration: none;">El Espectador</a> | 
          <a href="https://www.bbc.com/mundo" target="_blank" style="color: #60a5fa; text-decoration: none;">BBC</a> | 
          <a href="https://www.reuters.com/mundo" target="_blank" style="color: #60a5fa; text-decoration: none;">Reuters</a>
        </p>
      </div>
    `;
  }

  relatedDiv.innerHTML = noVerificationMessage;
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