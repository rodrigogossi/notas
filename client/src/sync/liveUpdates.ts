import { getServerConfig } from '../config/serverConfig';
import { syncNow } from './syncEngine';

/**
 * Notificação em tempo real via Server-Sent Events: o servidor avisa assim que uma nota ou pasta
 * muda (em qualquer dispositivo), e a gente sincroniza na hora em vez de esperar o próximo ciclo
 * periódico. EventSource já reconecta sozinho se a conexão cair.
 */
export function startLiveUpdates(): void {
  const { baseUrl, token } = getServerConfig();
  if (!baseUrl) return;

  // EventSource não permite header customizado — só essa conexão manda o token pela URL.
  const url = `${baseUrl}/api/events?token=${encodeURIComponent(token)}`;
  const eventSource = new EventSource(url);
  eventSource.onmessage = () => {
    void syncNow();
  };
}
