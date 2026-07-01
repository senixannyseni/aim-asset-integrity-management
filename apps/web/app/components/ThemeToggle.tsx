'use client';

import { useTheme, type ThemePreference } from './ThemeProvider';

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
];

export default function ThemeToggle() {
  const { preference, setPreference, resolvedTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label={`Theme selection. Current theme is ${resolvedTheme}.`}>
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={preference === option.value ? 'theme-toggle__button is-active' : 'theme-toggle__button'}
          aria-pressed={preference === option.value}
          title={`Use ${option.label} theme`}
          onClick={() => setPreference(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
