'use client';

import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/provider';

export function LanguageToggle() {
  const { locale, setLocale, t } = useT();
  const next = locale === 'zh' ? 'en' : 'zh';
  const nextLabel = next === 'zh' ? '中文' : 'EN';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setLocale(next)}
      aria-label={t('language.toggle')}
      title={t('language.toggle')}
      className="text-xs font-medium"
    >
      {nextLabel}
    </Button>
  );
}
