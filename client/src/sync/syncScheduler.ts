/**
 * Registro simples de "quem sincroniza" — existe separado de syncEngine.ts pra evitar import
 * circular (pendingOps.ts precisa disparar uma sincronização ao enfileirar uma edição, e
 * syncEngine.ts já importa de pendingOps.ts).
 */
let trigger: (() => void) | null = null;
let timeout: ReturnType<typeof setTimeout> | null = null;

export function registerSyncTrigger(fn: () => void): void {
  trigger = fn;
}

/** Dispara uma sincronização pouco depois da última chamada (debounce) — usado após edições
 * locais, pra empurrar pro servidor rápido sem disparar uma sincronização a cada tecla digitada. */
export function scheduleSync(delayMs = 1500): void {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    timeout = null;
    trigger?.();
  }, delayMs);
}
