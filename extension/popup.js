// Al abrir el popup, cargar resultado si ya existe
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  if (tabs[0]) {
    const url = tabs[0].url;
    document.getElementById('urlDisplay').textContent = url;
    
    // Buscar en storage si ya se verificó
    const result = await chrome.storage.local.get(url);
    
    if (result[url]) {
      // Ya se verificó automáticamente
      displayResult(result[url]);
      document.getElementById('verifyBtn').textContent = 'Re-verificar';
    }
  }
});

// Botón de verificación manual
document.getElementById('verifyBtn').addEventListener('click', async () => {
  const btn = document.getElementById('verifyBtn');
  btn.disabled = true;
  btn.textContent = 'Verificando...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;
    
    document.getElementById('urlDisplay').textContent = url;
    
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<div class="loading">🔍 Analizando la noticia...</div>';
    
    const response = await fetch('https://fake-news-verifier.vercel.app/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });
    
    if (!response.ok) throw new Error('Error en la respuesta');
    
    const data = await response.json();
    
    // Guardar en storage
    await chrome.storage.local.set({ [url]: data });
    
    displayResult(data);
    
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('result').innerHTML = 
      '<div class="result bad">❌ Error al verificar. Intenta de nuevo.</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Re-verificar';
  }
});

// Función para mostrar resultado
function displayResult(data) {
  const resultDiv = document.getElementById('result');
  
  let emoji = data.level === 'ok' ? '✓' : data.level === 'warn' ? '⚠' : '✗';
  let label = data.level === 'ok' ? 'CONFIABLE' : data.level === 'warn' ? 'DUDOSO' : 'RIESGO';
  
  resultDiv.className = `result ${data.level}`;
  resultDiv.innerHTML = `
    <div style="font-size: 32px; margin-bottom: 10px;">${emoji}</div>
    <div style="font-size: 18px; font-weight: bold;">${label}</div>
    <div style="font-size: 11px; margin-top: 8px; opacity: 0.6;">
      ✨ Verificado automáticamente
    </div>
  `;
}