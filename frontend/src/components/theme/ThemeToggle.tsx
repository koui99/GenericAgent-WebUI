'use client';

import * as React from 'react';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/provider';

export function ThemeToggle() {
  const { t } = useT();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label={t('theme.toggle')} disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const next = theme === 'dark' ? 'system' : theme === 'light' ? 'dark' : 'light';
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const localize = (v: string) =>
    v === 'dark' ? t('theme.dark') : v === 'light' ? t('theme.light') : t('theme.system');
  const label = t('theme.label', {
    theme: localize(theme ?? 'system'),
    next: localize(next),
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
