// Cache de resultados
const verificationCache = {};

// Crear menú contextual al instalar
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "verifyLink",
    title: "Verificar con FakeNews",
    contexts: ["link"]
  });
});

// Manejar click en menú contextual
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "verifyLink") {
    chrome.windows.create({
      url: `https://fake-news-verifier.vercel.app/verificador.html`,
      type: "popup",
      width: 500,
      height: 700
    });
  }
});

// Verificar automáticamente cuando cambia de tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Solo verificar cuando la página termina de cargar
  if (changeInfo.status === 'complete' && tab.url) {
    autoVerifyPage(tab.url, tabId);
  }
});

// Verificar cuando se activa un tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    autoVerifyPage(tab.url, activeInfo.tabId);
  }
});

// Función para verificar automáticamente
async function autoVerifyPage(url, tabId) {
  // Ignorar páginas internas de Chrome
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return;
  }

  // Verificar si ya está en cache (para evitar llamadas repetidas)
  if (verificationCache[url]) {
    updateBadge(verificationCache[url], tabId);
    return;
  }

  try {
    // Llamar a la API
    const response = await fetch('https://fake-news-verifier.vercel.app/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });

    if (!response.ok) throw new Error('Error en verificación');

    const data = await response.json();
    
    // Guardar en cache
    verificationCache[url] = data;
    
    // Guardar en storage para que popup lo vea
    await chrome.storage.local.set({ [url]: data });
    
    // Actualizar badge
    updateBadge(data, tabId);
    
  } catch (error) {
    console.error('Error en verificación automática:', error);
  }
}

// Actualizar badge según resultado
function updateBadge(data, tabId) {
  let text = '';
  let color = '#64748b';
  
  if (data.level === 'ok') {
    text = '✓';
    color = '#22c55e';
  } else if (data.level === 'warn') {
    text = '⚠';
    color = '#facc15';
  } else if (data.level === 'bad') {
    text = '✗';
    color = '#ef4444';
  }
  
  chrome.action.setBadgeText({ text: text, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });
}