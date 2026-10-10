'use client';

import { useEffect, useState } from 'react';

/** Where the choice is kept. Read again by the script in the root layout, before the first paint. */
export const THEME_KEY = 'sw_theme';

type Choice = 'system' | 'light' | 'dark';
const CHOICES: Array<{ value: Choice; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
}

/**
 * System, Light or Dark, for this browser only. The page renders "System"
 * first and corrects itself once it can read the stored choice, so the server
 * and the browser agree on the first render.
 */
export function ThemeSwitch() {
  const [choice, setChoice] = useState<Choice>('system');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') setChoice(saved);
    } catch { /* storage blocked: stay on System */ }
  }, []);

  function choose(next: Choice) {
    setChoice(next);
    apply(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch { /* storage blocked: the choice lasts until the page is left */ }
  }

  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {CHOICES.map((c) => (
        <button key={c.value} type="button" aria-pressed={choice === c.value} onClick={() => choose(c.value)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
