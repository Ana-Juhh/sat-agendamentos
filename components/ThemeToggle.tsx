'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
type ThemeToggleProps = {
  variant?: 'floating' | 'inline';
};

const STORAGE_KEY = 'site-theme';
const THEME_EVENT = 'site-theme-change';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  }

  function handleThemeChange() {
    callback();
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener(THEME_EVENT, handleThemeChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(THEME_EVENT, handleThemeChange);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle({ variant = 'floating' }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, () => 'light');

  function handleToggle() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';

    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  const label = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={variant === 'inline' ? 'theme-toggle theme-toggle--inline' : 'theme-toggle'}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </span>
      <span className="theme-toggle__text">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
    </button>
  );
}
