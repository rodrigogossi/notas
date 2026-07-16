import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const internalWebdavPort = Number(process.env.INTERNAL_WEBDAV_PORT ?? 8080);
const dataDir = process.env.DATA_DIR ?? './data';

/**
 * Essa imagem é distribuída publicamente (Docker Hub) — não faz sentido ter uma senha/token
 * padrão fixo no código (qualquer um que baixasse a imagem saberia o valor). Se a variável de
 * ambiente não foi definida, gera um valor aleatório e grava em DATA_DIR na primeira execução,
 * reaproveitando o mesmo valor nas próximas (senão o WebDAV interno e o token da API mudariam a
 * cada reinício do container).
 */
function persistedSecret(filename: string, envValue: string | undefined): string {
  if (envValue) return envValue;
  mkdirSync(dataDir, { recursive: true });
  const filePath = path.join(dataDir, filename);
  if (existsSync(filePath)) return readFileSync(filePath, 'utf8').trim();
  const value = randomBytes(24).toString('hex');
  writeFileSync(filePath, value, { mode: 0o600 });
  console.log(`[config] Gerado automaticamente e salvo em ${filePath}.`);
  return value;
}

export const config = {
  // diretório físico onde as notas são gravadas de fato (mapeado para o volume Docker escolhido
  // pelo usuário no docker-compose.yml)
  dataDir,
  internalWebdavPort,
  webdavUsername: process.env.WEBDAV_USERNAME ?? 'notas',
  webdavPassword: persistedSecret('.webdav-password', process.env.WEBDAV_PASSWORD),
  // servidor WebDAV interno (mesmo processo/container) — só acessível via loopback, nunca
  // exposto fora do container
  webdavUrl: process.env.WEBDAV_URL ?? `http://127.0.0.1:${internalWebdavPort}/`,
  notesDir: process.env.WEBDAV_NOTES_DIR ?? '/Notes',
  foldersDir: process.env.WEBDAV_FOLDERS_DIR ?? '/Folders',
  apiToken: persistedSecret('.api-token', process.env.API_TOKEN),
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
  port: Number(process.env.PORT ?? 4000),
};
