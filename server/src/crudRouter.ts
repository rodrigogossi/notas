import { Router } from 'express';
import { broadcastChange } from './events.js';
import { listIds, readItem, writeItem } from './webdavClient.js';

interface CrudRouterOptions {
  dir: string;
  collection: string;
  validate: (body: Record<string, unknown>) => boolean;
}

/**
 * Monta manifest/get/put/delete sobre um diretório do WebDAV interno. Notas e pastas usam
 * exatamente o mesmo formato de sincronização (soft-delete via `deletedAt`, `updatedAt` sempre
 * atribuído pelo servidor) — só o diretório e a validação do corpo mudam.
 */
export function createCrudRouter({ dir, collection, validate }: CrudRouterOptions): Router {
  const router = Router();

  router.get('/manifest', async (_req, res) => {
    try {
      const ids = await listIds(dir);
      res.json(ids.map((id) => ({ id })));
    } catch {
      res.status(502).json({ error: 'webdav_unreachable' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const item = await readItem(dir, req.params.id);
      res.json(item);
    } catch {
      res.status(404).json({ error: 'not_found' });
    }
  });

  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body as Record<string, unknown> | null;
    if (!body || !validate(body)) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const now = new Date().toISOString();
    const item = {
      ...body,
      id,
      createdAt: body.createdAt ?? now,
      updatedAt: now, // sempre atribuído pelo servidor, nunca confiar no cliente
      deletedAt: body.deletedAt ?? null,
    };
    try {
      await writeItem(dir, id, item);
      res.json(item);
      broadcastChange(collection, id);
    } catch {
      res.status(502).json({ error: 'webdav_write_failed' });
    }
  });

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    let existing: Record<string, unknown>;
    try {
      existing = (await readItem(dir, id)) as Record<string, unknown>;
    } catch {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const now = new Date().toISOString();
    const item = { ...existing, id, deletedAt: now, updatedAt: now };
    try {
      await writeItem(dir, id, item);
      res.json(item);
      broadcastChange(collection, id);
    } catch {
      res.status(502).json({ error: 'webdav_write_failed' });
    }
  });

  return router;
}
