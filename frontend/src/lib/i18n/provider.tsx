'use client';

import * as React from 'react';

import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, isLocale } from './config';
import { format, messages, type MessageKey } from './messages';

type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslateFn;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

function writeCookie(locale: Locale) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    writeCookie(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
    }
  }, []);

  const t = React.useCallback<TranslateFn>(
    (key, params) => {
      const dict = messages[locale];
      const template = dict[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
      return format(template, params);
    },
    [locale]
  );

  const value = React.useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    const fallback: TranslateFn = (key, params) => {
      const template = messages[DEFAULT_LOCALE][key] ?? key;
      return format(template, params);
    };
    return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: fallback };
  }
  return ctx;
}

export function readClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return isLocale(match?.[1]) ? (match![1] as Locale) : DEFAULT_LOCALE;
}
