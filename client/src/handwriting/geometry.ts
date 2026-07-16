type Point = [x: number, y: number, pressure: number];

/** Só vale registrar um novo ponto de amostragem se ele estiver longe o bastante do anterior. */
export function isFarEnough(a: Point, b: Point, minDistance = 1.5): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) >= minDistance;
}
