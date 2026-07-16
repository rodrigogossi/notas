import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  // EventSource (usado por /api/events) não deixa definir headers customizados — só essa rota
  // realmente depende do token vir por query string, mas aceitar nas demais não abre brecha nova
  // (quem já tem o token pelo header também poderia simplesmente usá-lo aqui).
  const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
  if (header !== `Bearer ${config.apiToken}` && queryToken !== config.apiToken) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}
