export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'notas.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function systemTheme(): EffectiveTheme {
  return media.matches ? 'dark' : 'light';
}

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

let preference: ThemePreference = readStoredPreference();
const listeners = new Set<() => void>();

function applyToDocument(): void {
  const root = document.documentElement;
  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }
}

function notify(): void {
  applyToDocument();
  listeners.forEach((listener) => listener());
}

export function getThemePreference(): ThemePreference {
  return preference;
}

export function getEffectiveTheme(): EffectiveTheme {
  return preference === 'system' ? systemTheme() : preference;
}

export function setThemePreference(next: ThemePreference): void {
  preference = next;
  if (next === 'system') localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, next);
  notify();
}

const CYCLE_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export function cycleThemePreference(): void {
  const next = CYCLE_ORDER[(CYCLE_ORDER.indexOf(preference) + 1) % CYCLE_ORDER.length];
  setThemePreference(next);
}

export function subscribeTheme(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

applyToDocument();
media.addEventListener('change', () => {
  if (preference === 'system') notify();
});
