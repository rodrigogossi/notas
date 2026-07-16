import 'dotenv/config';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createCrudRouter } from './crudRouter.js';
import { subscribeToEvents } from './events.js';
import { startInternalWebDAVServer } from './internalWebdav.js';
import { authMiddleware } from './middleware/auth.js';
import { checkHealth, ensureDir } from './webdavClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isValidNote(body: Record<string, unknown>): boolean {
  return typeof body.type === 'string' && typeof body.title === 'string';
}

function isValidFolder(body: Record<string, unknown>): boolean {
  return typeof body.name === 'string';
}

const app = express();
app.use(cors({ origin: config.allowedOrigin }));
app.use(express.json({ limit: '10mb' }));

app.use('/api', authMiddleware);

app.get('/api/health', async (_req, res) => {
  const webdavOk = await checkHealth();
  res.json({ ok: webdavOk });
});

// notificação em tempo real: clientes conectados recebem um aviso assim que algo muda, em vez de
// esperar o próximo ciclo periódico de sincronização
app.get('/api/events', subscribeToEvents);

app.use(
  '/api/notes',
  createCrudRouter({ dir: config.notesDir, collection: 'notes', validate: isValidNote }),
);
app.use(
  '/api/folders',
  createCrudRouter({ dir: config.foldersDir, collection: 'folders', validate: isValidFolder }),
);

if (process.env.SERVE_CLIENT === 'true') {
  const clientDist = path.join(__dirname, '..', 'public');
  const indexHtmlPath = path.join(clientDist, 'index.html');

  // O cliente não sabe o token de antemão — o próprio servidor o injeta na página que ele serve
  // (mesma origem, mesmo container), então o app já abre autenticado sem precisar configurar nada.
  function renderIndexHtml(): string {
    const html = readFileSync(indexHtmlPath, 'utf8');
    const injected = JSON.stringify({ token: config.apiToken });
    return html.replace('{"token":""}', injected);
  }

  app.use(express.static(clientDist, { index: false }));
  app.use((_req, res) => {
    res.type('html').send(renderIndexHtml());
  });
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: 'bad_request' });
};
app.use(errorHandler);

startInternalWebDAVServer()
  .then(() => Promise.all([ensureDir(config.notesDir), ensureDir(config.foldersDir)]))
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Servidor rodando na porta ${config.port}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao inicializar o servidor WebDAV interno:', err);
    process.exit(1);
  });
