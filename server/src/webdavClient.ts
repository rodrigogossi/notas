import { createClient } from 'webdav';
import { config } from './config.js';

const client = createClient(config.webdavUrl, {
  username: config.webdavUsername,
  password: config.webdavPassword,
});

function normalizeDir(dir: string): string {
  return dir.endsWith('/') ? dir : `${dir}/`;
}

function itemPath(dir: string, id: string) {
  return `${normalizeDir(dir)}${id}.json`;
}

function tempItemPath(dir: string, id: string) {
  return `${normalizeDir(dir)}${id}.json.tmp`;
}

export async function ensureDir(dir: string): Promise<void> {
  try {
    await client.createDirectory(normalizeDir(dir), { recursive: true });
  } catch {
    // já existe — ok
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    await client.stat(normalizeDir(config.notesDir));
    return true;
  } catch {
    return false;
  }
}

export async function listIds(dir: string): Promise<string[]> {
  const contents = await client.getDirectoryContents(normalizeDir(dir));
  return contents
    .filter((item) => item.type === 'file' && item.basename.endsWith('.json'))
    .map((item) => item.basename.replace(/\.json$/, ''));
}

export async function readItem(dir: string, id: string): Promise<unknown> {
  const raw = await client.getFileContents(itemPath(dir, id), { format: 'text' });
  return JSON.parse(raw as string);
}

async function putWithRetry(path: string, body: string, attempt = 0): Promise<void> {
  try {
    await client.putFileContents(path, body, {
      overwrite: true,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 423 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return putWithRetry(path, body, attempt + 1);
    }
    throw err;
  }
}

export async function writeItem(dir: string, id: string, item: unknown): Promise<void> {
  const body = JSON.stringify(item);
  const tmp = tempItemPath(dir, id);
  await putWithRetry(tmp, body);
  await client.moveFile(tmp, itemPath(dir, id), { overwrite: true });
}
