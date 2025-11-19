import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message, callback_query } = req.body;

    //===== Manejar callbacks de botones =====
    if (callback_query) {
      await handleCallback(callback_query, req);
      return res.status(200).json({ ok: true });
    }

    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Comando /start - CON TOTAL GLOBAL
    if (text === '/start') {
      // Obtener stats globales
      const globalStatsResponse = await fetch(`${req.headers.host.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/global-stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      let totalGlobal = 0;
      let totalReports = 0;
      if (globalStatsResponse.ok) {
      const globalStats = await globalStatsResponse.json();
      totalGlobal = globalStats.totalGlobal || 0;
      totalReports = globalStats.totalReports || 0;
    }

      const startKeyboard = {
        inline_keyboard: [
          [
            {
              text: '🌐 Abrir verificador web',
              url: 'https://fake-news-verifier.vercel.app/verificador.html'
            }
          ],
          [
            {
              text: '📊 Mis estadísticas',
              callback_data: 'show_stats'
            },
            {
              text: 'ℹ️ Ayuda',
              callback_data: 'show_help'
            }
          ]
        ]
      };

      await sendTelegramMessageWithButtons(chatId,
  `¡Hola! 👋 Soy el bot verificador de FakeNews.\n\n` +
  `📌 Envíame cualquier URL de una noticia y te diré si es confiable o no.\n\n` +
  `🌍 *Hemos verificado ${totalGlobal.toLocaleString()} noticias únicas en total*\n` +
  `🚨 *Los usuarios han reportado ${totalReports.toLocaleString()} noticias como falsas*\n\n` +
  `Ejemplo:\nhttps://www.eltiempo.com/noticia\n\n` +
  `También puedes usar:\n` +
  `/help - Ver ayuda\n` +
  `/stats - Ver tus estadísticas`,
  'Markdown',
  startKeyboard
);
      return res.status(200).json({ ok: true });
    }

    // Comando /help
    if (text === '/help') {
      await sendTelegramMessage(chatId,
        `🔍 *Cómo usar el bot:*\n\n` +
        `1️⃣ Envía una URL de noticia\n` +
        `2️⃣ Espera el análisis (5-10 seg)\n` +
        `3️⃣ Recibe el veredicto\n\n` +
        `✅ Verde = Confiable\n` +
        `⚠️ Amarillo = Dudoso\n` +
        `❌ Rojo = Falso\n\n` +
        `🔗 *Acepto links acortados* (bit.ly, t.co, tinyurl, etc.)\n\n` +
        `_Desarrollado para detectar desinformación_`,
        'Markdown'
      );
      return res.status(200).json({ ok: true });
    }

    // Comando /stats - MIS STATS PERSONALES
    if (text === '/stats') {
      await sendStatsMessage(chatId, req);
      return res.status(200).json({ ok: true });
    }

    // Verificar si es una URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);

    if (!urls || urls.length === 0) {
      await sendTelegramMessage(chatId,
        `⚠️ No detecté ninguna URL.\n\n` +
        `Por favor envía un link como:\n` +
        `https://www.eltiempo.com/noticia`
      );
      return res.status(200).json({ ok: true });
    }

    const url = urls[0];

    // Mensaje de carga
    await sendTelegramMessage(chatId, `🔍 Verificando URL...\n\n${url}`);

   // Llamar al verificador CON TIMEOUT
let verifyResponse;
try {
  verifyResponse = await Promise.race([
    fetch(`${req.headers.host.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, userIp: `telegram_${chatId}` })
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 25000)
    )
  ]);
} catch (error) {
  console.error('Timeout o error:', error);
  await sendTelegramMessage(chatId,
    `⚠️ La verificación está tardando mucho.\n\n` +
    `Intenta aquí: fake-news-verifier.vercel.app/verificador.html`
  );
  return res.status(200).json({ ok: true });
}

if (!verifyResponse.ok) {
  const errorText = await verifyResponse.text();
  console.error('Error en verify:', errorText);
  throw new Error(`Error al verificar URL: ${verifyResponse.status}`);
}

    const data = await verifyResponse.json();

    // 🆕 Log prueba
console.log('✅ Data recibida de verify:', JSON.stringify(data, null, 2));


    // Formatear respuesta
    let emoji = '❌';
    let nivel = 'FALSO';

    if (data.level === 'ok') {
      emoji = '✅';
      nivel = 'CONFIABLE';
    } else if (data.level === 'warn') {
      emoji = '⚠️';
      nivel = 'DUDOSO';
    }

    let response = `${emoji} *${nivel}*\n\n`;

    // Agregar razones si existen
    if (data.reasons && data.reasons.length > 0) {
      response += `📋 *Factores detectados:*\n`;
      data.reasons.slice(0, 5).forEach(reason => {
        response += `• ${reason}\n`;
      });
      response += '\n';
    }

    // Agregar fact-checks si existen
    if (data.factChecks && data.factChecks.length > 0) {
      response += `🔍 *Verificaciones encontradas:* ${data.factChecks.length}\n\n`;
    }

    // Recomendación
    if (data.level === 'ok') {
      response += `✅ *Recomendación:* Puedes leer y compartir con confianza.`;
    } else if (data.level === 'warn') {
      response += `⚠️ *Recomendación:* Verifica en otros medios antes de compartir.`;
    } else {
      response += `❌ *Recomendación:* NO compartas sin confirmar en medios confiables.`;
    }

    response += `\n\n_Verifica más en: fake-news-verifier.vercel.app_`;

    // 🆕 Guardar URL en Supabase para obtener ID corto
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: urlData } = await supabase
      .from('pending_reports')
      .insert([{ url: url }])
      .select()
      .single();

    // Crear botones inline
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🔍 Ver análisis completo',
            url: `https://fake-news-verifier.vercel.app/verificador.html`
          }
        ],
        [
          {
            text: '🚫 Reportar como falsa',
            callback_data: `report:${urlData.id}`
          }
        ]
      ]
    };

    try {
  console.log('📤 Enviando respuesta a Telegram:', response.substring(0, 100));
  await sendTelegramMessageWithButtons(chatId, response, 'Markdown', keyboard);
  console.log('✅ Mensaje enviado exitosamente');
} catch (error) {
  console.error('❌ Error enviando mensaje a Telegram:', error);
  // Intentar enviar sin Markdown
  await sendTelegramMessage(chatId, response.replace(/\*/g, ''));
}

