// Lista blanca de medios confiables
const TRUSTED = [
  "bbc.com", "nytimes.com", "elpais.com", "reuters.com", "apnews.com",
  "dw.com", "eltiempo.com", "elespectador.com", "semana.com", "theguardian.com",
  "washingtonpost.com", "lemonde.fr", "aljazeera.com", "infobae.com",
  "rcnradio.com", "caracol.com.co", "noticias.caracoltv.com", "lasillavacia.com",
  "elcolombiano.com", "portafolio.co"
];

// TLD potencialmente riesgosos
const RISKY_TLDS = [".xyz", ".click", ".buzz", ".top", ".loan", ".info", ".club", ".work", ".tk", ".gq", ".ml"];

// Acortadores (lista gris: requieren expandir)
const SHORTENERS = ["bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rb.gy"];

// Palabras/expresiones de clickbait comunes en el slug/ruta
const CLICKBAIT = [
  /incre[ií]ble/i, /no lo (vas|vas a) creer/i, /impactante/i, /urgente/i, /secreto/i,
  /esc[áa]ndalo/i, /pol[ée]mica/i, /imperdible/i, /as[ií] fue/i, /lo que nadie/i
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
      display: inline-flex;
      align-items: center;
      gap: 15px;
      padding: 20px 40px;
      background: linear-gradient(135deg, ${scoreColor}22, ${scoreColor}11);
      border: 3px solid ${scoreColor};
      border-radius: 60px;
      margin-bottom: 25px;
      box-shadow: 0 8px 32px ${scoreColor}44;
    ">
      <div style="font-size: 42px; line-height: 1;">
        ${evalRes.level === "ok" ? "✓" : evalRes.level === "warn" ? "⚠" : "✗"}
      </div>
      <div>
        <div style="
          font-size: 28px;
          font-weight: bold;
          color: ${scoreColor};
          text-transform: uppercase;
          letter-spacing: 2px;
          line-height: 1.2;
        ">
          ${scoreLabel}
        </div>
        
      </div>
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
        ⚠️ Recomendaciones
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
      ⚠️ Recomendaciones
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
      ⚠️ Recomendaciones
         </h3>
        <p style="color: #94a3b8; line-height: 1.8; margin: 0;">
          <strong>Alta posibilidad de contenido falso o engañoso.</strong><br>
          NO compartas sin confirmar en medios confiables.
        </p>
      </div>
    `;
  }

  // Agregar botón de reporte
html += `
  <div style="
    background: #1a1d29;
    padding: 20px;
    border-radius: 12px;
    margin-top: 20px;
    text-align: center;
  ">
    <h4 style="color: #60a5fa; margin-bottom: 15px;">
      🚨 ¿Esta noticia te parece falsa?
    </h4>
    <button
      id="btnReportar"
      onclick="reportarURL('${evalRes.hostname || document.getElementById('inputUrl').value}')"
      style="
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      "
      onmouseover="this.style.transform='scale(1.05)'"
      onmouseout="this.style.transform='scale(1)'"
    >
      Reportar como falsa
    </button>
    <div id="reportStatus" style="
      margin-top: 15px;
      color: #94a3b8;
      font-size: 14px;
    "></div>
  </div>
`;
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
    // Mostrar reportes existentes
    mostrarReportes(input);
    // Guardar en historial
    saveToHistory(input, data);

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
          Este sitio presenta características comunes en noticias falsas.<br><br>
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
  // Verificador (solo en verificador.html)
  const btnVerificar = document.getElementById("btnVerificar");
  if (btnVerificar) {
    btnVerificar.addEventListener("click", verificar);
  }
  
  const inputUrl = document.getElementById("inputUrl");
  if (inputUrl) {
    inputUrl.addEventListener("keypress", (e) => {
      if (e.key === "Enter") verificar();
    });
  }
  
  // Historial (solo en verificador.html)
  if (document.getElementById('history')) {
    displayHistory();
    updateStats();
  }
  
  // Estadísticas globales (index.html)
  if (document.getElementById('globalStats')) {
    loadGlobalStats();
  }
});
// ===== HISTORIAL DE VERIFICACIONES =====

function saveToHistory(url, result) {
  let history = JSON.parse(localStorage.getItem('fakeNewsHistory') || '[]');

  // Agregar nueva verificación
  history.unshift({
    url: url,
    level: result.level,
    score: result.score,
    date: new Date().toISOString(),
    hostname: result.hostname
  });

  // Mantener solo las últimas 20
  history = history.slice(0, 20);

  localStorage.setItem('fakeNewsHistory', JSON.stringify(history));

  // Actualizar display
  displayHistory();
  updateStats();
}

function displayHistory() {
  const historyDiv = document.getElementById('history');
  if (!historyDiv) return;
  
  const history = JSON.parse(localStorage.getItem('fakeNewsHistory') || '[]');
  
  if (history.length === 0) {
    historyDiv.innerHTML = '';
    return;
  }
  
  const levelEmoji = {
    ok: '✅',
    warn: '⚠️',
    bad: '❌'
  };
  
  const levelColor = {
    ok: '#22c55e',
    warn: '#facc15',
    bad: '#ef4444'
  };
  
  historyDiv.innerHTML = `
    <div style="
      background: #1a1d29;
      padding: 25px;
      border-radius: 16px;
      margin-top: 30px;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      ">
        <h3 style="color: #60a5fa; margin: 0;">
          📋 Historial de verificaciones
        </h3>
        <button
          onclick="clearHistory()"
          style="
            background: #ef444422;
            color: #ef4444;
            border: 1px solid #ef4444;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
          "
        >
          Limpiar
        </button>
      </div>
      
      <div style="
        max-height: 300px;
        overflow-y: auto;
        overflow-x: hidden;
      ">
        ${history.map((item, index) => `
          <div style="
            background: #2a2d3a;
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 10px;
            border-left: 4px solid ${levelColor[item.level]};
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
          ">
            <div style="flex: 1; min-width: 0;">
              <div style="
                display: flex;
                align-items: center;
                margin-bottom: 8px;
              ">
                <span style="font-size: 20px; margin-right: 10px;">
                  ${levelEmoji[item.level]}
                </span>
                <span style="
                  color: #cbd5e1;
                  flex: 1;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  font-weight: 500;
                ">${item.hostname || item.url}</span>
                <span style="
                  color: #64748b;
                  font-size: 12px;
                  margin-left: 10px;
                ">${new Date(item.date).toLocaleDateString('es-CO')}</span>
              </div>
              <div style="
                color: #64748b;
                font-size: 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${item.url}</div>
            </div>
            
            <div style="display: flex; gap: 8px; flex-shrink: 0;">
              <button
                onclick="window.open('${item.url}', '_blank')"
                style="
                  background: #3b82f622;
                  color: #3b82f6;
                  border: 1px solid #3b82f6;
                  padding: 8px 16px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 500;
                  white-space: nowrap;
                "
                onmouseover="this.style.background='#3b82f644'"
                onmouseout="this.style.background='#3b82f622'"
              >
                🔗 Abrir
              </button>
              <button 
                onclick="document.getElementById('inputUrl').value='${item.url}'; window.scrollTo(0,0); verificar();"
                style="
                  background: transparent;
                  color: #64748b;
                  border: 1px solid #475569;
                  padding: 8px 10px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 14px;
                  white-space: nowrap;
                "
                onmouseover="this.style.borderColor='#22c55e'; this.style.color='#22c55e'"
                onmouseout="this.style.borderColor='#475569'; this.style.color='#64748b'"
                title="Re-verificar esta URL"
              >
                🔄
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function updateStats() {
  const statsDiv = document.getElementById('stats');
  if (!statsDiv) return;

  const history = JSON.parse(localStorage.getItem('fakeNewsHistory') || '[]');

  if (history.length === 0) {
    statsDiv.innerHTML = '';
    return;
  }

  const stats = {
    ok: history.filter(h => h.level === 'ok').length,
    warn: history.filter(h => h.level === 'warn').length,
    bad: history.filter(h => h.level === 'bad').length
  };

  statsDiv.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1e293b, #334155);
      padding: 25px;
      border-radius: 16px;
      margin-top: 20px;
    ">
      <h3 style="color: #60a5fa; margin: 0 0 20px 0;">
        📊 Tus estadísticas
      </h3>
      
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
      ">
        <div style="
          background: #22c55e22;
          border: 2px solid #22c55e;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        ">
          <div style="font-size: 36px; font-weight: bold; color: #22c55e;">
            ${stats.ok}
          </div>
          <div style="color: #94a3b8; font-size: 14px; margin-top: 5px;">
            Confiables
          </div>
        </div>
        
        <div style="
          background: #facc1522;
          border: 2px solid #facc15;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        ">
          <div style="font-size: 36px; font-weight: bold; color: #facc15;">
            ${stats.warn}
          </div>
          <div style="color: #94a3b8; font-size: 14px; margin-top: 5px;">
            Dudosas
          </div>
        </div>
        
        <div style="
          background: #ef444422;
          border: 2px solid #ef4444;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        ">
          <div style="font-size: 36px; font-weight: bold; color: #ef4444;">
            ${stats.bad}
          </div>
          <div style="color: #94a3b8; font-size: 14px; margin-top: 5px;">
            Falsas
          </div>
        </div>
      </div>
      
      <div style="
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #334155;
        text-align: center;
        color: #94a3b8;
      ">
        Total verificadas: <strong style="color: #60a5fa;">${history.length}</strong>
      </div>
    </div>
  `;
}

function clearHistory() {
  if (confirm('¿Estás seguro de que quieres borrar el historial?')) {
    localStorage.removeItem('fakeNewsHistory');
    displayHistory();
    updateStats();
  }
}

// ===== ESTADÍSTICAS GLOBALES =====

async function loadGlobalStats() {
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();
    
    const statsDiv = document.getElementById('globalStats');
    if (!statsDiv) return;
    
    statsDiv.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #3b82f622, #2563eb22);
        border: 2px solid #3b82f6;
        padding: 30px;
        border-radius: 16px;
        text-align: center;
        transition: transform 0.3s;
      "
      onmouseover="this.style.transform='translateY(-5px)'"
      onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size: 48px; font-weight: bold; color: #3b82f6; margin-bottom: 10px;">
          ${data.totalVerificaciones || 0}
        </div>
        <div style="color: #94a3b8; font-size: 16px; font-weight: 600;">
          🔍 Verificaciones
        </div>
      </div>
      
      <div style="
        background: linear-gradient(135deg, #22c55e22, #16a34a22);
        border: 2px solid #22c55e;
        padding: 30px;
        border-radius: 16px;
        text-align: center;
        transition: transform 0.3s;
      "
      onmouseover="this.style.transform='translateY(-5px)'"
      onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size: 48px; font-weight: bold; color: #22c55e; margin-bottom: 10px;">
          ${data.usuariosActivos || 0}
        </div>
        <div style="color: #94a3b8; font-size: 16px; font-weight: 600;">
          👥 Usuarios
        </div>
      </div>
      
      <div style="
        background: linear-gradient(135deg, #ef444422, #dc262622);
        border: 2px solid #ef4444;
        padding: 30px;
        border-radius: 16px;
        text-align: center;
        transition: transform 0.3s;
      "
      onmouseover="this.style.transform='translateY(-5px)'"
      onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size: 48px; font-weight: bold; color: #ef4444; margin-bottom: 10px;">
          ${data.totalReportes || 0}
        </div>
        <div style="color: #94a3b8; font-size: 16px; font-weight: 600;">
          🚫 Reportes
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    // Mostrar valores por defecto
    const statsDiv = document.getElementById('globalStats');
    if (statsDiv) {
      statsDiv.innerHTML = `
        <div style="background: linear-gradient(135deg, #3b82f622, #2563eb22); border: 2px solid #3b82f6; padding: 30px; border-radius: 16px; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: #3b82f6;">0</div>
          <div style="color: #94a3b8; font-size: 16px; font-weight: 600;">🔍 Verificaciones</div>
        </div>
        <div style="background: linear-gradient(135deg, #22c55e22, #16a34a22); border: 2px solid #22c55e; padding: 30px; border-radius: 16px; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: #22c55e;">0</div>
          <div style="color: #94a3b8; font-size: 16px; font-weight: 600;">👥 Usuarios</div>
        </div>
        <div style="background: linear-gradient(135deg, #ef444422, #dc262622); border: 2px solid #ef4444; padding: 30px; border-radius: 16px; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: #ef4444;">0</div>
          <div style="color: #94a3b8; font-size: 16px; font-weight: 600;">🚫 Reportes</div>
        </div>
      `;
    }
  }
}

// ===== SISTEMA DE REPORTES =====

async function reportarURL(url) {
  const btn = document.getElementById('btnReportar');
  const status = document.getElementById('reportStatus');
  
  // Obtener la URL completa del input
  const fullUrl = document.getElementById('inputUrl').value.trim();
  
  btn.disabled = true;
  btn.textContent = 'Reportando...';
  
  try {
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fullUrl })
    });
    
    const data = await response.json();
    
    if (data.success) {
      btn.textContent = '✅ Reportado';
      btn.style.background = '#22c55e';
      status.innerHTML = `
        <strong style="color: #22c55e;">¡Gracias por tu reporte!</strong><br>
        ${data.totalReports} persona${data.totalReports > 1 ? 's han' : ' ha'} reportado esta URL
      `;
      
      // Deshabilitar botón permanentemente
      setTimeout(() => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
      }, 2000);
    } else {
      throw new Error('Error al reportar');
    }
  } catch (error) {
    console.error('Error:', error);
    btn.textContent = 'Error al reportar';
    btn.style.background = '#ef4444';
    status.innerHTML = '<span style="color: #ef4444;">Hubo un error. Intenta de nuevo.</span>';
    btn.disabled = false;
    
    setTimeout(() => {
      btn.textContent = 'Reportar como falsa';
    }, 3000);
  }
}

async function mostrarReportes(url) {
  try {
    const response = await fetch(`/api/get-reports?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.reports > 0) {
      const reportDiv = document.getElementById('reportStatus');
      if (reportDiv) {
        reportDiv.innerHTML = `
          ⚠️ <strong>${data.reports}</strong> persona${data.reports > 1 ? 's han' : ' ha'} reportado esta URL como falsa
        `;
        reportDiv.style.color = '#facc15';
      }
    }
  } catch (error) {
    console.error('Error al obtener reportes:', error);
  }
}
