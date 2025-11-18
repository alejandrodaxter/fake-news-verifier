# 🚀 FakeNews - Plan de Desarrollo

## ✅ Completado

### Día 1: Historial y Estadísticas (9 Nov 2024)
- [x] Historial de verificaciones con localStorage
- [x] Estadísticas visuales (confiables/dudosas/falsas)
- [x] Botones: Abrir URL y Re-verificar
- [x] Scroll limitado (300px)
- [x] UI mejorada con score visual
- **Deploy:** https://fake-news-verifier.vercel.app/

## 🔨 En progreso

### Día 2: Bot de Telegram (10 Nov 2024)
- [x] Configurar bot con BotFather
- [x] Crear endpoint `/api/telegram.js`
- [x] Integrar con verificador backend
- [x] Comandos: /start, /help, /stats
- [x] Verificación de URLs en tiempo real
- [x] Formato profesional con emojis y Markdown
- [x] Variables de entorno seguras
- [] Meter inline buttons (como “Ver análisis”, “Reportar”, “¿Otro link?”).
- [] Guardar historial por usuario.
- [] Meter un sistema de “score global por dominio”.
- [] Enviar imágenes generadas tipo tarjetas de verificación.
- [] Hacer un “/top_fake” con los enlaces más falsos de la semana.
- **Bot:** @FakeNews_verificador_bot
- **Features:** Responde en <10seg, análisis completo, recomendaciones
--// Needs an upgrade

## 📅 Próximos

### Día 3: Sistema de Reportes (11 Nov 2024)
- [x] Base de datos (Supabase)
- [x] Botón "Reportar como falsa" - Como hacer si reportan real como falsa?
- [x] Contador de reportes
- [x] Mostrar URLs más reportadas

### Día 4-5: Extensión de Chrome (12-13 Nov)
- [x] Manifest.json
- [x] Content script para detectar links
- [x] Badge visual (✅⚠️❌)
- [x] Popup con análisis detallado
- [?] Publicar en Chrome Web Store (opcional)
- [] Pulir la UI de la extensión
- [] Mejorar el popup
- [] Preparar la carpeta manifest.json para Chrome Web Store
- [] Hacer el icono 128x128
- [] Ponerle animaciones
- [] Añadir estadísticas al popup
- [] Meter verificación automática al cargar una página
- [] Añadir un “panel lateral” tipo NewsGuard
- [] Añadir comentarios/razones visibles directamente en la página
- [] Añadir overlay sobre títulos falsos

### Día 6: Landing mejorada (14 Nov)
- [x] Contador global de verificaciones
- [x] Sección "¿Cómo funciona?"
- [x] Ejemplos de URLs
- [x] Testimonios
- [x] FAQ
- [] Revisar todos los textos para que solo suelte info relevante a la gente (Verificadores:Página web, chat_bot, Extension de google chrome)
- [] Revisar links de telefono Ej: Señora vieja recibe un link de "hola tu pedido tal se retraso" o "intentan acceder  a tu cuenta entra a"(Posible categorizacion e identificacion de las solicitudes a traves de un menu -Ej- *Bancos *Pedidos *Alguien intento acceder a tu cuenta *Ganaste!)
- [] Migrar UI del diseño de cloud 2da cuenta(a.l.c98). Tiene mejor display de la informacion final para el usuario.

### Día 7: Final (15 Nov)
- [ ] Testing completo
- [ ] Video demo (2-3 min)
- [ ] README actualizado
- [ ] Presentación PowerPoint
- [ ] Ensayo de pitch
- [ ] Preguntar por verificador, bendito sea mi dios

---

## 📊 Métricas actuales

- **Commits:** 6
- **Features:** 5
- **Líneas de código:** ~500
- **APIs integradas:** 2 (Google Fact Check, NewsAPI)

## 🎯 Objetivo

Verificador de fake news más completo que el otro grupo, con:
- ✅ Producto funcionando (no solo PowerPoint)
- ✅ Bot de WhatsApp
- ✅ Extensión de Chrome
- ✅ Sistema de reportes comunitario