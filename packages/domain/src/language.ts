import type { ReportCategory } from './reports.ts';

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
  | 'close'
  | 'back'
  | 'clear_the_search'
  | 'loading_state'
  | 'selected_tap_to_remove'
  | 'tap_to_filter_by_this'
  | 'appearance_light'
  | 'appearance_dark'
  | 'appearance_auto'
  | 'cannot_reach_the_server'
  | 'it_is_still_there'
  | 'the_server_said_no'
  | 'saved_here_will_send'
  | 'waiting_to_send'
  | 'check_a_number_hint'
  | 'check_a_number_help'
  | 'not_a_nigerian_number'
  | 'nothing_upheld'
  | 'not_a_clean_bill'
  | 'reviewed_by_a_person'
  | 'upheld_reports'
  | 'one_upheld_report'
  | 'report_this_number'
  | 'no_reports_yet_detail'
  | 'lede_registry'
  | 'claims_note'
  | 'category_fake_listing'
  | 'category_inspection_fee_scam'
  | 'category_property_already_let'
  | 'category_impersonation'
  | 'category_undisclosed_fees'
  | 'category_no_show'
  | 'no_signal_saved_here'
  | 'refused_reply_window_open'
  | 'refused_no_evidence'
  | 'refused_already_decided';

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
  back: "Back",
  clear_the_search: "Clear the search",
  loading_state: "Loading",
  selected_tap_to_remove: "Selected. Tap to remove.",
  tap_to_filter_by_this: "Tap to filter by this.",
  appearance_light: "Light",
  appearance_dark: "Dark",
  appearance_auto: "Match my phone",
  cannot_reach_the_server: "We cannot reach Keys",
  it_is_still_there: "Your reports are still there. This phone cannot see them right now.",
  the_server_said_no: "That did not go through",
  saved_here_will_send: "Saved on this phone. It will send when you have signal.",
  no_signal_saved_here: "No signal",
  refused_reply_window_open: "The seven days are not up yet.",
  refused_no_evidence: "There is nothing attached to assess.",
  refused_already_decided: "Somebody has already decided this one.",
  waiting_to_send: "waiting to send",
  check_a_number_hint: "0803 123 4567",
  check_a_number_help: "Any format. 0803…, +234 803…, or 803….",
  not_a_nigerian_number: "That does not look like a Nigerian phone number.",
  nothing_upheld: "No upheld reports against this number.",
  not_a_clean_bill: "That is not a clean bill of health. Most scams are never reported. Pay nothing before you have seen the place and met the person.",
  reviewed_by_a_person: "Each of these was reviewed by a person, and whoever holds this number had seven days to answer.",
  upheld_reports: "upheld reports",
  one_upheld_report: "One upheld report against this number.",
  report_this_number: "Report this number",
  no_reports_yet_detail: "Type a number above to check it. No account needed.",
  lede_registry: "Reports of rental scams in Nigeria. A person reviews each one before it appears here.",
  claims_note: "Keys checks authority to let, not ownership, and handles no money.",
  category_fake_listing: "The property did not exist",
  category_inspection_fee_scam: "An inspection fee for a viewing that never happened",
  category_property_already_let: "The property had already been let",
  category_impersonation: "Pretended to be an agent or landlord they were not",
  category_undisclosed_fees: "Fees that were never mentioned",
  category_no_show: "Took the appointment and never turned up",
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
  back: "Koma baya",
  clear_the_search: "Share bincike",
  loading_state: "Ana ɗauka",
  selected_tap_to_remove: "An zaɓa. Danna don cirewa.",
  tap_to_filter_by_this: "Danna don tace da wannan.",
  appearance_light: "Haske",
  appearance_dark: "Duhu",
  appearance_auto: "Kamar wayata",
  cannot_reach_the_server: "Ba mu iya isa Keys",
  it_is_still_there: "Rahotanninka na nan. Wannan wayar ba ta ganin su yanzu.",
  the_server_said_no: "Wannan bai wuce ba",
  saved_here_will_send: "An ajiye a wannan wayar. Za a aika idan an sami sigina.",
  no_signal_saved_here: "Babu sigina",
  refused_reply_window_open: "Kwanaki bakwai ba su cika ba tukuna.",
  refused_no_evidence: "Babu wata shaida da aka haɗa.",
  refused_already_decided: "An riga an yanke hukunci a kan wannan.",
  waiting_to_send: "na jiran aikawa",
  check_a_number_hint: "0803 123 4567",
  check_a_number_help: "Kowace sura. 0803…, +234 803…, ko 803….",
  not_a_nigerian_number: "Wannan bai yi kama da lambar wayar Najeriya ba.",
  nothing_upheld: "Babu rahoton da aka tabbatar a kan wannan lambar.",
  not_a_clean_bill: "Wannan ba shaidar tsafta ba ce. Yawancin zamba ba a taɓa ba da rahoto ba. Kada ka biya kafin ka ga wurin ka kuma sadu da mutumin.",
  reviewed_by_a_person: "Mutum ne ya duba kowanne, kuma wanda ke da wannan lambar ya sami kwana bakwai don amsawa.",
  upheld_reports: "rahotannin da aka tabbatar",
  one_upheld_report: "Rahoto ɗaya da aka tabbatar a kan wannan lambar.",
  report_this_number: "Ba da rahoton wannan lambar",
  no_reports_yet_detail: "Rubuta lamba a sama don dubawa. Ba a buƙatar asusu.",
  lede_registry: "Rahotannin zamban haya a Najeriya. Mutum yana duba kowanne kafin ya bayyana a nan.",
  claims_note: "Keys yana duba izinin haya, ba mallakar gida ba, kuma ba ya riƙe kuɗi.",
  category_fake_listing: "Gidan bai wanzu ba",
  category_inspection_fee_scam: "Kuɗin dubawa don kallon da bai taɓa faruwa ba",
  category_property_already_let: "An riga an ba da gidan haya",
  category_impersonation: "Sun yi kamar wakili ko mai gida da ba su ba ne",
  category_undisclosed_fees: "Kuɗaɗen da ba a taɓa ambata ba",
  category_no_show: "Sun karɓi alƙawari amma ba su zo ba",
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
  back: "Padà",
  clear_the_search: "Pa àwárí rẹ́",
  loading_state: "Ń gbé wọlé",
  selected_tap_to_remove: "A ti yàn. Tẹ̀ láti yọ kúrò.",
  tap_to_filter_by_this: "Tẹ̀ láti ṣàyẹ̀wò pẹ̀lú èyí.",
  appearance_light: "Ìmọ́lẹ̀",
  appearance_dark: "Òkùnkùn",
  appearance_auto: "Bí fóònù mi",
  cannot_reach_the_server: "A kò lè dé Keys",
  it_is_still_there: "Àwọn ìròyìn rẹ ṣì wà níbẹ̀. Fóònù yìí kò rí wọn báyìí.",
  the_server_said_no: "Èyí kò lọ",
  saved_here_will_send: "A tì í pamọ́ sí fóònù yìí. Yóò lọ nígbà tí o bá ní ìsopọ̀.",
  no_signal_saved_here: "Kò sí ìsopọ̀",
  refused_reply_window_open: "Ọjọ́ méje kò tí ì pé.",
  refused_no_evidence: "Kò sí ẹ̀rí kankan tí a so mọ́ ọn.",
  refused_already_decided: "Ẹnìkan ti pinnu lórí èyí tẹ́lẹ̀.",
  waiting_to_send: "ń dúró láti lọ",
  check_a_number_hint: "0803 123 4567",
  check_a_number_help: "Ìrísí èyíkéyìí. 0803…, +234 803…, tàbí 803….",
  not_a_nigerian_number: "Èyí kò dà bí nọ́mbà fóònù Nàìjíríà.",
  nothing_upheld: "Kò sí ìròyìn tí a fọwọ́sí lórí nọ́mbà yìí.",
  not_a_clean_bill: "Èyí kì í ṣe ẹ̀rí mímọ́. Ọ̀pọ̀ jìbìtì ni a kò ròyìn rí. Má sanwó kí o tó rí ibẹ̀ kí o sì bá ẹni náà pàdé.",
  reviewed_by_a_person: "Ènìyàn ló ṣàyẹ̀wò ọ̀kọ̀ọ̀kan, ẹni tó ní nọ́mbà yìí sì ní ọjọ́ méje láti dáhùn.",
  upheld_reports: "ìròyìn tí a fọwọ́sí",
  one_upheld_report: "Ìròyìn kan tí a fọwọ́sí lórí nọ́mbà yìí.",
  report_this_number: "Ròyìn nọ́mbà yìí",
  no_reports_yet_detail: "Tẹ nọ́mbà sí òkè láti ṣàyẹ̀wò. Kò sí àkọọ́lẹ̀ tí a nílò.",
  lede_registry: "Ìròyìn jìbìtì ìyáléta ní Nàìjíríà. Ènìyàn ni ó ń ṣàyẹ̀wò ọ̀kọ̀ọ̀kan kí ó tó farahàn níbí.",
  claims_note: "Keys ń ṣàyẹ̀wò àṣẹ láti yá ilé, kì í ṣe níní ilé, kò sì ń mú owó.",
  category_fake_listing: "Ilé náà kò sí",
  category_inspection_fee_scam: "Owó àyẹ̀wò fún ìwò tí kò ṣẹlẹ̀ rí",
  category_property_already_let: "A ti yá ilé náà tẹ́lẹ̀",
  category_impersonation: "Wọ́n ṣe bí aṣojú tàbí onílé tí wọn kì í ṣe",
  category_undisclosed_fees: "Owó tí a kò dárúkọ rí",
  category_no_show: "Wọ́n gba ìpàdé, wọn kò sì dé",
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
  back: "Laghachi",
  clear_the_search: "Hichapụ nchọta",
  loading_state: "Na-ebudata",
  selected_tap_to_remove: "Ahọrọla ya. Pịa iwepụ.",
  tap_to_filter_by_this: "Pịa iji nke a nyochaa.",
  appearance_light: "Ìhè",
  appearance_dark: "Ọchịchịrị",
  appearance_auto: "Dị ka ekwentị m",
  cannot_reach_the_server: "Anyị enweghị ike iru Keys",
  it_is_still_there: "Akụkọ gị ka dị. Ekwentị a anaghị ahụ ha ugbu a.",
  the_server_said_no: "Nke ahụ agaghị",
  saved_here_will_send: "Echekwara ya na ekwentị a. Ọ ga-eziga mgbe ị nwere netwọk.",
  no_signal_saved_here: "Enweghị netwọk",
  refused_reply_window_open: "Ụbọchị asaa erubeghị.",
  refused_no_evidence: "Ọ dịghị ihe akaebe e jikọtara na ya.",
  refused_already_decided: "Otu onye ekpebiela nke a.",
  waiting_to_send: "na-echere izipu",
  check_a_number_hint: "0803 123 4567",
  check_a_number_help: "Ụdị ọ bụla. 0803…, +234 803…, ma ọ bụ 803….",
  not_a_nigerian_number: "Nke a adịghị ka nọmba ekwentị Naịjirịa.",
  nothing_upheld: "Ọ dịghị akụkọ akwadoro megide nọmba a.",
  not_a_clean_bill: "Nke a abụghị akwụkwọ ahụike dị ọcha. Ọtụtụ aghụghọ ka a na-akọghị. Akwụla ụgwọ tupu ị hụ ebe ahụ ma zute onye ahụ.",
  reviewed_by_a_person: "Mmadụ nyochara nke ọ bụla, onye nwere nọmba a nwekwara ụbọchị asaa iji zaa.",
  upheld_reports: "akụkọ akwadoro",
  one_upheld_report: "Otu akụkọ akwadoro megide nọmba a.",
  report_this_number: "Kọọ nọmba a",
  no_reports_yet_detail: "Pịnye nọmba n’elu ka ị lelee ya. Ọ dịghị akaụntụ achọrọ.",
  lede_registry: "Akụkọ aghụghọ mgbazinye ụlọ na Naịjirịa. Mmadụ na-enyocha nke ọ bụla tupu o gosi ebe a.",
  claims_note: "Keys na-elele ikike ịgbazinye ụlọ, ọ bụghị inwe ụlọ, ọ naghịkwa ejide ego.",
  category_fake_listing: "Ụlọ ahụ adịghị",
  category_inspection_fee_scam: "Ego nyocha maka nleta na-emeghị eme",
  category_property_already_let: "E gbazinyelarị ụlọ ahụ",
  category_impersonation: "Ha mere ka onye nnọchiteanya ma ọ bụ onye nwe ụlọ ha na-abụghị",
  category_undisclosed_fees: "Ụgwọ a na-akpọtụghị aha ya",
  category_no_show: "Ha nabatara oge ma ha abịaghị",
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

/**
 * The languages on offer, English last.
 *
 * Deliberately not alphabetical and deliberately not English-first: this list
 * is read by somebody who has just opened the app, and putting English at the
 * top makes the other three look like an afterthought bolted on for them.
 */
export const LANGUAGES: readonly Language[] = ['ha', 'yo', 'ig', 'en'];

/**
 * The phrase that describes a report category.
 *
 * Derived rather than looked up in a map each caller writes out, because the
 * app, the web and the console all need the same six sentences and the fourth
 * copy is the one missing an entry.
 */
export function categoryPhrase(category: ReportCategory): Phrase {
  return `category_${category}` as Phrase;
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ha' || value === 'yo' || value === 'ig';
}
