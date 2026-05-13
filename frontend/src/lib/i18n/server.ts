import { cookies } from 'next/headers';

import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, isLocale } from './config';
import { format, messages, type MessageKey } from './messages';

export function getServerLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getServerT() {
  const locale = getServerLocale();
  const dict = messages[locale];
  const t = (key: MessageKey, params?: Record<string, string | number>) => {
    const template = dict[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    return format(template, params);
  };
  return { locale, t };
}
