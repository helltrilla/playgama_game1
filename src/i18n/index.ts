import { en, type Key } from './en';
import { ru } from './ru';

export type Lang = 'en' | 'ru';
export const LANGUAGES: { code: Lang; native: string }[] = [
  { code: 'en', native: 'English' },
  { code: 'ru', native: 'Русский' },
];

const dicts: Record<Lang, Record<Key, string>> = { en, ru };
let current: Lang = 'en';
const listeners: (() => void)[] = [];

export function pickLang(code: string | null | undefined): Lang {
  const c = String(code || '')
    .slice(0, 2)
    .toLowerCase();
  return c === 'ru' ? 'ru' : 'en'; // English is the default and fallback
}

export function setLang(code: Lang): void {
  current = dicts[code] ? code : 'en';
  document.documentElement.lang = current;
  listeners.forEach((l) => l());
}

export function getLang(): Lang {
  return current;
}

export function onLangChange(cb: () => void): void {
  listeners.push(cb);
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = dicts[current][key] ?? en[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

export type { Key };
