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
  | 'condition_costs_stated'
  | 'condition_nobody_found_it_missing'
  | 'step_nobody_found_it_missing'
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
  | 'only_report_what_happened_to_you'
  | 'a_report_about_your_number'
  | 'nothing_published_yet'
  | 'what_was_said'
  | 'your_answer'
  | 'your_answer_help'
  | 'send_your_answer'
  | 'answer_recorded'
  | 'answer_recorded_detail'
  | 'already_answered'
  | 'reply_link_not_valid'
  | 'reply_link_help'
  | 'you_have_until'
  | 'still_available'
  | 'confirmed_today'
  | 'confirm_every_fortnight'
  | 'mark_where_this_is'
  | 'mark_where_this_is_help'
  | 'property_placed'
  | 'take_a_photo'
  | 'record_a_walkthrough'
  | 'capture_accepted'
  | 'place_it_first'
  | 'your_properties'
  | 'add_a_property'
  | 'no_properties_yet'
  | 'a_draft'
  | 'is_verified'
  | 'steps_left'
  | 'all_steps_done'
  | 'back_to_properties'
  | 'what_this_property_needs'
  | 'this_property'
  | 'add_property_help'
  | 'tab_find'
  | 'find_a_place'
  | 'find_a_place_lede'
  | 'search_places_hint'
  | 'verified_only'
  | 'nothing_found'
  | 'nothing_found_detail'
  | 'what_was_checked_here'
  | 'listed_by'
  | 'not_verified_listing'
  | 'check_this_agent'
  | 'step_agent_identity'
  | 'step_landlord_authority'
  | 'step_capture_on_site'
  | 'step_walkthrough_video'
  | 'step_not_a_known_duplicate'
  | 'step_recently_confirmed'
  | 'step_nothing_upheld'
  | 'step_costs_stated'
  | 'costs_heading'
  | 'costs_rent'
  | 'costs_agency_fee'
  | 'costs_legal_fee'
  | 'costs_caution_deposit'
  | 'costs_service_charge'
  | 'costs_move_in_total'
  | 'costs_extras_note'
  | 'costs_above_custom'
  | 'costs_not_stated'
  | 'costs_save'
  | 'costs_help'
  | 'costs_saved'
  | 'tab_messages'
  | 'messages_lede'
  | 'no_messages_yet'
  | 'no_messages_yet_help'
  | 'exchange_none'
  | 'exchange_you_offered'
  | 'exchange_they_offered'
  | 'exchange_done'
  | 'message_the_agent'
  | 'ask_about_this_place'
  | 'why_we_want_your_number'
  | 'say_something'
  | 'send'
  | 'share_my_number'
  | 'share_my_number_help'
  | 'take_my_number_back'
  | 'their_number'
  | 'ask_to_see_it'
  | 'waiting_on_the_agent'
  | 'they_agreed_to_show_it'
  | 'they_declined'
  | 'inspection_fee_is'
  | 'inspection_free'
  | 'what_happened_when_you_went'
  | 'outcome_did_not_exist'
  | 'outcome_agent_did_not_show'
  | 'outcome_asked_for_more_money'
  | 'outcome_as_described'
  | 'outcome_not_for_me'
  | 'how_much_were_you_asked'
  | 'tell_us'
  | 'your_name'
  | 'your_number'
  | 'start_messaging'
  | 'enquiries'
  | 'no_enquiries'
  | 'reply_to_them'
  | 'they_want_to_see_it'
  | 'what_will_you_charge'
  | 'agree_to_show'
  | 'decline'
  | 'outcome_recorded'
  | 'number_shared';

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
  condition_costs_stated: "Say what it costs to move in: rent, your fee, the agreement fee, the deposit and any service charge. A zero is an answer; a blank is not.",
  condition_nobody_found_it_missing: "Somebody went to this address and said there was nothing there. Take a photo at the property in the app and this lifts at once.",
  step_nobody_found_it_missing: "Nobody found it missing",
  one_property_confirmed: "One property a landlord confirmed",
  report_lede: "A reviewer reads this before anything appears about anybody. Nothing you write here is published until a person upholds it.",
  only_report_what_happened_to_you: "Report what happened to you, not what you heard. A report nobody can assess cannot be upheld, and one that turns out to be false is worse than no report at all.",
  a_report_about_your_number: "A report about your number",
  nothing_published_yet: "Nothing about this has been published, and nothing will be until a person has read your side.",
  what_was_said: "What was said",
  your_answer: "Your answer",
  your_answer_help: "A reviewer reads this beside the report. Say what actually happened.",
  send_your_answer: "Send your answer",
  answer_recorded: "Your answer is on the record.",
  answer_recorded_detail: "A reviewer reads it alongside the report before deciding anything.",
  already_answered: "You have already answered this. A reviewer has your side.",
  reply_link_not_valid: "That link is not valid",
  reply_link_help: "Open it from the text message rather than copying part of it. It is the only way we can tell it is you, and we would rather that than ask you to make an account.",
  you_have_until: "You have until",
  still_available: "It is still available",
  confirmed_today: "Confirmed. Tenants can rely on this for two weeks.",
  confirm_every_fortnight: "Confirm this every fortnight, or it stops being Verified.",
  mark_where_this_is: "Mark where this property is",
  mark_where_this_is_help: "Do this standing at the property. It is recorded once and cannot be moved afterwards, because moving it would change what your photos prove.",
  property_placed: "Marked. Photos taken here will now count.",
  take_a_photo: "Take a photo here",
  record_a_walkthrough: "Record a walkthrough here",
  capture_accepted: "Accepted.",
  place_it_first: "Mark where the property is first, or photos cannot prove where they were taken.",
  your_properties: "Your properties",
  add_a_property: "Add a property",
  no_properties_yet: "No properties yet. Add one, then mark where it is and photograph it.",
  a_draft: "Draft",
  is_verified: "Verified",
  steps_left: "left to do",
  all_steps_done: "Everything done",
  back_to_properties: "Your properties",
  what_this_property_needs: "What this property needs",
  this_property: "This property",
  add_property_help: "One property at a time. You can draft it anywhere; the rest has to be done standing at it.",
  tab_find: "Find",
  find_a_place: "Find a place",
  find_a_place_lede: "Only places Keys has checked, unless you ask for the rest.",
  search_places_hint: "Yaba, two bedroom, Herbert Macaulay",
  verified_only: "Checked places only",
  nothing_found: "Nothing here yet",
  nothing_found_detail: "Keys is new. Try fewer words, or turn off the filter to see everything that has been posted.",
  what_was_checked_here: "What was checked",
  listed_by: "Listed by",
  not_verified_listing: "Keys has not checked this place. Pay nothing before you have seen it and met the person.",
  check_this_agent: "Check this agent's number",
  step_agent_identity: "ID check",
  step_landlord_authority: "Landlord confirmation",
  step_capture_on_site: "Photo at the property",
  step_walkthrough_video: "Walkthrough video",
  step_not_a_known_duplicate: "Images not used elsewhere",
  step_recently_confirmed: "Confirmed available",
  step_nothing_upheld: "No upheld reports",
  step_costs_stated: "Costs stated",
  costs_heading: "What it costs to move in",
  costs_rent: "Rent for the year",
  costs_agency_fee: "Agency fee",
  costs_legal_fee: "Agreement fee",
  costs_caution_deposit: "Caution deposit",
  costs_service_charge: "Service charge",
  costs_move_in_total: "Total to move in",
  costs_extras_note: "on top of the rent",
  costs_above_custom: "Higher than the usual ten per cent",
  costs_not_stated: "This agent has not said what the fees are",
  costs_save: "Save the costs",
  costs_help: "Everything a tenant pays before they get keys. Put 0 where there is nothing to pay.",
  costs_saved: "Costs saved",
  tab_messages: "Messages",
  messages_lede: "Agents you have asked about a place.",
  no_messages_yet: "No messages yet",
  no_messages_yet_help: "Open a listing and ask the agent about it. Keys keeps your number back until you both agree to swap.",
  exchange_none: "No numbers shared",
  exchange_you_offered: "You shared yours",
  exchange_they_offered: "They shared theirs",
  exchange_done: "Numbers shared",
  message_the_agent: "Ask about this place",
  ask_about_this_place: "Ask about this place",
  why_we_want_your_number: "Keys keeps this to itself. The agent does not see it — if you want them to have it, you choose that later, inside the conversation.",
  say_something: "Say something",
  send: "Send",
  share_my_number: "Share my number",
  share_my_number_help: "They will only see it if they share theirs. You can take it back until then.",
  take_my_number_back: "Take my number back",
  their_number: "Their number",
  ask_to_see_it: "Ask to see it",
  waiting_on_the_agent: "Waiting for the agent",
  they_agreed_to_show_it: "They agreed to show it",
  they_declined: "They cannot show it",
  inspection_fee_is: "To see it they will charge",
  inspection_free: "They will show it for nothing",
  what_happened_when_you_went: "What happened when you went?",
  outcome_did_not_exist: "There was nothing there",
  outcome_agent_did_not_show: "Nobody came",
  outcome_asked_for_more_money: "They asked for more money",
  outcome_as_described: "It was as described",
  outcome_not_for_me: "It was not for me",
  how_much_were_you_asked: "How much were you asked for?",
  tell_us: "Tell Keys",
  your_name: "Your name",
  your_number: "Your number",
  start_messaging: "Start messaging",
  enquiries: "Enquiries",
  no_enquiries: "Nobody has asked about your places yet.",
  reply_to_them: "Reply",
  they_want_to_see_it: "They want to see it",
  what_will_you_charge: "What will you charge to show it?",
  agree_to_show: "Agree to show it",
  decline: "Cannot show it",
  outcome_recorded: "Thank you. That is recorded.",
  number_shared: "Numbers shared",
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
  condition_costs_stated: "Faɗi abin da za a biya kafin shiga: haya, kuɗinka, kuɗin yarjejeniya, ajiya da kuɗin hidima. Sifili amsa ce; wofi ba amsa ba ce.",
  condition_nobody_found_it_missing: "Wani ya je wannan adireshin ya ce babu komai a wurin. Ɗauki hoto a wurin da ke cikin manhajar, sai wannan ya ɗage nan take.",
  step_nobody_found_it_missing: "Babu wanda bai same shi ba",
  one_property_confirmed: "Wuri ɗaya da mai gida ya tabbatar",
  report_lede: "Mai duba yana karanta wannan kafin komai ya bayyana game da kowa. Ba a buga abin da ka rubuta a nan sai mutum ya tabbatar da shi.",
  only_report_what_happened_to_you: "Ba da rahoton abin da ya same ka, ba abin da ka ji ba. Rahoton da ba wanda zai iya tantancewa ba za a tabbatar da shi ba, kuma wanda ya zamo ƙarya ya fi rashin rahoto muni.",
  a_report_about_your_number: "Rahoto game da lambarka",
  nothing_published_yet: "Ba a buga kome game da wannan ba, kuma ba za a buga ba sai mutum ya karanta bangarenka.",
  what_was_said: "Abin da aka faɗa",
  your_answer: "Amsarka",
  your_answer_help: "Mai duba yana karanta wannan tare da rahoton. Faɗi abin da ya faru da gaske.",
  send_your_answer: "Aika amsarka",
  answer_recorded: "An rubuta amsarka.",
  answer_recorded_detail: "Mai duba yana karanta ta tare da rahoton kafin ya yanke shawara.",
  already_answered: "Ka riga ka amsa wannan. Mai duba yana da bangarenka.",
  reply_link_not_valid: "Wannan hanyar ba ta aiki",
  reply_link_help: "Buɗe ta daga saƙon rubutu maimakon kwafin wani sashe. Ita ce kaɗai hanyar da za mu tabbatar da kai, mun fi so haka da neman ka buɗe asusu.",
  you_have_until: "Kana da lokaci har",
  still_available: "Har yanzu yana nan",
  confirmed_today: "An tabbatar. Masu haya za su iya dogara da wannan har mako biyu.",
  confirm_every_fortnight: "Ka tabbatar da wannan kowane mako biyu, in ba haka ba za a daina tabbatar da shi.",
  mark_where_this_is: "Yi alama inda wannan wurin yake",
  mark_where_this_is_help: "Ka yi wannan kana tsaye a wurin. Ana rubuta shi sau ɗaya kuma ba za a iya matsar da shi ba, domin matsar da shi zai canza abin da hotunanka ke tabbatarwa.",
  property_placed: "An yi alama. Hotunan da aka ɗauka a nan yanzu za su ƙidaya.",
  take_a_photo: "Ɗauki hoto a nan",
  record_a_walkthrough: "Ɗauki bidiyon zagayawa a nan",
  capture_accepted: "An karɓa.",
  place_it_first: "Ka fara yin alama inda wurin yake, in ba haka ba hotuna ba za su tabbatar da inda aka ɗauke su ba.",
  your_properties: "Wuraren ka",
  add_a_property: "Ƙara wuri",
  no_properties_yet: "Babu wurare tukuna. Ƙara ɗaya, sannan ka yi alama inda yake ka ɗauki hoto.",
  a_draft: "Shiri",
  is_verified: "An tabbatar",
  steps_left: "sun rage",
  all_steps_done: "An gama komai",
  back_to_properties: "Wuraren ka",
  what_this_property_needs: "Abin da wannan wurin ke buƙata",
  this_property: "Wannan wurin",
  add_property_help: "Wuri ɗaya a lokaci ɗaya. Za ka iya shirya shi ko'ina; sauran dole ka yi shi kana tsaye a wurin.",
  tab_find: "Nemo",
  find_a_place: "Nemo wuri",
  find_a_place_lede: "Wuraren da Keys ya duba kawai, sai dai ka nemi sauran.",
  search_places_hint: "Yaba, ɗaki biyu, Herbert Macaulay",
  verified_only: "Wuraren da aka duba kawai",
  nothing_found: "Babu kome a nan tukuna",
  nothing_found_detail: "Keys sabo ne. Gwada kalmomi kaɗan, ko kashe tacewa don ganin duk abin da aka sanya.",
  what_was_checked_here: "Abin da aka duba",
  listed_by: "Wanda ya sanya",
  not_verified_listing: "Keys bai duba wannan wurin ba. Kada ka biya kafin ka gani ka kuma sadu da mutumin.",
  check_this_agent: "Duba lambar wannan wakilin",
  step_agent_identity: "Duba katin shaida",
  step_landlord_authority: "Tabbatarwar mai gida",
  step_capture_on_site: "Hoto a wurin",
  step_walkthrough_video: "Bidiyon zagayawa",
  step_not_a_known_duplicate: "Hotunan ba a wani wuri ba",
  step_recently_confirmed: "An tabbatar yana nan",
  step_nothing_upheld: "Babu rahoton da aka tabbatar",
  step_costs_stated: "An bayyana kuɗi",
  costs_heading: "Abin da za a biya kafin shiga",
  costs_rent: "Kuɗin haya na shekara",
  costs_agency_fee: "Kuɗin dillali",
  costs_legal_fee: "Kuɗin yarjejeniya",
  costs_caution_deposit: "Ajiyar tsaro",
  costs_service_charge: "Kuɗin hidima",
  costs_move_in_total: "Jimlar kuɗin shiga",
  costs_extras_note: "a kan kuɗin haya",
  costs_above_custom: "Ya fi kashi goma da aka saba",
  costs_not_stated: "Wannan dillali bai bayyana kuɗaɗen ba",
  costs_save: "Ajiye kuɗaɗen",
  costs_help: "Duk abin da mai haya zai biya kafin ya samu makullai. Sanya 0 inda babu biya.",
  costs_saved: "An ajiye kuɗaɗen",
  tab_messages: "Saƙonni",
  messages_lede: "Dillalan da ka tambaya game da wuri.",
  no_messages_yet: "Babu saƙonni tukuna",
  no_messages_yet_help: "Buɗe talla ka tambayi dillali. Keys yana riƙe lambarka har sai ku duka kun yarda ku musanya.",
  exchange_none: "Ba a raba lambobi ba",
  exchange_you_offered: "Ka raba naka",
  exchange_they_offered: "Sun raba nasu",
  exchange_done: "An raba lambobi",
  message_the_agent: "Tambaya game da wannan wurin",
  ask_about_this_place: "Tambaya game da wannan wurin",
  why_we_want_your_number: "Keys yana riƙe wannan da kansa. Dillali ba ya ganin sa — idan kana son su same shi, za ka zaɓa daga baya, cikin tattaunawar.",
  say_something: "Ka faɗi wani abu",
  send: "Aika",
  share_my_number: "Raba lambata",
  share_my_number_help: "Za su gan ta ne kawai idan sun raba tasu. Kana iya dawo da ita kafin haka.",
  take_my_number_back: "Dawo da lambata",
  their_number: "Lambar su",
  ask_to_see_it: "Nemi ka gan shi",
  waiting_on_the_agent: "Ana jiran dillali",
  they_agreed_to_show_it: "Sun yarda su nuna shi",
  they_declined: "Ba za su iya nuna shi ba",
  inspection_fee_is: "Don ganin sa za su caji",
  inspection_free: "Za su nuna shi kyauta",
  what_happened_when_you_went: "Me ya faru lokacin da ka je?",
  outcome_did_not_exist: "Babu komai a wurin",
  outcome_agent_did_not_show: "Babu wanda ya zo",
  outcome_asked_for_more_money: "Sun nemi ƙarin kuɗi",
  outcome_as_described: "Yana kamar yadda aka bayyana",
  outcome_not_for_me: "Bai dace da ni ba",
  how_much_were_you_asked: "Nawa aka nema daga gare ka?",
  tell_us: "Faɗa wa Keys",
  your_name: "Sunanka",
  your_number: "Lambarka",
  start_messaging: "Fara saƙo",
  enquiries: "Tambayoyi",
  no_enquiries: "Babu wanda ya tambaya game da wuraren ka tukuna.",
  reply_to_them: "Amsa",
  they_want_to_see_it: "Suna son su gan shi",
  what_will_you_charge: "Nawa za ka caji don nuna shi?",
  agree_to_show: "Yarda ka nuna shi",
  decline: "Ba zan iya nuna shi ba",
  outcome_recorded: "Na gode. An rubuta hakan.",
  number_shared: "An raba lambobi",
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
  condition_costs_stated: "Sọ ohun tí ó ná láti wọlé: owó ilé, owó rẹ, owó àdéhùn, owó ìdógò àti owó ìtọ́jú. Òdo jẹ́ ìdáhùn; òfìfo kọ́.",
  condition_nobody_found_it_missing: "Ẹnìkan lọ sí àdírẹ́sì yìí ó sì sọ pé kò sí ohunkóhun níbẹ̀. Ya àwòrán níbi ilé náà nínú ẹ̀rọ yìí, yóò sì kúrò lẹ́sẹ̀kẹsẹ̀.",
  step_nobody_found_it_missing: "Kò sẹ́ni tí kò rí i",
  one_property_confirmed: "Ilé kan tí onílé fọwọ́ sí",
  report_lede: "Olùyẹ̀wò kan ka èyí kí ohunkóhun tó farahàn nípa ẹnikẹ́ni. A kì í tẹ ohun tí o kọ síbí jáde àyàfi tí ènìyàn bá gbà á.",
  only_report_what_happened_to_you: "Ròyìn ohun tí ó ṣẹlẹ̀ sí ọ, kì í ṣe ohun tí o gbọ́. Ìròyìn tí ẹnikẹ́ni kò lè ṣàyẹ̀wò ni a kò lè gbà, èyí tí ó bá sì di irọ́ burú ju àìròyìn lọ.",
  a_report_about_your_number: "Ìròyìn nípa nọ́mbà rẹ",
  nothing_published_yet: "A kò tẹ ohunkóhun nípa èyí jáde, a kì yóò sì ṣe títí ènìyàn yóò fi ka ìdáhùn rẹ.",
  what_was_said: "Ohun tí wọ́n sọ",
  your_answer: "Ìdáhùn rẹ",
  your_answer_help: "Olùyẹ̀wò ka èyí lẹ́gbẹ̀ẹ́ ìròyìn náà. Sọ ohun tí ó ṣẹlẹ̀ ní tòótọ́.",
  send_your_answer: "Fi ìdáhùn rẹ ránṣẹ́",
  answer_recorded: "A ti kọ ìdáhùn rẹ sílẹ̀.",
  answer_recorded_detail: "Olùyẹ̀wò ka á pẹ̀lú ìròyìn náà kí ó tó pinnu ohunkóhun.",
  already_answered: "O ti dáhùn èyí tẹ́lẹ̀. Olùyẹ̀wò ní ìdáhùn rẹ.",
  reply_link_not_valid: "Ọ̀nà yìí kò wúlò",
  reply_link_help: "Ṣí i láti inú ìránṣẹ́ náà dípò kí o da apá kan rẹ̀ kọ. Òun ni ọ̀nà kan ṣoṣo tí a fi lè mọ̀ pé ìwọ ni, a sì fẹ́ bẹ́ẹ̀ ju kí a ní kí o ṣí àkántì.",
  you_have_until: "O ní àkókò títí di",
  still_available: "Ó ṣì wà",
  confirmed_today: "A ti fọwọ́ sí i. Àwọn agbatọ́jú lè gbẹ́kẹ̀lé èyí fún ọ̀sẹ̀ méjì.",
  confirm_every_fortnight: "Fọwọ́ sí èyí ní ọ̀sẹ̀ méjì méjì, bí bẹ́ẹ̀ kọ́ kì yóò jẹ́ èyí tí a fọwọ́ sí mọ́.",
  mark_where_this_is: "Sàmi ibi tí ilé yìí wà",
  mark_where_this_is_help: "Ṣe èyí nígbà tí o dúró ní ibẹ̀. A kọ ọ́ sílẹ̀ lẹ́ẹ̀kan, a kò sì lè gbé e lọ, nítorí gbígbé e yóò yí ohun tí àwọn fọ́tò rẹ fi hàn padà.",
  property_placed: "A ti sàmì sí i. Àwọn fọ́tò tí a yà níbí yóò ka báyìí.",
  take_a_photo: "Ya fọ́tò níbí",
  record_a_walkthrough: "Ya fídíò ìrìn àyíká níbí",
  capture_accepted: "A ti gbà á.",
  place_it_first: "Sàmi ibi tí ilé náà wà ní àkọ́kọ́, bí bẹ́ẹ̀ kọ́ àwọn fọ́tò kò lè fi ibi tí a ti yà wọ́n hàn.",
  your_properties: "Àwọn ilé rẹ",
  add_a_property: "Fi ilé kún un",
  no_properties_yet: "Kò sí ilé kankan síbẹ̀. Fi ọ̀kan kún un, kí o sàmi ibi tí ó wà kí o sì ya fọ́tò rẹ̀.",
  a_draft: "Àkọsílẹ̀",
  is_verified: "A ti fọwọ́ sí i",
  steps_left: "ó ṣẹ́kù",
  all_steps_done: "Gbogbo rẹ̀ ti parí",
  back_to_properties: "Àwọn ilé rẹ",
  what_this_property_needs: "Ohun tí ilé yìí nílò",
  this_property: "Ilé yìí",
  add_property_help: "Ilé kan lẹ́ẹ̀kan. O lè kọ ọ́ sílẹ̀ níbikíbi; ìyókù gbọ́dọ̀ ṣe nígbà tí o dúró níbẹ̀.",
  tab_find: "Wá",
  find_a_place: "Wá ibùgbé",
  find_a_place_lede: "Àwọn ibi tí Keys ti ṣàyẹ̀wò nìkan, àyàfi tí o bá béèrè fún àwọn yòókù.",
  search_places_hint: "Yaba, yàrá méjì, Herbert Macaulay",
  verified_only: "Àwọn ibi tí a ṣàyẹ̀wò nìkan",
  nothing_found: "Kò sí nǹkan níbí síbẹ̀",
  nothing_found_detail: "Keys ṣì jẹ́ tuntun. Gbìyànjú ọ̀rọ̀ díẹ̀, tàbí pa àyẹ̀wò náà kí o rí gbogbo ohun tí a ti fi sí.",
  what_was_checked_here: "Ohun tí a ṣàyẹ̀wò",
  listed_by: "Ẹni tí ó fi sí",
  not_verified_listing: "Keys kò ṣàyẹ̀wò ibí yìí. Má sanwó kí o tó rí i kí o sì bá ẹni náà pàdé.",
  check_this_agent: "Ṣàyẹ̀wò nọ́mbà aṣojú yìí",
  step_agent_identity: "Ìṣàyẹ̀wò káàdì ìdánimọ̀",
  step_landlord_authority: "Ìfọwọ́sí onílé",
  step_capture_on_site: "Fọ́tò ní ibẹ̀",
  step_walkthrough_video: "Fídíò ìrìn àyíká",
  step_not_a_known_duplicate: "Àwọn àwòrán tí kò sí níbòmíràn",
  step_recently_confirmed: "A fọwọ́ sí i pé ó ṣì wà",
  step_nothing_upheld: "Kò sí ẹ̀sùn tí a gbà",
  step_costs_stated: "A ti sọ owó",
  costs_heading: "Ohun tí ó ná láti wọlé",
  costs_rent: "Owó ilé fún ọdún",
  costs_agency_fee: "Owó aṣojú",
  costs_legal_fee: "Owó àdéhùn",
  costs_caution_deposit: "Owó ìdógò",
  costs_service_charge: "Owó ìtọ́jú",
  costs_move_in_total: "Àpapọ̀ owó ìwọlé",
  costs_extras_note: "lórí owó ilé",
  costs_above_custom: "Ó ju ìdá mẹ́wàá tí a mọ̀",
  costs_not_stated: "Aṣojú yìí kò sọ ohun tí owó jẹ́",
  costs_save: "Fi owó náà pamọ́",
  costs_help: "Gbogbo ohun tí ayálégbé ń san kí ó tó gba kọ́kọ́rọ́. Fi 0 sí ibi tí kò sí owó.",
  costs_saved: "A ti fi owó pamọ́",
  tab_messages: "Àwọn ìránṣẹ́",
  messages_lede: "Àwọn aṣojú tí o béèrè lọ́wọ́ wọn nípa ibì kan.",
  no_messages_yet: "Kò sí ìránṣẹ́ síbẹ̀",
  no_messages_yet_help: "Ṣí ìpolówó kan kí o sì béèrè lọ́wọ́ aṣojú. Keys yóò dá nọ́mbà rẹ dúró títí ẹ̀yin méjèèjì yóò fi gbà.",
  exchange_none: "Kò sí nọ́mbà tí a pín",
  exchange_you_offered: "O pín tìrẹ",
  exchange_they_offered: "Wọ́n pín tiwọn",
  exchange_done: "A ti pín àwọn nọ́mbà",
  message_the_agent: "Béèrè nípa ibì yìí",
  ask_about_this_place: "Béèrè nípa ibì yìí",
  why_we_want_your_number: "Keys ni yóò pa á mọ́. Aṣojú kò rí i — bí o bá fẹ́ kí wọ́n ní i, ìwọ yóò yàn án nígbà mìíràn, nínú ìjíròrò náà.",
  say_something: "Sọ nǹkan kan",
  send: "Fi ránṣẹ́",
  share_my_number: "Pín nọ́mbà mi",
  share_my_number_help: "Wọn yóò rí i kìkì tí wọ́n bá pín tiwọn. O lè gbà á padà títí di ìgbà náà.",
  take_my_number_back: "Gba nọ́mbà mi padà",
  their_number: "Nọ́mbà wọn",
  ask_to_see_it: "Béèrè láti rí i",
  waiting_on_the_agent: "À ń dúró de aṣojú",
  they_agreed_to_show_it: "Wọ́n gbà láti fi hàn",
  they_declined: "Wọn kò lè fi hàn",
  inspection_fee_is: "Láti rí i wọn yóò gba",
  inspection_free: "Wọn yóò fi hàn lọ́fẹ̀ẹ́",
  what_happened_when_you_went: "Kí ló ṣẹlẹ̀ nígbà tí o lọ?",
  outcome_did_not_exist: "Kò sí ohunkóhun níbẹ̀",
  outcome_agent_did_not_show: "Kò sẹ́ni tí ó wá",
  outcome_asked_for_more_money: "Wọ́n béèrè owó púpọ̀ sí i",
  outcome_as_described: "Ó dàbí bí a ṣe sọ",
  outcome_not_for_me: "Kò bá mi mu",
  how_much_were_you_asked: "Owó mélòó ni wọ́n béèrè lọ́wọ́ rẹ?",
  tell_us: "Sọ fún Keys",
  your_name: "Orúkọ rẹ",
  your_number: "Nọ́mbà rẹ",
  start_messaging: "Bẹ̀rẹ̀ ìránṣẹ́",
  enquiries: "Àwọn ìbéèrè",
  no_enquiries: "Kò sẹ́ni tí ó béèrè nípa àwọn ibi rẹ síbẹ̀.",
  reply_to_them: "Dáhùn",
  they_want_to_see_it: "Wọ́n fẹ́ rí i",
  what_will_you_charge: "Owó mélòó ni ìwọ yóò gba láti fi hàn?",
  agree_to_show: "Gbà láti fi hàn",
  decline: "Kò lè fi hàn",
  outcome_recorded: "A dúpẹ́. A ti kọ ọ́ sílẹ̀.",
  number_shared: "A ti pín àwọn nọ́mbà",
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
  condition_costs_stated: "Kwuo ihe ọ ga-efu ịbanye: ụgwọ ụlọ, ụgwọ gị, ụgwọ nkwekọrịta, ego nchekwa na ụgwọ ọrụ. Efu bụ azịza; oghere abụghị.",
  condition_nobody_found_it_missing: "Otu onye gara adreesị a kwuo na ọ dịghị ihe dị ebe ahụ. Sepụta foto nʼebe ụlọ ahụ dị nʼime ngwa a, nke a ga-ewepụ ya ozugbo.",
  step_nobody_found_it_missing: "Ọ dịghị onye na-ahụghị ya",
  one_property_confirmed: "Otu ụlọ onye nwe ụlọ kwadoro",
  report_lede: "Onye nyocha na-agụ nke a tupu ihe ọ bụla apụta banyere onye ọ bụla. Anaghị ebipụta ihe i dere ebe a ruo mgbe mmadụ kwadoro ya.",
  only_report_what_happened_to_you: "Kọọ ihe mere gị, ọ bụghị ihe ị nụrụ. Mkpesa onye ọ bụla na-apụghị inyocha ka a na-apụghị ịkwado, nke ghọrọ ụgha kwa jọrọ njọ karịa enweghị mkpesa ọ bụla.",
  a_report_about_your_number: "Mkpesa gbasara nọmba gị",
  nothing_published_yet: "E bipụtabeghị ihe ọ bụla gbasara nke a, a gaghịkwa ebipụta ruo mgbe mmadụ gụrụ akụkụ gị.",
  what_was_said: "Ihe e kwuru",
  your_answer: "Azịza gị",
  your_answer_help: "Onye nyocha na-agụ nke a n'akụkụ mkpesa ahụ. Kwuo ihe mere n'ezie.",
  send_your_answer: "Zipu azịza gị",
  answer_recorded: "Edekọtala azịza gị.",
  answer_recorded_detail: "Onye nyocha na-agụ ya n'akụkụ mkpesa ahụ tupu o kpebie ihe ọ bụla.",
  already_answered: "Ị zaghachiworị nke a. Onye nyocha nwere akụkụ gị.",
  reply_link_not_valid: "Njikọ ahụ abaghị uru",
  reply_link_help: "Site na ozi ahụ mepee ya kama ịdepụta akụkụ ya. Ọ bụ naanị ụzọ anyị ga-esi mara na ọ bụ gị, anyị chọrọ nke ahụ karịa ịrịọ gị ka i mepee akaụntụ.",
  you_have_until: "Ị nwere oge ruo",
  still_available: "Ọ ka dị",
  confirmed_today: "Akwadoro ya. Ndị mgbazinye nwere ike ịdabere na nke a izu abụọ.",
  confirm_every_fortnight: "Kwado nke a kwa izu abụọ, ma ọ bụghị ya ọ gaghị abụ nke akwadoro ọzọ.",
  mark_where_this_is: "Debe ebe ụlọ a dị",
  mark_where_this_is_help: "Mee nke a ka ị guzo n'ebe ahụ. A na-edekọ ya otu ugboro, a pụghịkwa ịkwaga ya, n'ihi na ịkwaga ya ga-agbanwe ihe foto gị na-egosi.",
  property_placed: "Edeela ya. Foto ndị a sere ebe a ga-agụ ugbu a.",
  take_a_photo: "Sere foto ebe a",
  record_a_walkthrough: "Dekọọ vidiyo njegharị ebe a",
  capture_accepted: "Anabatala ya.",
  place_it_first: "Buru ụzọ debe ebe ụlọ ahụ dị, ma ọ bụghị ya foto agaghị egosi ebe e sere ha.",
  your_properties: "Ụlọ gị",
  add_a_property: "Tinye ụlọ",
  no_properties_yet: "Enweghị ụlọ ugbu a. Tinye otu, wee debe ebe ọ dị ma sere ya foto.",
  a_draft: "Ederede",
  is_verified: "Akwadoro ya",
  steps_left: "fọdụrụ",
  all_steps_done: "Emechaala ihe niile",
  back_to_properties: "Ụlọ gị",
  what_this_property_needs: "Ihe ụlọ a chọrọ",
  this_property: "Ụlọ a",
  add_property_help: "Otu ụlọ n'otu oge. Ị nwere ike ide ya ebe ọ bụla; ihe fọdụrụ ka a ga-eme ka ị guzo na ya.",
  tab_find: "Chọọ",
  find_a_place: "Chọọ ebe obibi",
  find_a_place_lede: "Naanị ebe Keys nyochara, ma ọ bụrụ na ị rịọ maka ndị ọzọ.",
  search_places_hint: "Yaba, ime ụlọ abụọ, Herbert Macaulay",
  verified_only: "Naanị ebe e nyochara",
  nothing_found: "Ọ dịghị ihe ebe a ugbu a",
  nothing_found_detail: "Keys bụ ihe ọhụrụ. Nwaa okwu ole na ole, ma ọ bụ gbanyụọ nzacha ka ị hụ ihe niile etinyere.",
  what_was_checked_here: "Ihe e nyochara",
  listed_by: "Onye tinyere ya",
  not_verified_listing: "Keys enyochabeghị ebe a. Akwụla ụgwọ tupu ị hụ ya ma zute onye ahụ.",
  check_this_agent: "Nyochaa nọmba onye nnọchiteanya a",
  step_agent_identity: "Nyocha kaadị njirimara",
  step_landlord_authority: "Nkwado onye nwe ụlọ",
  step_capture_on_site: "Foto n'ebe ahụ",
  step_walkthrough_video: "Vidiyo njegharị",
  step_not_a_known_duplicate: "Foto na-adịghị ebe ọzọ",
  step_recently_confirmed: "Akwadoro na ọ ka dị",
  step_nothing_upheld: "Ọ dịghị mkpesa akwadoro",
  step_costs_stated: "Ekwuola ụgwọ",
  costs_heading: "Ihe ọ ga-efu ịbanye",
  costs_rent: "Ụgwọ ụlọ maka afọ",
  costs_agency_fee: "Ụgwọ onye nnọchi",
  costs_legal_fee: "Ụgwọ nkwekọrịta",
  costs_caution_deposit: "Ego nchekwa",
  costs_service_charge: "Ụgwọ ọrụ",
  costs_move_in_total: "Mkpokọta ego ịbanye",
  costs_extras_note: "nʼelu ụgwọ ụlọ",
  costs_above_custom: "Ọ karịrị pasent iri a maara",
  costs_not_stated: "Onye nnọchi a ekwughị ihe ụgwọ bụ",
  costs_save: "Chekwaa ụgwọ ndị a",
  costs_help: "Ihe niile onye mgbazinye na-akwụ tupu o nweta igodo. Tinye 0 ebe ọ dịghị ihe a ga-akwụ.",
  costs_saved: "Echekwala ụgwọ",
  tab_messages: "Ozi",
  messages_lede: "Ndị nnọchi ị jụrụ gbasara ebe.",
  no_messages_yet: "Enweghị ozi ugbu a",
  no_messages_yet_help: "Mepee mgbasa ozi ma jụọ onye nnọchi. Keys na-ejigide nọmba gị ruo mgbe unu abụọ kwetara ịgbanwe.",
  exchange_none: "Ekekọtaghị nọmba",
  exchange_you_offered: "I kekọrọ nke gị",
  exchange_they_offered: "Ha kekọrọ nke ha",
  exchange_done: "Ekekọrọ nọmba",
  message_the_agent: "Jụọ gbasara ebe a",
  ask_about_this_place: "Jụọ gbasara ebe a",
  why_we_want_your_number: "Keys na-edobe ya naanị ya. Onye nnọchi anaghị ahụ ya — ọ bụrụ na ị chọrọ ka ha nweta ya, ị ga-ahọrọ ya mgbe e mesịrị, nʼime mkparịta ụka ahụ.",
  say_something: "Kwuo ihe",
  send: "Zipu",
  share_my_number: "Kekọrịta nọmba m",
  share_my_number_help: "Ha ga-ahụ ya naanị ma ha kekọrịta nke ha. Ị nwere ike ịnapụta ya ruo mgbe ahụ.",
  take_my_number_back: "Napụta nọmba m",
  their_number: "Nọmba ha",
  ask_to_see_it: "Rịọ ka ị hụ ya",
  waiting_on_the_agent: "Na-echere onye nnọchi",
  they_agreed_to_show_it: "Ha kwetara igosi ya",
  they_declined: "Ha enweghị ike igosi ya",
  inspection_fee_is: "Iji hụ ya ha ga-ana",
  inspection_free: "Ha ga-egosi ya nʼefu",
  what_happened_when_you_went: "Gịnị mere mgbe ị gara?",
  outcome_did_not_exist: "Ọ dịghị ihe dị ebe ahụ",
  outcome_agent_did_not_show: "Ọ dịghị onye bịara",
  outcome_asked_for_more_money: "Ha rịọrọ ego karịrị",
  outcome_as_described: "Ọ dị ka e kwuru",
  outcome_not_for_me: "Ọ bụghị maka m",
  how_much_were_you_asked: "Ego ole ka a rịọrọ gị?",
  tell_us: "Gwa Keys",
  your_name: "Aha gị",
  your_number: "Nọmba gị",
  start_messaging: "Malite izi ozi",
  enquiries: "Ajụjụ",
  no_enquiries: "Ọ dịghị onye jụrụ gbasara ebe gị ugbu a.",
  reply_to_them: "Zaghachi",
  they_want_to_see_it: "Ha chọrọ ịhụ ya",
  what_will_you_charge: "Ego ole ka ị ga-ana igosi ya?",
  agree_to_show: "Kweta igosi ya",
  decline: "Enweghị ike igosi",
  outcome_recorded: "Daalụ. Edeela ya.",
  number_shared: "Ekekọrọ nọmba",
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

/**
 * The condition as a checklist row: a noun, true whether it is met or not.
 *
 * `conditionPhrase` is an instruction — *take a photo standing at the
 * property* — which is the right words for something outstanding and the
 * wrong words for something done. A checklist that ticked the instruction read
 * as "✓ one of these images is already on a listing we blocked", which is a
 * solved problem stated as a live one.
 *
 * Writing a second, past-tense set was the obvious fix and the wrong one:
 * "Your ID is checked" is a lie on an unticked row, so it would have needed a
 * *third* set for the unmet case. A noun phrase — "ID check" — is true in both
 * states, which is why checklists are written that way.
 *
 * Short on purpose. Six paragraphs is not a checklist; the instruction earns
 * its length only on the one step that is next.
 *
 * **And written for two readers.** The agent sees these on their own property;
 * a tenant sees the same seven on the listing page. "Your own images" was
 * second-person to the agent and nonsense to the tenant reading about somebody
 * else's flat — so every label here has to be true from either side, which
 * rules out "your" as much as it rules out an instruction.
 */
export function conditionStepPhrase(condition: string): Phrase {
  return `step_${condition}` as Phrase;
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ha' || value === 'yo' || value === 'ig';
}
