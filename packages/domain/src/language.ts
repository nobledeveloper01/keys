/**
 * Backhaul in four languages.
 *
 * English, **Hausa**, **Yoruba** and **Igbo** — the three languages that,
 * with English, cover most of the people who will use this. Not a
 * localisation framework: four tables of the same shape, held to each other by
 * the type system and by tests.
 *
 * It began as the driver face alone, on the argument that the shipper and
 * fleet screens are dense, changing, and read by people who work in English
 * every day. That argument was overruled, and rightly: a cargo owner in
 * Onitsha is not obliged to work in English because their screen happens to be
 * denser than a driver's, and the product asking which language somebody wants
 * *before* it asks them anything else is the whole difference between an app
 * built for this market and one translated into it.
 *
 * ## Three rules that shape every line below
 *
 * 1. **No interpolation.** Word order differs between these four languages,
 *    and a template with a hole in it assumes it does not. Numbers, names and
 *    money are rendered *beside* a phrase, never inside one.
 * 2. **No fallback chain.** `Record<Phrase, string>` means a missing key is a
 *    compile error. A fallback would let a screen quietly show English to an
 *    Igbo reader, and nobody would ever find out.
 * 3. **The diacritics are the words.** Hausa's ɓ ɗ ƙ, Yoruba's ẹ ọ ṣ, Igbo's
 *    ị ọ ụ ṅ are not decoration — dropping them changes the word or destroys
 *    it. A product that writes a language carelessly is saying what it thinks
 *    of the people who read it.
 *
 * ## What has not happened
 *
 * **None of these three tables has been read by somebody who speaks the
 * language.** They are careful, they are consistent, and they are not a
 * substitute for a native speaker — Yoruba and Igbo are tonal, and this
 * orthography carries tone only partially. It ships behind a review, and that
 * review is a person rather than a task. `docs/ROADMAP.md` holds it open.
 */

export type Language = 'en' | 'ha' | 'yo' | 'ig';

/**
 * Every phrase, grouped by where it is read.
 *
 * Grouped rather than alphabetical so that "is this screen covered?" is a
 * question somebody can answer by looking. A new screen adds a block; a block
 * with nothing in it is visible.
 */
export type Phrase =
  | 'app_name'
  | 'try_again'
  | 'something_went_wrong'
  | 'no_signal'
  | 'loading'
  | 'verified'
  | 'not_verified'
  | 'report_a_number'
  | 'check_a_number'
  | 'no_reports_found'
  | 'this_number_was_reported'
  | 'under_review'
  | 'search'
  | 'close';

export const EN: Readonly<Record<Phrase, string>> = {
  app_name: "Keys",
  try_again: "Try again",
  something_went_wrong: "Something went wrong.",
  no_signal: "No signal",
  loading: "Loading",
  verified: "Verified",
  not_verified: "Not verified",
  report_a_number: "Report a number",
  check_a_number: "Check a number",
  no_reports_found: "No reports found",
  this_number_was_reported: "This number has been reported",
  under_review: "Under review",
  search: "Search",
  close: "Close",
};

export const HA: Readonly<Record<Phrase, string>> = {
  app_name: "Keys",
  try_again: "Sake gwadawa",
  something_went_wrong: "An sami matsala.",
  no_signal: "Babu sigina",
  loading: "Ana lodi",
  verified: "An tabbatar",
  not_verified: "Ba a tabbatar ba",
  report_a_number: "Ka kai ƙarar lamba",
  check_a_number: "Duba lamba",
  no_reports_found: "Ba a sami ƙara ba",
  this_number_was_reported: "An kai ƙarar wannan lambar",
  under_review: "Ana duba shi",
  search: "Bincika",
  close: "Rufe",
};

export const YO: Readonly<Record<Phrase, string>> = {
  app_name: "Keys",
  try_again: "Gbìyànjú lẹ́ẹ̀kansi",
  something_went_wrong: "Ìṣòro kan ṣẹlẹ̀.",
  no_signal: "Kò sí sìgnà",
  loading: "Ń gbé wọlé",
  verified: "A ti fọwọ́sí",
  not_verified: "A kò tíì fọwọ́sí",
  report_a_number: "Ròyìn nọ́mbà kan",
  check_a_number: "Ṣàyẹ̀wò nọ́mbà kan",
  no_reports_found: "Kò sí ìròyìn kankan",
  this_number_was_reported: "A ti ròyìn nọ́mbà yìí",
  under_review: "À ń yẹ̀ ẹ́ wò",
  search: "Wá",
  close: "Tì í",
};

export const IG: Readonly<Record<Phrase, string>> = {
  app_name: "Keys",
  try_again: "Nwaa ọzọ",
  something_went_wrong: "Enwere nsogbu.",
  no_signal: "Enweghị sịgnal",
  loading: "Na-ebugo",
  verified: "A kwadoro ya",
  not_verified: "A kwadobeghị ya",
  report_a_number: "Kọọ nọmba",
  check_a_number: "Lelee nọmba",
  no_reports_found: "Ọ dịghị mkpesa a hụrụ",
  this_number_was_reported: "A kọọla nọmba a",
  under_review: "A na-enyocha ya",
  search: "Chọọ",
  close: "Mechie",
};

const TABLES: Readonly<Record<Language, Readonly<Record<Phrase, string>>>> = {
  en: EN,
  ha: HA,
  yo: YO,
  ig: IG,
};

export function say(language: Language, phrase: Phrase): string {
  return TABLES[language][phrase];
}

/** Every phrase at once, for a screen that wants them all. */
export function phrases(language: Language): Readonly<Record<Phrase, string>> {
  return TABLES[language];
}

/**
 * What each language is called, in itself.
 *
 * Never "Yoruba (Nigeria)" and never an English exonym. A person picking their
 * language should find it written the way they write it.
 */
export function describeLanguage(language: Language): string {
  switch (language) {
    case 'ha':
      return 'Hausa';
    case 'yo':
      return 'Yorùbá';
    case 'ig':
      return 'Igbo';
    case 'en':
      return 'English';
  }
}

/**
 * The languages on offer, English last.
 *
 * Deliberately not alphabetical and deliberately not English-first: this list
 * is read by somebody who has just opened the app, and putting English at the
 * top makes the other three look like an afterthought bolted on for them.
 */
export const LANGUAGES: readonly Language[] = ['ha', 'yo', 'ig', 'en'];

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ha' || value === 'yo' || value === 'ig';
}
