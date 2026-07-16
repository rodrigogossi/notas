import { Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cycleThemePreference, getThemePreference, subscribeTheme } from '../theme/theme';

const ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const LABELS = {
  system: 'Tema: automático (do sistema)',
  light: 'Tema: sempre claro',
  dark: 'Tema: sempre escuro',
};

export default function ThemeToggle() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference);
  const Icon = ICONS[preference];

  return (
    <button
      className="icon-button"
      onClick={cycleThemePreference}
      aria-label={`${LABELS[preference]} — clique para trocar`}
      title={LABELS[preference]}
    >
      <Icon size={15} />
    </button>
  );
}
