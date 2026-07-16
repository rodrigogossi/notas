import type { Request, Response } from 'express';

/**
 * Notificação em tempo real (Server-Sent Events): quando uma nota ou pasta muda, todo cliente
 * conectado recebe um aviso e dispara sua própria sincronização na hora, em vez de esperar o
 * próximo ciclo periódico. Um único processo Node, então basta manter a lista de conexões em
 * memória — não precisa de pub/sub externo.
 */
const clients = new Set<Response>();

export function subscribeToEvents(_req: Request, res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function broadcastChange(collection: string, id: string): void {
  const payload = JSON.stringify({ collection, id });
  for (const res of clients) {
    res.write(`data: ${payload}\n\n`);
  }
}
