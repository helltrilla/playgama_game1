import { describe, it, expect } from 'vitest';
import { en } from '../../src/i18n/en';
import { ru } from '../../src/i18n/ru';

describe('AC-LOC-1 & AC-LOC-2: Localization validation', () => {
  it('AC-LOC-1: Every key in en exists in ru and vice versa', () => {
    const enKeys = Object.keys(en).sort();
    const ruKeys = Object.keys(ru).sort();

    const missingInRu = enKeys.filter((k) => !(k in ru));
    const missingInEn = ruKeys.filter((k) => !(k in en));

    expect(missingInRu).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(enKeys.length).toBe(ruKeys.length);
  });

  it('AC-LOC-2: No forbidden gambling words in either dictionary', () => {
    const banned = [
      'casino',
      'казино',
      'bet',
      'ставк',
      'пари',
      'jackpot',
      'джекпот',
      'slot',
      'слот',
      'gamble',
      'рулетк',
    ];

    const checkDict = (dict: Record<string, string>, lang: string) => {
      for (const [key, text] of Object.entries(dict)) {
        const lower = text.toLowerCase();
        for (const word of banned) {
          const re = new RegExp(`\\b${word}`, 'i');
          const matched = re.test(lower);
          expect(
            matched,
            `Banned word "${word}" found in ${lang} translation under key "${key}": "${text}"`,
          ).toBe(false);
        }
      }
    };

    checkDict(en, 'en');
    checkDict(ru, 'ru');
  });
});
