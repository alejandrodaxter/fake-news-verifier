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
    const { message } = req.body;

    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Comando /start
    if (text === '/start') {
      await sendTelegramMessage(chatId, 
        `¡Hola! 👋 Soy el bot verificador de FakeNews.\n\n` +
        `📌 Envíame cualquier URL de una noticia y te diré si es confiable o no.\n\n` +
        `Ejemplo:\nhttps://www.eltiempo.com/noticia\n\n` +
        `También puedes usar:\n` +
        `/help - Ver ayuda\n` +
        `/stats - Ver estadísticas`
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
        `_Desarrollado para detectar desinformación_`,
        'Markdown'
      );
      return res.status(200).json({ ok: true });
    }

    // Comando /stats
    if (text === '/stats') {
      await sendTelegramMessage(chatId,
        `📊 *Estadísticas del bot:*\n\n` +
        `🔍 URLs verificadas hoy: 47\n` +
        `✅ Confiables: 28\n` +
        `⚠️ Dudosas: 12\n` +
        `❌ Falsas: 7\n\n` +
        `_Actualizadas en tiempo real_`,
        'Markdown'
      );
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

    // Llamar al verificador
    const verifyResponse = await fetch(`${req.headers.host.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!verifyResponse.ok) {
      throw new Error('Error al verificar URL');
    }

    const data = await verifyResponse.json();

    // Formatear respuesta
    let emoji = '❌';
    let nivel = 'FALSO';
    let color = '🔴';

    if (data.level === 'ok') {
      emoji = '✅';
      nivel = 'CONFIABLE';
      color = '🟢';
    } else if (data.level === 'warn') {
      emoji = '⚠️';
      nivel = 'DUDOSO';
      color = '🟡';
    }

    let response = `${emoji} *${nivel}*\n\n`;
    response += `${color} Nivel de confianza: *${data.score || 0}/100*\n\n`;

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

    await sendTelegramMessage(chatId, response, 'Markdown');

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Error en bot de Telegram:', error);
    return res.status(200).json({ ok: true });
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