return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Error en bot de Telegram:', error);
    return res.status(200).json({ ok: true });
  }
}

// ============ STATS PERSONALES ============
async function sendStatsMessage(chatId, req) {
  try {
    // Llamar a API de stats personales
    const statsResponse = await fetch(`${req.headers.host.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/bot-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId })
    });

    if (!statsResponse.ok) {
      throw new Error('Error obteniendo stats');
    }

    const stats = await statsResponse.json();

    await sendTelegramMessage(chatId,
      `📊 *Mis Estadísticas:*\n\n` +
      `*📈 Mis Verificaciones Históricas:*\n` +
      `🔍 URLs verificadas: ${stats.totalHistorico || 0}\n` +
      `✅ Confiables: ${stats.confiablesHistorico || 0}\n` +
      `⚠️ Dudosas: ${stats.dudosasHistorico || 0}\n` +
      `❌ Falsas: ${stats.falsasHistorico || 0}\n\n` +
      `*📅 Mis Verificaciones - Hoy:*\n` +
      `🔍 URLs verificadas: ${stats.totalHoy || 0}\n` +
      `✅ Confiables: ${stats.confiablesHoy || 0}\n` +
      `⚠️ Dudosas: ${stats.dudosasHoy || 0}\n` +
      `❌ Falsas: ${stats.falsasHoy || 0}\n\n` +
      `_Actualizadas en tiempo real_`,
      'Markdown'
    );
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    await sendTelegramMessage(chatId,
      `❌ Error al obtener estadísticas. Intenta de nuevo.`
    );
  }
}

async function sendTelegramMessage(chatId, text, parseMode = null) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const body = {
    chat_id: chatId,
    text: text
  };

  if (parseMode) {
    body.parse_mode = parseMode;
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function sendTelegramMessageWithButtons(chatId, text, parseMode = null, keyboard = null) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const body = {
    chat_id: chatId,
    text: text
  };

  if (parseMode) {
    body.parse_mode = parseMode;
  }

  if (keyboard) {
    body.reply_markup = keyboard;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  console.log('📱 Respuesta Telegram:', JSON.stringify(result));
  
  if (!result.ok) {
    console.error('❌ Telegram error:', result.description);
  }
}

// Manejar callbacks de botones
async function handleCallback(callback_query, req) {
  const chatId = callback_query.message.chat.id;
  const data = callback_query.data;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  // Responder al callback (quita el "loading" del botón)
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callback_query.id
    })
  });

  // Verificar otra URL
  if (data === 'verify_another') {
    await sendTelegramMessage(chatId, 
      `🔍 *Envíame una URL para verificar*\n\n` +
      `Puedes enviar cualquier link de noticia y te diré si es confiable.`,
      'Markdown'
    );
    return;
  }

  // Reportar como falsa
  if (data.startsWith('report:')) {
    const urlId = data.replace('report:', '');
    
    // 🆕 Obtener URL desde Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: urlData } = await supabase
      .from('pending_reports')
      .select('url')
      .eq('id', urlId)
      .single();
    
    const url = urlData.url;
    
    try {
      await fetch('https://fake-news-verifier.vercel.app/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
      });

      await sendTelegramMessage(chatId,
        `✅ *Reporte enviado*\n\n` +
        `Gracias por ayudarnos a mantener la plataforma segura.`,
        'Markdown'
      );
    } catch (error) {
      console.error('Error reportando:', error);
      await sendTelegramMessage(chatId,
        `❌ Error al enviar el reporte. Intenta de nuevo.`
      );
    }
    return;
  }

  // Mostrar stats PERSONALES desde callback
  if (data === 'show_stats') {
    await sendStatsMessage(chatId, req);
    return;
  }

  // Mostrar ayuda
  if (data === 'show_help') {
    await sendTelegramMessage(chatId,
      `🔍 *Cómo usar el bot:*\n\n` +
      `1️⃣ Envía una URL de noticia\n` +
      `2️⃣ Espera el análisis (5-10 seg)\n` +
      `3️⃣ Recibe el veredicto\n\n` +
      `✅ Verde = Confiable\n` +
      `⚠️ Amarillo = Dudoso\n` +
      `❌ Rojo = Falso\n\n` +
      `🔗 *Acepto links acortados* (bit.ly, t.co, tinyurl, etc.)\n\n` +
      `_Desarrollado para detectar desinformación_`,
      'Markdown'
    );
    return;
  }
}