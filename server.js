import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import verifyHandler from './public/api/verify.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware para JSON
app.use(express.json());

// Servir archivos estáticos (HTML, CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para la API de verificación
app.post('/api/verify', verifyHandler);

// Ruta explícita para la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});