import type { EffectiveTheme } from '../theme/theme';

/**
 * A "caneta preta" é adaptativa como no Apple Notes: em vez de gravar sempre o mesmo hexadecimal,
 * o traço guarda um dos dois valores conhecidos (claro ou escuro) e, na hora de desenhar, sempre
 * resolvemos para o valor certo do tema ATUAL — inclusive traços antigos desenhados sob o outro
 * tema, que assim também aparecem corrigidos.
 */
export const ADAPTIVE_INK: Record<EffectiveTheme, string> = {
  light: '#1a1a1a',
  dark: '#f2f2f2',
};

export function isAdaptiveInk(color: string): boolean {
  return color === ADAPTIVE_INK.light || color === ADAPTIVE_INK.dark;
}

export function resolveStrokeColor(color: string, theme: EffectiveTheme): string {
  return isAdaptiveInk(color) ? ADAPTIVE_INK[theme] : color;
}
