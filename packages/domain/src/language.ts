import type { ReportCategory } from './reports.ts';

/**
 * Keys in four languages.
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
  | 'share_this_answer'
  | 'no_signal_saved_here'
  | 'refused_reply_window_open'
  | 'refused_no_evidence'
  | 'refused_already_decided'
  | 'verified_agent'
  | 'no_verified_agent'
  | 'what_was_checked'
  | 'properties_confirmed'
  | 'tier_unverified'
  | 'tier_identity'
  | 'tier_authority'
  | 'tier_established'
  | 'checked_is_not_a_defence'
  | 'your_account'
  | 'account_proves_nothing'
  | 'your_name_label'
  | 'your_number_label'
  | 'open_an_account'
  | 'what_tenants_see'
  | 'ask_a_landlord'
  | 'ask_a_landlord_help'
  | 'which_property'
  | 'landlord_number'
  | 'ask_them'
  | 'your_listings'
  | 'no_listings_yet'
  | 'draft_another'
  | 'what_you_are_letting'
  | 'save_draft'
  | 'publish_listing'
  | 'draft_private'
  | 'not_verified_yet'
  | 'listing_verified'
  | 'id_check_not_available'
  | 'sign_out'
  | 'tab_check'
  | 'tab_account'
  | 'text_queued'
  | 'drafted'
  | 'published_now'
  | 'session_ended'
  | 'condition_agent_identity'
  | 'condition_landlord_authority'
  | 'condition_capture_on_site'
  | 'condition_walkthrough_video'
  | 'condition_not_a_known_duplicate'
  | 'condition_recently_confirmed'
  | 'condition_nothing_upheld'
  | 'one_property_confirmed'
  | 'report_lede'
  | 'which_number_reported'
  | 'what_kind'
  | 'what_happened'
  | 'what_happened_help'
  | 'send_report'
  | 'report_received'
  | 'report_received_detail'
  | 'go_back'
  | 'tab_settings'
  | 'appearance'
  | 'language_setting'
  | 'report_too_short'
  | 'only_report_what_happened_to_you';

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
  verified_agent: "This number belongs to an agent Keys has checked.",
  no_verified_agent: "No agent Keys has checked uses this number.",
  what_was_checked: "What was checked",
  properties_confirmed: "properties a landlord confirmed",
  tier_unverified: "Nothing about this person has been checked.",
  tier_identity: "Their ID was checked against a live photo of their face.",
  tier_authority: "A landlord has confirmed a property they may let.",
  tier_established: "Landlords have confirmed them on several properties over months, with nothing upheld against them.",
  checked_is_not_a_defence: "Being checked is not an answer to what is above.",
  your_account: "Your account",
  account_proves_nothing: "An account is a name and a number. It proves nothing on its own, and we would rather say that here than after you have signed up.",
  your_name_label: "Your name, as tenants will see it",
  your_number_label: "Your business number",
  open_an_account: "Open an account",
  what_tenants_see: "What a tenant sees when they check your number",
  ask_a_landlord: "Ask a landlord to confirm you",
  ask_a_landlord_help: "We text them a code. Nothing changes unless they enter it. Use their own number, not a second number of yours — we check, and we refuse.",
  which_property: "Which property",
  landlord_number: "The landlord's number",
  ask_them: "Ask them",
  your_listings: "Your listings",
  no_listings_yet: "Nothing yet. You can draft a listing before a landlord confirms you. You just cannot publish it until they have.",
  draft_another: "Draft another",
  what_you_are_letting: "What you are letting",
  save_draft: "Save draft",
  publish_listing: "Publish",
  draft_private: "Draft. Nobody can see this.",
  not_verified_yet: "Not Verified yet. Still needed:",
  listing_verified: "Verified.",
  id_check_not_available: "Your ID has not been checked, and you cannot do that part here yet. Everything else rests on it, so a landlord confirming you changes nothing until it is done. We will ask you for it here when we are ready.",
  sign_out: "Sign out on this phone",
  tab_check: "Check",
  tab_account: "Account",
  text_queued: "We have queued a text to that landlord. Nothing changes until they enter the code.",
  drafted: "Drafted. It is private until you publish it.",
  published_now: "Published. Tenants can see it now.",
  session_ended: "That session has ended. Open an account again on this phone.",
  condition_agent_identity: "Complete your ID check. Everything else rests on it.",
  condition_landlord_authority: "Ask the landlord to confirm you may let this property. They get a code by text.",
  condition_capture_on_site: "Take at least one photo in the Keys app, standing at the property. Photos from your gallery do not count.",
  condition_walkthrough_video: "Record a walkthrough of at least thirty seconds in the app, at the property.",
  condition_not_a_known_duplicate: "One of these images is already on a listing we blocked. Replace it with your own.",
  condition_recently_confirmed: "Confirm the property is still available. Verified listings are confirmed every fortnight.",
  condition_nothing_upheld: "A report against this listing or against you was upheld. That has to be resolved first.",
  one_property_confirmed: "One property a landlord confirmed",
  report_lede: "A reviewer reads this before anything appears about anybody. Nothing you write here is published until a person upholds it.",
  only_report_what_happened_to_you: "Report what happened to you, not what you heard. A report nobody can assess cannot be upheld, and one that turns out to be false is worse than no report at all.",
  which_number_reported: "The number you are reporting",
  what_kind: "What kind of thing was it?",
  what_happened: "What happened",
  what_happened_help: "Enough that somebody who was not there can assess it. Dates, amounts, and what was said.",
  send_report: "Send this report",
  report_received: "A person will read this.",
  report_received_detail: "Nothing is published unless a reviewer upholds it, and the number you reported has seven days to answer first.",
  report_too_short: "Say more. Nobody can assess this yet.",
  go_back: "Back",
  tab_settings: "Settings",
  appearance: "Appearance",
  language_setting: "Language",
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
  share_this_answer: "Send this to whoever asked",
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
  verified_agent: "Wannan lambar mallakar wakili ne da Keys ya duba.",
  no_verified_agent: "Babu wakilin da Keys ya duba da ke amfani da wannan lambar.",
  what_was_checked: "Abin da aka duba",
  properties_confirmed: "wurare da mai gida ya tabbatar",
  tier_unverified: "Ba a duba kome game da wannan mutumin ba.",
  tier_identity: "An duba katin shaidarsa da hoton fuskarsa kai tsaye.",
  tier_authority: "Mai gida ya tabbatar da wurin da yake da izinin haya.",
  tier_established: "Masu gidaje sun tabbatar da shi a wurare da dama cikin watanni, kuma ba a tabbatar da wani rahoto a kansa ba.",
  checked_is_not_a_defence: "Dubawar da aka yi ba amsa ba ce ga abin da ke sama.",
  your_account: "Asusunka",
  account_proves_nothing: "Asusu suna ne da lamba kawai. Ba ya tabbatar da kome shi kaɗai, kuma mun fi so mu faɗa maka yanzu da bayan ka yi rajista.",
  your_name_label: "Sunanka, kamar yadda masu haya za su gani",
  your_number_label: "Lambar kasuwancinka",
  open_an_account: "Buɗe asusu",
  what_tenants_see: "Abin da mai haya ke gani idan ya duba lambarka",
  ask_a_landlord: "Ka roƙi mai gida ya tabbatar da kai",
  ask_a_landlord_help: "Muna aika masa lamba ta saƙo. Ba abin da ke sauyawa sai ya shigar da ita. Yi amfani da lambarsa, ba wata lambarka ba — muna duba, kuma muna ƙi.",
  which_property: "Wane wuri",
  landlord_number: "Lambar mai gida",
  ask_them: "Ka roƙe shi",
  your_listings: "Tallace-tallacenka",
  no_listings_yet: "Babu kome tukuna. Za ka iya shirya talla kafin mai gida ya tabbatar da kai. Sai dai ba za ka iya buga shi ba sai ya tabbatar.",
  draft_another: "Shirya wani",
  what_you_are_letting: "Abin da kake hayarwa",
  save_draft: "Ajiye shirin",
  publish_listing: "Buga",
  draft_private: "Shiri. Babu wanda ke ganin wannan.",
  not_verified_yet: "Ba a tabbatar ba tukuna. Ana buƙatar:",
  listing_verified: "An tabbatar.",
  id_check_not_available: "Ba a duba katin shaidarka ba, kuma ba za ka iya yin wannan a nan tukuna ba. Duk sauran suna kan sa, don haka tabbatarwar mai gida ba ta canza kome sai an gama shi. Za mu nema maka shi a nan idan mun shirya.",
  sign_out: "Fita daga wannan wayar",
  tab_check: "Duba",
  tab_account: "Asusu",
  text_queued: "Mun jera saƙo zuwa ga mai gidan. Ba abin da ke sauyawa sai ya shigar da lambar.",
  drafted: "An shirya. Yana boye har sai ka buga shi.",
  published_now: "An buga. Masu haya na iya ganin sa yanzu.",
  session_ended: "Wannan zaman ya ƙare. Sake buɗe asusu a wannan wayar.",
  condition_agent_identity: "Kammala duba katin shaidarka. Duk sauran suna kan sa.",
  condition_landlord_authority: "Ka roƙi mai gida ya tabbatar da cewa kana da izinin haya wannan wurin. Zai samu lamba ta saƙo.",
  condition_capture_on_site: "Ɗauki aƙalla hoto ɗaya a cikin manhajar Keys, kana tsaye a wurin. Hotunan da ke wayarka ba sa ƙidaya.",
  condition_walkthrough_video: "Ɗauki bidiyon zagayawa na aƙalla daƙiƙa talatin a cikin manhajar, a wurin.",
  condition_not_a_known_duplicate: "Ɗaya daga cikin waɗannan hotunan yana kan talla da muka hana. Sauya shi da naka.",
  condition_recently_confirmed: "Tabbatar da cewa wurin yana nan. Ana tabbatar da tallace-tallacen da aka tabbatar kowane mako biyu.",
  condition_nothing_upheld: "An tabbatar da rahoto kan wannan tallar ko kanka. Dole a warware shi tukuna.",
  one_property_confirmed: "Wuri ɗaya da mai gida ya tabbatar",
  report_lede: "Mai duba yana karanta wannan kafin komai ya bayyana game da kowa. Ba a buga abin da ka rubuta a nan sai mutum ya tabbatar da shi.",
  only_report_what_happened_to_you: "Ba da rahoton abin da ya same ka, ba abin da ka ji ba. Rahoton da ba wanda zai iya tantancewa ba za a tabbatar da shi ba, kuma wanda ya zamo ƙarya ya fi rashin rahoto muni.",
  which_number_reported: "Lambar da kake ba da rahoton ta",
  what_kind: "Wane irin abu ne?",
  what_happened: "Me ya faru",
  what_happened_help: "Isasshe don wanda bai kasance a wurin ba ya iya tantancewa. Kwanaki, kuɗi, da abin da aka faɗa.",
  send_report: "Aika wannan rahoton",
  report_received: "Mutum zai karanta wannan.",
  report_received_detail: "Ba a buga kome sai mai duba ya tabbatar da shi, kuma lambar da ka ba da rahoton tana da kwana bakwai ta amsa tukuna.",
  report_too_short: "Ƙara bayani. Babu wanda zai iya tantance wannan yanzu.",
  go_back: "Koma baya",
  tab_settings: "Saituna",
  appearance: "Kamanni",
  language_setting: "Harshe",
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
  share_this_answer: "Aika wannan ga wanda ya tambaya",
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
  verified_agent: "Nọ́mbà yìí jẹ́ ti aṣojú tí Keys ti ṣàyẹ̀wò.",
  no_verified_agent: "Kò sí aṣojú tí Keys ṣàyẹ̀wò tó ń lo nọ́mbà yìí.",
  what_was_checked: "Ohun tí a ṣàyẹ̀wò",
  properties_confirmed: "ilé tí onílé fọwọ́ sí",
  tier_unverified: "A kò ṣàyẹ̀wò ohunkóhun nípa ẹni yìí.",
  tier_identity: "A fi fọ́tò ojú rẹ̀ tààrà ṣàyẹ̀wò káàdì ìdánimọ̀ rẹ̀.",
  tier_authority: "Onílé ti fọwọ́ sí ilé kan tí ó lè yá.",
  tier_established: "Àwọn onílé ti fọwọ́ sí i ní ilé púpọ̀ fún ọ̀pọ̀ oṣù, kò sì sí ẹ̀sùn tí a gbà lòdì sí i.",
  checked_is_not_a_defence: "Ṣíṣàyẹ̀wò kì í ṣe ìdáhùn sí ohun tí ó wà lókè.",
  your_account: "Àkántì rẹ",
  account_proves_nothing: "Àkántì jẹ́ orúkọ àti nọ́mbà. Kò fi ohunkóhun hàn fúnra rẹ̀, a sì fẹ́ sọ èyí fún ọ nísinsìnyí ju lẹ́yìn tí o ti forúkọ sílẹ̀.",
  your_name_label: "Orúkọ rẹ, gẹ́gẹ́ bí àwọn agbatọ́jú yóò ti rí i",
  your_number_label: "Nọ́mbà iṣẹ́ rẹ",
  open_an_account: "Ṣí àkántì",
  what_tenants_see: "Ohun tí agbatọ́jú rí nígbà tí ó bá ṣàyẹ̀wò nọ́mbà rẹ",
  ask_a_landlord: "Béèrè lọ́wọ́ onílé kí ó fọwọ́ sí ọ",
  ask_a_landlord_help: "A ó fi kóòdù ránṣẹ́ sí i. Kò sí ohun tí ó ń yípadà àyàfi tí ó bá tẹ̀ ẹ́. Lo nọ́mbà tirẹ̀, kì í ṣe nọ́mbà kejì tìrẹ — a ń ṣàyẹ̀wò, a sì ń kọ̀.",
  which_property: "Ilé wo",
  landlord_number: "Nọ́mbà onílé",
  ask_them: "Béèrè lọ́wọ́ rẹ̀",
  your_listings: "Àwọn ìpolówó rẹ",
  no_listings_yet: "Kò sí nǹkan kan síbẹ̀. O lè kọ ìpolówó kí onílé tó fọwọ́ sí ọ. Ṣùgbọ́n o kò lè tẹ̀ ẹ́ jáde títí tí ó fi ṣe bẹ́ẹ̀.",
  draft_another: "Kọ òmíràn",
  what_you_are_letting: "Ohun tí ò ń yá",
  save_draft: "Pa àkọsílẹ̀ mọ́",
  publish_listing: "Tẹ̀ jáde",
  draft_private: "Àkọsílẹ̀. Kò sí ẹni tí ó lè rí èyí.",
  not_verified_yet: "A kò tíì fọwọ́ sí i. Ó ṣì nílò:",
  listing_verified: "A ti fọwọ́ sí i.",
  id_check_not_available: "A kò tíì ṣàyẹ̀wò káàdì ìdánimọ̀ rẹ, o kò sì lè ṣe apá yìí níbí síbẹ̀. Gbogbo ìyókù dúró lé e, torí náà onílé fọwọ́ sí ọ kò yí ohunkóhun padà títí tí a ó fi ṣe é. A ó béèrè rẹ̀ lọ́wọ́ rẹ níbí nígbà tí a bá ṣetán.",
  sign_out: "Jáde ní fóònù yìí",
  tab_check: "Ṣàyẹ̀wò",
  tab_account: "Àkántì",
  text_queued: "A ti tò ìránṣẹ́ sí onílé náà. Kò sí ohun tí ó yí padà títí tí ó fi tẹ kóòdù náà.",
  drafted: "A ti kọ ọ́ sílẹ̀. Ó pamọ́ títí tí ìwọ yóò fi tẹ̀ ẹ́ jáde.",
  published_now: "A ti tẹ̀ ẹ́ jáde. Àwọn agbatọ́jú lè rí i nísinsìnyí.",
  session_ended: "Àkókò yìí ti parí. Ṣí àkántì lẹ́ẹ̀kansí ní fóònù yìí.",
  condition_agent_identity: "Parí ìṣàyẹ̀wò káàdì ìdánimọ̀ rẹ. Gbogbo ìyókù dúró lé e.",
  condition_landlord_authority: "Béèrè lọ́wọ́ onílé kí ó fọwọ́ sí i pé o lè yá ilé yìí. Yóò gba kóòdù nípa ìránṣẹ́.",
  condition_capture_on_site: "Ya ó kéré tán fọ́tò kan nínú app Keys, tí o dúró ní ibẹ̀. Àwọn fọ́tò inú fóònù rẹ kò ka.",
  condition_walkthrough_video: "Ya fídíò ìrìn àyíká tí ó kéré tán ìṣẹ́jú-àáyá ọgbọ̀n nínú app náà, ní ibẹ̀.",
  condition_not_a_known_duplicate: "Ọ̀kan nínú àwọn àwòrán wọ̀nyí wà lórí ìpolówó tí a dí. Fi tìrẹ rọ́pò rẹ̀.",
  condition_recently_confirmed: "Fọwọ́ sí i pé ilé náà ṣì wà. A ń fọwọ́ sí àwọn ìpolówó tí a ti fọwọ́ sí ní ọ̀sẹ̀ méjì méjì.",
  condition_nothing_upheld: "A gba ẹ̀sùn kan lòdì sí ìpolówó yìí tàbí lòdì sí ọ. Ó gbọ́dọ̀ yanjú kí ó tó ṣeé ṣe.",
  one_property_confirmed: "Ilé kan tí onílé fọwọ́ sí",
  report_lede: "Olùyẹ̀wò kan ka èyí kí ohunkóhun tó farahàn nípa ẹnikẹ́ni. A kì í tẹ ohun tí o kọ síbí jáde àyàfi tí ènìyàn bá gbà á.",
  only_report_what_happened_to_you: "Ròyìn ohun tí ó ṣẹlẹ̀ sí ọ, kì í ṣe ohun tí o gbọ́. Ìròyìn tí ẹnikẹ́ni kò lè ṣàyẹ̀wò ni a kò lè gbà, èyí tí ó bá sì di irọ́ burú ju àìròyìn lọ.",
  which_number_reported: "Nọ́mbà tí ò ń ròyìn",
  what_kind: "Irú ohun wo ni?",
  what_happened: "Ohun tí ó ṣẹlẹ̀",
  what_happened_help: "Tó fún ẹni tí kò sí níbẹ̀ láti ṣàyẹ̀wò. Ọjọ́, owó, àti ohun tí a sọ.",
  send_report: "Fi ìròyìn yìí ránṣẹ́",
  report_received: "Ènìyàn yóò ka èyí.",
  report_received_detail: "A kì í tẹ ohunkóhun jáde àyàfi tí olùyẹ̀wò bá gbà á, nọ́mbà tí o ròyìn sì ní ọjọ́ méje láti dáhùn ní àkọ́kọ́.",
  report_too_short: "Sọ síwájú sí i. Kò sí ẹni tí ó lè ṣàyẹ̀wò èyí síbẹ̀.",
  go_back: "Padà sẹ́yìn",
  tab_settings: "Ètò",
  appearance: "Ìrísí",
  language_setting: "Èdè",
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
  share_this_answer: "Fi èyí ránṣẹ́ sí ẹni tó béèrè",
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
  verified_agent: "Nọmba a bụ nke onye nnọchiteanya Keys nyochara.",
  no_verified_agent: "Ọ dịghị onye nnọchiteanya Keys nyochara na-eji nọmba a.",
  what_was_checked: "Ihe e nyochara",
  properties_confirmed: "ụlọ onye nwe ụlọ kwadoro",
  tier_unverified: "Ọ dịghị ihe e nyochara banyere onye a.",
  tier_identity: "E ji foto ihu ya nyochaa kaadị njirimara ya.",
  tier_authority: "Onye nwe ụlọ akwadowo otu ụlọ ọ nwere ike ịgbazinye.",
  tier_established: "Ndị nwe ụlọ akwadowo ya n'ọtụtụ ụlọ kemgbe ọtụtụ ọnwa, ọ dịghịkwa mkpesa a kwadoro megide ya.",
  checked_is_not_a_defence: "Nyocha abụghị azịza nye ihe dị n'elu.",
  your_account: "Akaụntụ gị",
  account_proves_nothing: "Akaụntụ bụ aha na nọmba. Ọ naghị egosi ihe ọ bụla n'onwe ya, anyị chọrọ ikwu ya ugbu a karịa mgbe ị debanyesịrị aha.",
  your_name_label: "Aha gị, dịka ndị mgbazinye ga-ahụ ya",
  your_number_label: "Nọmba azụmahịa gị",
  open_an_account: "Meghee akaụntụ",
  what_tenants_see: "Ihe onye mgbazinye na-ahụ mgbe ọ nyochara nọmba gị",
  ask_a_landlord: "Rịọ onye nwe ụlọ ka ọ kwado gị",
  ask_a_landlord_help: "Anyị na-ezigara ya koodu na ozi. Ọ dịghị ihe na-agbanwe ma ọ bụghị na o tinye ya. Jiri nọmba nke ya, ọ bụghị nọmba nke abụọ gị — anyị na-enyocha, anyị na-ajụkwa.",
  which_property: "Ụlọ ole",
  landlord_number: "Nọmba onye nwe ụlọ",
  ask_them: "Rịọ ya",
  your_listings: "Mgbasa ozi gị",
  no_listings_yet: "Ọ dịghị ihe ugbu a. Ị nwere ike ide mgbasa ozi tupu onye nwe ụlọ akwado gị. Naanị na ị gaghị ebipụta ya ruo mgbe o mere.",
  draft_another: "Dee ọzọ",
  what_you_are_letting: "Ihe ị na-agbazinye",
  save_draft: "Chekwaa ederede",
  publish_listing: "Bipụta",
  draft_private: "Ederede. Ọ dịghị onye na-ahụ nke a.",
  not_verified_yet: "Akwadobeghị ya. Ka chọrọ:",
  listing_verified: "Akwadoro ya.",
  id_check_not_available: "Enyochabeghị kaadị njirimara gị, ị gaghịkwa eme akụkụ ahụ ebe a ugbu a. Ihe niile ndị ọzọ dabere na ya, ya mere na onye nwe ụlọ ịkwado gị anaghị agbanwe ihe ọ bụla ruo mgbe emechara ya. Anyị ga-arịọ gị ya ebe a mgbe anyị dịla njikere.",
  sign_out: "Pụọ na ekwentị a",
  tab_check: "Nyochaa",
  tab_account: "Akaụntụ",
  text_queued: "Anyị ehaziela ozi ka e zigara onye nwe ụlọ ahụ. Ọ dịghị ihe na-agbanwe ruo mgbe o tinyere koodu ahụ.",
  drafted: "Edeela ya. Ọ na-ezo ezo ruo mgbe ị bipụtara ya.",
  published_now: "E bipụtala ya. Ndị mgbazinye nwere ike ịhụ ya ugbu a.",
  session_ended: "Oge a agwụla. Meghee akaụntụ ọzọ na ekwentị a.",
  condition_agent_identity: "Mezue nyocha kaadị njirimara gị. Ihe niile ndị ọzọ dabere na ya.",
  condition_landlord_authority: "Rịọ onye nwe ụlọ ka ọ kwado na ị nwere ike ịgbazinye ụlọ a. Ọ ga-enweta koodu na ozi.",
  condition_capture_on_site: "Sere opekempe otu foto n'ime app Keys, ka ị guzo n'ebe ahụ. Foto ndị dị na ekwentị gị anaghị agụ.",
  condition_walkthrough_video: "Dekọọ vidiyo njegharị nke opekempe sekọnd iri atọ n'ime app ahụ, n'ebe ahụ.",
  condition_not_a_known_duplicate: "Otu n'ime foto ndị a dị na mgbasa ozi anyị gbochiri. Jiri nke gị dochie ya.",
  condition_recently_confirmed: "Kwado na ụlọ ahụ ka dị. A na-akwado mgbasa ozi akwadoro kwa izu abụọ.",
  condition_nothing_upheld: "A kwadoro mkpesa megide mgbasa ozi a ma ọ bụ megide gị. A ga-edozi ya tupu nke a emee.",
  one_property_confirmed: "Otu ụlọ onye nwe ụlọ kwadoro",
  report_lede: "Onye nyocha na-agụ nke a tupu ihe ọ bụla apụta banyere onye ọ bụla. Anaghị ebipụta ihe i dere ebe a ruo mgbe mmadụ kwadoro ya.",
  only_report_what_happened_to_you: "Kọọ ihe mere gị, ọ bụghị ihe ị nụrụ. Mkpesa onye ọ bụla na-apụghị inyocha ka a na-apụghị ịkwado, nke ghọrọ ụgha kwa jọrọ njọ karịa enweghị mkpesa ọ bụla.",
  which_number_reported: "Nọmba ị na-akọ",
  what_kind: "Ụdị ihe dị aṅaa ka ọ bụ?",
  what_happened: "Ihe merenụ",
  what_happened_help: "Nke zuru ezu ka onye na-anọghị ebe ahụ nwee ike inyocha ya. Ụbọchị, ego, na ihe e kwuru.",
  send_report: "Zipu mkpesa a",
  report_received: "Mmadụ ga-agụ nke a.",
  report_received_detail: "Anaghị ebipụta ihe ọ bụla ma ọ bụrụ na onye nyocha akwadoghị ya, nọmba i kọrọ nwekwara ụbọchị asaa iji zaa ya na mbụ.",
  report_too_short: "Kwuo karịa. Ọ dịghị onye nwere ike inyocha nke a ugbu a.",
  go_back: "Laghachi azụ",
  tab_settings: "Ntọala",
  appearance: "Ọdịdị",
  language_setting: "Asụsụ",
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
  share_this_answer: "Zigara onye jụrụ nke a",
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

/**
 * The sentence for a tier, in the reader's own language.
 *
 * `tierSentence` in `agents.ts` returns English and belongs to the API — it is
 * what the OpenAPI document carries for a caller who is not this app. A screen
 * uses this instead, because a tenant in Kano being told what was checked in
 * English is being told nothing.
 */
export function tierPhrase(tier: string): Phrase {
  return `tier_${tier}` as Phrase;
}

/**
 * The sentence for an unmet Verified condition, in the reader's language.
 *
 * `whatToDo` in `listings.ts` returns English and belongs to the API — it is
 * what the OpenAPI document carries for a caller that is not this app. The app
 * uses this, because an agent in Kano being told what to fix in English is
 * being told nothing.
 *
 * The two are held to each other by a test, so the server and the phone cannot
 * come to describe different conditions.
 */
export function conditionPhrase(condition: string): Phrase {
  return `condition_${condition}` as Phrase;
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ha' || value === 'yo' || value === 'ig';
}
