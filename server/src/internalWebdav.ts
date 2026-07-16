import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { v2 as webdav } from 'webdav-server';
import { config } from './config.js';

/**
 * Servidor WebDAV real, rodando dentro do mesmo processo/container do backend. Fica só em
 * loopback (127.0.0.1) — nunca é publicado no docker-compose, então não é alcançável de fora do
 * container. O único cliente dele é o nosso próprio webdavClient.ts, via HTTP local.
 */
export async function startInternalWebDAVServer(): Promise<void> {
  const dataDir = resolve(config.dataDir);
  mkdirSync(dataDir, { recursive: true });

  const userManager = new webdav.SimpleUserManager();
  userManager.addUser(config.webdavUsername, config.webdavPassword);

  const server = new webdav.WebDAVServer({
    hostname: '127.0.0.1',
    httpAuthentication: new webdav.HTTPBasicAuthentication(userManager, 'notas'),
    rootFileSystem: new webdav.PhysicalFileSystem(dataDir),
  });

  await server.startAsync(config.internalWebdavPort);
  console.log(
    `WebDAV interno rodando em http://127.0.0.1:${config.internalWebdavPort}/ (dados em ${dataDir})`,
  );
}
