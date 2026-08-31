import type { Language } from '@keys/domain';

/**
 * Each language written in itself, never translated.
 *
 * Somebody looking for their language is looking for the word *they* would
 * write, not for "Hausa" rendered in Yoruba for a reader who does not yet read
 * Yoruba. English is last on purpose: putting it first makes the other three
 * look like an afterthought.
 *
 * Its own module because two screens need it — the first-run picker and the
 * settings screen — and a second copy is a second place somebody adds a fifth
 * language to.
 */
// untranslated-check: these are the four language names, each already written
// in its own language. Putting them through `say()` would mean translating the
// word "Hausa" into Yoruba for somebody who is looking for the word "Hausa".
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  ha: 'Hausa',
  yo: 'Yorùbá',
  ig: 'Igbo',
  en: 'English',
};
