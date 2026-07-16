export interface ServerConfig {
  baseUrl: string;
  token: string;
}

declare global {
  interface Window {
    __NOTES_CONFIG__?: { token?: string };
  }
}

/** O servidor injeta o próprio API_TOKEN na página que ele mesmo serve (ver server/src/index.ts).
 * Cliente e API são sempre a mesma origem — não há URL ou token para configurar. */
export function getServerConfig(): ServerConfig {
  return {
    baseUrl: window.location.origin,
    token: window.__NOTES_CONFIG__?.token ?? '',
  };
}
