/**
 * crypto.randomUUID() só existe em contexto seguro (HTTPS ou localhost) — em HTTP puro numa
 * outra máquina da rede local (ex: acessar pelo IP a partir do tablet) ele nem existe, e a
 * chamada lança um erro. crypto.getRandomValues() não tem essa restrição, então usamos ele como
 * base em vez de depender de randomUUID.
 */
export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
