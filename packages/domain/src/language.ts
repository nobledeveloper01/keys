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
  | 'no_signal_nothing_sent'
  | 'loading'
  | 'verified'
  | 'report_a_number'
  | 'check_a_number'
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
  | 'check_a_number_hint'
  | 'check_a_number_help'
  | 'not_a_nigerian_number'
  | 'nothing_upheld'
  | 'not_a_clean_bill'
  | 'reviewed_by_a_person'
  | 'upheld_reports'
  | 'one_upheld_report'
  | 'report_this_number'
  | 'lede_registry'
  | 'claims_note'
  | 'category_fake_listing'
  | 'category_inspection_fee_scam'
  | 'category_property_already_let'
  | 'category_impersonation'
  | 'category_undisclosed_fees'
  | 'category_no_show'
  | 'share_this_answer'
  | 'refused_reply_window_open'
  | 'refused_no_evidence'
  | 'refused_already_decided'
  | 'verified_agent'
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
  | 'cannot_keep_a_session'
  | 'what_tenants_see'
  | 'ask_a_landlord'
  | 'ask_a_landlord_help'
  | 'which_property'
  | 'landlord_number'
  | 'ask_them'
  | 'what_you_are_letting'
  | 'save_draft'
  | 'publish_listing'
  | 'draft_private'
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
  | 'where_your_session_lives'
  | 'session_in_keychain'
  | 'session_nowhere_safe'
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
  | 'this_will_use_data'
  | 'send_it'
  | 'not_now'
  | 'capture_cancelled'
  | 'take_a_photo'
  | 'record_a_walkthrough'
  | 'capture_accepted'
  | 'your_properties'
  | 'add_a_property'
  | 'no_properties_yet'
  | 'a_draft'
  | 'is_verified'
  | 'steps_left'
  | 'all_steps_done'
  | 'back_to_properties'
  | 'what_this_property_needs'
  | 'add_property_help'
  | 'tab_find'
  | 'find_a_place'
  | 'find_a_place_lede'
  | 'search_places_hint'
  | 'verified_only'
  | 'saved_places'
  | 'save_this_place'
  | 'saved_already'
  | 'saved_copy_heading'
  | 'saved_today'
  | 'saved_recently'
  | 'saved_a_while_ago'
  | 'keys_cannot_check_offline'
  | 'nothing_found'
  | 'nothing_found_detail'
  | 'check_met'
  | 'check_not_met'
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
  | 'paid_to_appear_here'
  | 'what_your_search_found'
  | 'matched_not_shown'
  | 'save_this_search'
  | 'search_saved'
  | 'saved_searches'
  | 'saved_searches_lede'
  | 'saved_searches_none'
  | 'nothing_moved'
  | 'move_new'
  | 'move_price'
  | 'move_gone'
  | 'move_reappeared'
  | 'forget_search'
  | 'matching_now'
  | 'sign_in_to_save_search'
  | 'report_this_listing'
  | 'report_this_listing_help'
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
  | 'enquiries'
  | 'reply_to_them'
  | 'they_want_to_see_it'
  | 'what_will_you_charge'
  | 'agree_to_show'
  | 'decline'
  | 'outcome_recorded'
  | 'number_shared'
  | 'tenancy'
  | 'tenancies_lede'
  | 'tenancies_none'
  | 'portfolio'
  | 'portfolio_lede'
  | 'portfolio_none'
  | 'open_a_tenancy'
  | 'tenant_account_id'
  | 'rent_per_period'
  | 'period'
  | 'period_monthly'
  | 'period_quarterly'
  | 'period_yearly'
  | 'periods_count'
  | 'caution_deposit'
  | 'starts_on'
  | 'agreement'
  | 'template_not_reviewed'
  | 'signed_by_both'
  | 'signed_by_you'
  | 'signed_by_other'
  | 'unsigned'
  | 'sign_agreement'
  | 'recorded_note'
  | 'schedule'
  | 'due_on'
  | 'recorded_so_far'
  | 'disputed'
  | 'record_received'
  | 'amount_naira'
  | 'received_on'
  | 'correct_amount'
  | 'why_wrong'
  | 'dispute_amount'
  | 'what_is_wrong'
  | 'receipts'
  | 'receipt_corrected'
  | 'tickets'
  | 'open_ticket'
  | 'ticket_category'
  | 'ticket_description'
  | 'cat_plumbing'
  | 'cat_electrical'
  | 'cat_structural'
  | 'cat_security'
  | 'cat_pests'
  | 'cat_appliance'
  | 'cat_other'
  | 'state_open'
  | 'state_acknowledged'
  | 'state_assigned'
  | 'state_in_progress'
  | 'state_resolved'
  | 'state_closed'
  | 'move_to'
  | 'walk_record'
  | 'walk_record_lede'
  | 'start_move_in'
  | 'start_move_out'
  | 'walk_move_in'
  | 'walk_move_out'
  | 'pick_rooms'
  | 'add_item'
  | 'caption'
  | 'verdict_snag'
  | 'verdict_fine'
  | 'acknowledge'
  | 'acknowledged_both'
  | 'acknowledged_one'
  | 'draft'
  | 'compare'
  | 'unchanged'
  | 'new_snags'
  | 'fixed_since'
  | 'missing_since'
  | 'added_since'
  | 'end_tenancy'
  | 'ended'
  | 'nothing_recorded'
  | 'period_of'
  | 'add_a_note'
  | 'city'
  | 'any_city'
  | 'distance_from'
  | 'pick_a_place'
  | 'within_km'
  | 'km_from'
  | 'area_guide'
  | 'area_guide_lede'
  | 'guide_not_enough'
  | 'guide_answers'
  | 'q_power'
  | 'q_water'
  | 'q_transport'
  | 'q_market'
  | 'power_under_4h'
  | 'power_4_to_8h'
  | 'power_8_to_16h'
  | 'power_over_16h'
  | 'water_borehole'
  | 'water_public_supply'
  | 'water_water_vendor'
  | 'water_well'
  | 'transport_bus'
  | 'transport_keke'
  | 'transport_okada'
  | 'transport_brt'
  | 'transport_train'
  | 'transport_ferry'
  | 'market_walking'
  | 'market_short_ride'
  | 'market_far'
  | 'tell_about_area'
  | 'tell_about_area_lede'
  | 'answer_sent'
  | 'apply_for_this'
  | 'apply_lede'
  | 'occupation'
  | 'household_size'
  | 'move_in_by'
  | 'application_note'
  | 'send_application'
  | 'applications'
  | 'applications_lede'
  | 'applications_none'
  | 'agent_applications_lede'
  | 'on_keys_for_days'
  | 'days'
  | 'tenancies_recorded'
  | 'app_submitted'
  | 'app_seen'
  | 'app_shortlisted'
  | 'app_offered'
  | 'app_declined'
  | 'app_withdrawn'
  | 'withdraw_application'
  | 'already_applied';

export const EN: Readonly<Record<Phrase, string>> = {
  app_name: "Keys",
  try_again: "Try again",
  /*
    Renamed from `no_signal`.

    The text was always honest — it says "No signal" and nothing else — but the
    identifier promised a queue this app does not have, on eleven screens, and a
    name is how the next person decides what already exists. If offline drafts
    are ever built, the message will change too, and the two should start
    agreeing rather than start with the name running ahead.
  */
  loading: "Loading",
  verified: "Verified",
  report_a_number: "Report a number",
  check_a_number: "Check a number",
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
  /*
    Renamed from `no_signal`.

    The text was always honest — it says "No signal" and nothing else — but the
    identifier promised a queue this app does not have, on eleven screens, and a
    name is how the next person decides what already exists. If offline drafts
    are ever built, the message will change too, and the two should start
    agreeing rather than start with the name running ahead.
  */
  /*
    Renamed from `no_signal_saved_here`.

    The text was always honest — it says "No signal" and nothing else — but the
    identifier promised a queue this app does not have, on eleven screens, and a
    name is how the next person decides what already exists. There was also
    already a `no_signal`, with different words in Yoruba and Igbo, so the
    rename collided and the new name had to say what actually happens: nothing
    was sent, and nothing was kept.

    If offline drafts are ever built the message changes too, and the name and
    the behaviour should start agreeing rather than the name running ahead.
  */
  no_signal_nothing_sent: "No signal",
  refused_reply_window_open: "The seven days are not up yet.",
  refused_no_evidence: "There is nothing attached to assess.",
  refused_already_decided: "Somebody has already decided this one.",
  verified_agent: "This number belongs to an agent Keys has checked.",
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
  cannot_keep_a_session: "This phone cannot keep an account safely, so Keys will not open one on it.",
  open_an_account: "Open an account",
  what_tenants_see: "What a tenant sees when they check your number",
  ask_a_landlord: "Ask a landlord to confirm you",
  ask_a_landlord_help: "We text them a code. Nothing changes unless they enter it. Use their own number, not a second number of yours — we check, and we refuse.",
  which_property: "Which property",
  landlord_number: "The landlord's number",
  ask_them: "Ask them",
  what_you_are_letting: "What you are letting",
  save_draft: "Save draft",
  publish_listing: "Publish",
  draft_private: "Draft. Nobody can see this.",
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
  this_will_use_data: "This will use about",
  send_it: "Send it",
  not_now: "Not now",
  capture_cancelled: "Nothing was sent.",
  take_a_photo: "Take a photo here",
  record_a_walkthrough: "Record a walkthrough here",
  capture_accepted: "Accepted.",
  your_properties: "Your properties",
  add_a_property: "Add a property",
  no_properties_yet: "No properties yet. Add one, then mark where it is and photograph it.",
  a_draft: "Draft",
  is_verified: "Verified",
  steps_left: "left to do",
  all_steps_done: "Everything done",
  back_to_properties: "Your properties",
  what_this_property_needs: "What this property needs",
  add_property_help: "One property at a time. You can draft it anywhere; the rest has to be done standing at it.",
  tab_find: "Find",
  find_a_place: "Find a place",
  find_a_place_lede: "Only places Keys has checked, unless you ask for the rest.",
  search_places_hint: "Yaba, two bedroom, Herbert Macaulay",
  saved_places: "Saved",
  save_this_place: "Save this place",
  saved_already: "Saved",
  saved_copy_heading: "What Keys had checked when you saved this",
  saved_today: "saved today",
  saved_recently: "saved in the last fortnight",
  saved_a_while_ago: "saved more than a fortnight ago",
  keys_cannot_check_offline: "Keys cannot check this again until you have signal, so it does not say whether it is still checked.",
  verified_only: "Checked places only",
  nothing_found: "Nothing here yet",
  nothing_found_detail: "Keys is new. Try fewer words, or turn off the filter to see everything that has been posted.",
  check_met: "checked",
  check_not_met: "not checked",
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
  paid_to_appear_here: "These agents paid to appear here",
  what_your_search_found: "What your search found",
  matched_not_shown: "matched and were not shown, because they could not be verified.",
  save_this_search: "Save this search",
  search_saved: "Saved. Come back to it under Messages to see what moved.",
  saved_searches: "Saved searches",
  saved_searches_lede: "Each one remembers what it saw. Opening this is what moves “since last time” forward.",
  saved_searches_none: "No saved searches yet. Save one from Find.",
  nothing_moved: "Nothing has moved since you last looked.",
  move_new: "New since you last looked",
  move_price: "Price changed",
  move_gone: "No longer shown",
  move_reappeared: "The same photographs, back under a different agent",
  forget_search: "Forget",
  matching_now: "matching now",
  sign_in_to_save_search: "Ask about a place first to get an account; then a search can be saved.",
  report_this_listing: "Report this listing",
  report_this_listing_help: "You do not need the agent's number. Keys knows whose listing this is.",
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
  enquiries: "Enquiries",
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
  where_your_session_lives: "Your account on this phone",
  session_in_keychain: "Kept in the phone's secure storage.",
  session_nowhere_safe: "This phone has nowhere safe to keep an account.",
  appearance: "Appearance",
  language_setting: "Language",
  check_a_number_hint: "0803 123 4567",
  check_a_number_help: "Any format. 0803…, +234 803…, or 803….",
  not_a_nigerian_number: "That does not look like a Nigerian phone number.",
  nothing_upheld: "No upheld reports against this number.",
  not_a_clean_bill: "That is not a clean bill of health. Most scams are never reported. Pay nothing before you have seen the place and met the person.",
  reviewed_by_a_person: "Each of these was reviewed by a person, and whoever holds this number had seven days to answer.",
  upheld_reports: "upheld reports",
  one_upheld_report: "One upheld report against this number.",
  report_this_number: "Report this number",
  lede_registry: "Reports of rental scams in Nigeria. A person reviews each one before it appears here.",
  claims_note: "Keys checks authority to let, not ownership, and handles no money.",
  category_fake_listing: "The property did not exist",
  category_inspection_fee_scam: "An inspection fee for a viewing that never happened",
  category_property_already_let: "The property had already been let",
  category_impersonation: "Pretended to be an agent or landlord they were not",
  category_undisclosed_fees: "Fees that were never mentioned",
  category_no_show: "Took the appointment and never turned up",
  share_this_answer: "Send this to whoever asked",
  tenancy: "Tenancy",
  tenancies_lede: "Your agreement, what was recorded, every receipt and both condition records — on this phone, with or without signal.",
  tenancies_none: "No tenancy yet. The letting side opens one for you; it appears here to sign.",
  portfolio: "Your tenancies",
  portfolio_lede: "One row per tenancy: what is due next, what was recorded against it, and which tickets are waiting. Never a total.",
  portfolio_none: "No tenancies yet. Open one on a property you hold authority over.",
  open_a_tenancy: "Open a tenancy",
  tenant_account_id: "The tenant's account id, from your conversation",
  rent_per_period: "Rent for one period, in naira",
  period: "Period",
  period_monthly: "Monthly",
  period_quarterly: "Quarterly",
  period_yearly: "Yearly",
  periods_count: "How many periods",
  caution_deposit: "Caution deposit, in naira",
  starts_on: "Starts on (YYYY-MM-DD)",
  agreement: "The agreement",
  template_not_reviewed: "This template has not yet been read by a lawyer. Keys is not giving legal advice; either party may take their own.",
  signed_by_both: "Signed by both. In force.",
  signed_by_you: "Signed by you. Waiting for the other party.",
  signed_by_other: "Signed by the other party. Waiting for you.",
  unsigned: "Not signed yet.",
  sign_agreement: "Sign with this phone",
  recorded_note: "Keys records what the parties say happened. It does not receive, hold, move or ask for money.",
  schedule: "The schedule",
  due_on: "Due on",
  recorded_so_far: "Recorded so far",
  disputed: "Disputed by the tenant",
  record_received: "Record as received",
  amount_naira: "Amount, in naira",
  received_on: "Received on (YYYY-MM-DD)",
  correct_amount: "Correct this amount",
  why_wrong: "Why the earlier entry was wrong",
  dispute_amount: "This is not right",
  what_is_wrong: "What is wrong",
  receipts: "Receipts",
  receipt_corrected: "Corrected to",
  tickets: "Maintenance",
  open_ticket: "Report a fault",
  ticket_category: "What kind of fault",
  ticket_description: "What is wrong, and where",
  cat_plumbing: "Plumbing",
  cat_electrical: "Electrical",
  cat_structural: "Structural",
  cat_security: "Security",
  cat_pests: "Pests",
  cat_appliance: "Appliance",
  cat_other: "Something else",
  state_open: "Open",
  state_acknowledged: "Seen",
  state_assigned: "Somebody assigned",
  state_in_progress: "Being fixed",
  state_resolved: "Fixed, says the letting side",
  state_closed: "Closed by the tenant",
  move_to: "Mark as",
  walk_record: "Condition record",
  walk_record_lede: "Room by room, photograph by photograph, on the day it can still be written down. It counts when both have signed the same record.",
  start_move_in: "Start the move-in record",
  start_move_out: "Start the move-out record",
  walk_move_in: "Move-in",
  walk_move_out: "Move-out",
  pick_rooms: "Which rooms",
  add_item: "Photograph something",
  caption: "What is it",
  verdict_snag: "Snag",
  verdict_fine: "Fine",
  acknowledge: "Sign this record",
  acknowledged_both: "Signed by both. Nothing changes it now.",
  acknowledged_one: "Signed by one party. Waiting for the other.",
  draft: "A draft. Either party may still change it.",
  compare: "Beside the move-in",
  unchanged: "As at move-in.",
  new_snags: "New snags",
  fixed_since: "Fixed since",
  missing_since: "Missing since",
  added_since: "Added since",
  end_tenancy: "End the tenancy",
  ended: "Ended. The record stays with both parties.",
  nothing_recorded: "Nothing recorded yet.",
  period_of: "Period",
  add_a_note: "Add a note",
  city: "City",
  any_city: "Anywhere",
  distance_from: "Distance from",
  pick_a_place: "Pick a place you go often — your work, a school, a market",
  within_km: "Within",
  km_from: "km from",
  area_guide: "What tenants here say",
  area_guide_lede: "Answers from people with a tenancy in this area — counts, not a verdict. Nothing about any person.",
  guide_not_enough: "Not enough answers yet. The guide shows once five separate tenants have answered.",
  guide_answers: "tenants answered",
  q_power: "Power, hours a day",
  q_water: "Water",
  q_transport: "How to get here",
  q_market: "A daily market",
  power_under_4h: "Under 4 hours",
  power_4_to_8h: "4 to 8 hours",
  power_8_to_16h: "8 to 16 hours",
  power_over_16h: "Over 16 hours",
  water_borehole: "Borehole",
  water_public_supply: "Public supply",
  water_water_vendor: "Water vendor",
  water_well: "Well",
  transport_bus: "Bus",
  transport_keke: "Keke",
  transport_okada: "Okada",
  transport_brt: "BRT",
  transport_train: "Train",
  transport_ferry: "Ferry",
  market_walking: "Walking distance",
  market_short_ride: "A short ride",
  market_far: "Far",
  tell_about_area: "Tell others about this area",
  tell_about_area_lede: "Four questions with fixed answers. Your latest answer is the one that counts, and your name is never on it.",
  answer_sent: "Thank you. Your answers are counted with the others.",
  apply_for_this: "Apply for this place",
  apply_lede: "In your own words, to this agent, for this place. Keys adds only what you can see on your own screen: how long you have been on Keys and how many tenancies it has recorded for you. It computes nothing about you.",
  occupation: "What you do",
  household_size: "How many of you will live here",
  move_in_by: "When you can move in (YYYY-MM-DD)",
  application_note: "Anything else you want the agent to know",
  send_application: "Send",
  applications: "Applications",
  applications_lede: "Every change of status, as it happened. An agent may decline; Keys never says why, because there is no reason field.",
  applications_none: "No applications yet.",
  agent_applications_lede: "The applicant's own words. Keys has computed nothing about them, and offers you nothing it could not show them.",
  on_keys_for_days: "On Keys for",
  days: "days",
  tenancies_recorded: "tenancies recorded",
  app_submitted: "Sent",
  app_seen: "Seen",
  app_shortlisted: "Shortlisted",
  app_offered: "Offered",
  app_declined: "Declined",
  app_withdrawn: "Withdrawn",
  withdraw_application: "Withdraw",
  already_applied: "You have an open application for this place.",
};

export const HA: Readonly<Record<Phrase, string>> = {
  app_name: "Keys",
  try_again: "Sake gwadawa",
  loading: "Ana lodi",
  verified: "An tabbatar",
  report_a_number: "Ka kai ƙarar lamba",
  check_a_number: "Duba lamba",
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
  no_signal_nothing_sent: "Babu sigina",
  refused_reply_window_open: "Kwanaki bakwai ba su cika ba tukuna.",
  refused_no_evidence: "Babu wata shaida da aka haɗa.",
  refused_already_decided: "An riga an yanke hukunci a kan wannan.",
  verified_agent: "Wannan lambar mallakar wakili ne da Keys ya duba.",
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
  cannot_keep_a_session: "Wannan wayar ba za ta iya adana asusu lafiya ba, don haka Keys ba zai buɗe ɗaya a kanta ba.",
  open_an_account: "Buɗe asusu",
  what_tenants_see: "Abin da mai haya ke gani idan ya duba lambarka",
  ask_a_landlord: "Ka roƙi mai gida ya tabbatar da kai",
  ask_a_landlord_help: "Muna aika masa lamba ta saƙo. Ba abin da ke sauyawa sai ya shigar da ita. Yi amfani da lambarsa, ba wata lambarka ba — muna duba, kuma muna ƙi.",
  which_property: "Wane wuri",
  landlord_number: "Lambar mai gida",
  ask_them: "Ka roƙe shi",
  what_you_are_letting: "Abin da kake hayarwa",
  save_draft: "Ajiye shirin",
  publish_listing: "Buga",
  draft_private: "Shiri. Babu wanda ke ganin wannan.",
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
  this_will_use_data: "Wannan zai yi amfani da kusan",
  send_it: "Aika shi",
  not_now: "Ba yanzu ba",
  capture_cancelled: "Ba a aika komai ba.",
  take_a_photo: "Ɗauki hoto a nan",
  record_a_walkthrough: "Ɗauki bidiyon zagayawa a nan",
  capture_accepted: "An karɓa.",
  your_properties: "Wuraren ka",
  add_a_property: "Ƙara wuri",
  no_properties_yet: "Babu wurare tukuna. Ƙara ɗaya, sannan ka yi alama inda yake ka ɗauki hoto.",
  a_draft: "Shiri",
  is_verified: "An tabbatar",
  steps_left: "sun rage",
  all_steps_done: "An gama komai",
  back_to_properties: "Wuraren ka",
  what_this_property_needs: "Abin da wannan wurin ke buƙata",
  add_property_help: "Wuri ɗaya a lokaci ɗaya. Za ka iya shirya shi ko'ina; sauran dole ka yi shi kana tsaye a wurin.",
  tab_find: "Nemo",
  find_a_place: "Nemo wuri",
  find_a_place_lede: "Wuraren da Keys ya duba kawai, sai dai ka nemi sauran.",
  search_places_hint: "Yaba, ɗaki biyu, Herbert Macaulay",
  saved_places: "An ajiye",
  save_this_place: "Ajiye wannan wurin",
  saved_already: "An ajiye",
  saved_copy_heading: "Abin da Keys ya duba lokacin da ka ajiye wannan",
  saved_today: "an ajiye yau",
  saved_recently: "an ajiye cikin makonni biyu",
  saved_a_while_ago: "an ajiye fiye da makonni biyu",
  keys_cannot_check_offline: "Keys ba zai iya sake duba wannan ba sai kana da sigina, don haka bai ce ko har yanzu an duba shi ba.",
  verified_only: "Wuraren da aka duba kawai",
  nothing_found: "Babu kome a nan tukuna",
  nothing_found_detail: "Keys sabo ne. Gwada kalmomi kaɗan, ko kashe tacewa don ganin duk abin da aka sanya.",
  check_met: "an duba",
  check_not_met: "ba a duba ba",
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
  paid_to_appear_here: "Waɗannan dillalai sun biya don su bayyana a nan",
  what_your_search_found: "Abin da bincikenka ya samu",
  matched_not_shown: "sun dace amma ba a nuna su ba, domin ba a iya tabbatar da su ba.",
  save_this_search: "Ajiye wannan bincike",
  search_saved: "An ajiye. Ka koma gare shi a Saƙonni don ganin abin da ya canja.",
  saved_searches: "Binciken da aka ajiye",
  saved_searches_lede: "Kowanne yana tuna abin da ya gani. Buɗe wannan shi ne ke ɗaga “tun lokacin ƙarshe” gaba.",
  saved_searches_none: "Babu binciken da aka ajiye tukuna. Ajiye ɗaya daga Nemo.",
  nothing_moved: "Babu abin da ya canja tun lokacin ƙarshe da ka duba.",
  move_new: "Sabo tun lokacin ƙarshe da ka duba",
  move_price: "Farashi ya canja",
  move_gone: "Ba a ƙara nuna shi ba",
  move_reappeared: "Hotuna iri ɗaya, sun dawo ƙarƙashin wani wakili daban",
  forget_search: "Manta",
  matching_now: "sun dace yanzu",
  sign_in_to_save_search: "Fara tambaya game da wuri don samun asusu; sannan za a iya ajiye bincike.",
  report_this_listing: "Bayar da rahoton wannan tallar",
  report_this_listing_help: "Ba ka bukatar lambar dillali. Keys ya san tallan wa ne.",
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
  enquiries: "Tambayoyi",
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
  where_your_session_lives: "Asusunka a wannan wayar",
  session_in_keychain: "An ajiye a wurin ajiya mai tsaro na wayar.",
  session_nowhere_safe: "Wannan wayar ba ta da wurin da zai kiyaye asusu.",
  appearance: "Kamanni",
  language_setting: "Harshe",
  check_a_number_hint: "0803 123 4567",
  check_a_number_help: "Kowace sura. 0803…, +234 803…, ko 803….",
  not_a_nigerian_number: "Wannan bai yi kama da lambar wayar Najeriya ba.",
  nothing_upheld: "Babu rahoton da aka tabbatar a kan wannan lambar.",
  not_a_clean_bill: "Wannan ba shaidar tsafta ba ce. Yawancin zamba ba a taɓa ba da rahoto ba. Kada ka biya kafin ka ga wurin ka kuma sadu da mutumin.",
  reviewed_by_a_person: "Mutum ne ya duba kowanne, kuma wanda ke da wannan lambar ya sami kwana bakwai don amsawa.",
  upheld_reports: "rahotannin da aka tabbatar",
  one_upheld_report: "Rahoto ɗaya da aka tabbatar a kan wannan lambar.",
  report_this_number: "Ba da rahoton wannan lambar",
  lede_registry: "Rahotannin zamban haya a Najeriya. Mutum yana duba kowanne kafin ya bayyana a nan.",
  claims_note: "Keys yana duba izinin haya, ba mallakar gida ba, kuma ba ya riƙe kuɗi.",
  category_fake_listing: "Gidan bai wanzu ba",
  category_inspection_fee_scam: "Kuɗin dubawa don kallon da bai taɓa faruwa ba",
  category_property_already_let: "An riga an ba da gidan haya",
  category_impersonation: "Sun yi kamar wakili ko mai gida da ba su ba ne",
  category_undisclosed_fees: "Kuɗaɗen da ba a taɓa ambata ba",
  category_no_show: "Sun karɓi alƙawari amma ba su zo ba",
  share_this_answer: "Aika wannan ga wanda ya tambaya",
  tenancy: "Haya",
  tenancies_lede: "Yarjejeniyarka, abin da aka rubuta, kowace rasit da rikodin yanayin gida — a wannan wayar, da sigina ko ba tare da ita ba.",
  tenancies_none: "Babu haya tukuna. Mai ba da haya zai buɗe maka ɗaya; za ta bayyana a nan don sa hannu.",
  portfolio: "Hayoyinka",
  portfolio_lede: "Layi ɗaya ga kowace haya: abin da ke zuwa, abin da aka rubuta, da tikitin da ke jira. Ba jimla ba.",
  portfolio_none: "Babu haya tukuna. Buɗe ɗaya a kan gidan da kake da izini a kai.",
  open_a_tenancy: "Buɗe haya",
  tenant_account_id: "Lambar asusun mai haya, daga tattaunawarku",
  rent_per_period: "Kuɗin haya na lokaci ɗaya, a naira",
  period: "Lokaci",
  period_monthly: "Kowane wata",
  period_quarterly: "Kowane wata uku",
  period_yearly: "Kowace shekara",
  periods_count: "Lokuta nawa",
  caution_deposit: "Kuɗin ajiya, a naira",
  starts_on: "Farawa (YYYY-MM-DD)",
  agreement: "Yarjejeniyar",
  template_not_reviewed: "Lauya bai karanta wannan samfurin ba tukuna. Keys ba ya ba da shawarar shari'a; kowane ɓangare na iya nemo tasa.",
  signed_by_both: "Duka biyu sun sa hannu. Tana aiki.",
  signed_by_you: "Ka sa hannu. Ana jiran ɗayan ɓangaren.",
  signed_by_other: "Ɗayan ɓangaren ya sa hannu. Ana jiran ka.",
  unsigned: "Ba a sa hannu ba tukuna.",
  sign_agreement: "Sa hannu da wannan wayar",
  recorded_note: "Keys yana rubuta abin da ɓangarorin suka ce ya faru. Ba ya karɓa, riƙe, motsa ko neman kuɗi.",
  schedule: "Jadawalin",
  due_on: "Ranar biya",
  recorded_so_far: "An rubuta zuwa yanzu",
  disputed: "Mai haya ya ƙi yarda",
  record_received: "Rubuta cewa an karɓa",
  amount_naira: "Adadi, a naira",
  received_on: "Ranar da aka karɓa (YYYY-MM-DD)",
  correct_amount: "Gyara wannan adadin",
  why_wrong: "Dalilin da rubutun farko ya yi kuskure",
  dispute_amount: "Wannan ba daidai ba ne",
  what_is_wrong: "Me ba daidai ba",
  receipts: "Rasitoci",
  receipt_corrected: "An gyara zuwa",
  tickets: "Gyara",
  open_ticket: "Ba da rahoton lalacewa",
  ticket_category: "Wace irin lalacewa",
  ticket_description: "Me ya lalace, kuma a ina",
  cat_plumbing: "Famfo",
  cat_electrical: "Wutar lantarki",
  cat_structural: "Gini",
  cat_security: "Tsaro",
  cat_pests: "Kwari",
  cat_appliance: "Na'ura",
  cat_other: "Wani abu dabam",
  state_open: "A buɗe",
  state_acknowledged: "An gani",
  state_assigned: "An ba wani",
  state_in_progress: "Ana gyarawa",
  state_resolved: "An gyara, in ji mai ba da haya",
  state_closed: "Mai haya ya rufe",
  move_to: "Yi masa alama",
  walk_record: "Rikodin yanayin gida",
  walk_record_lede: "Ɗaki bayan ɗaki, hoto bayan hoto, a ranar da har yanzu ana iya rubutawa. Yana ƙidaya idan duka biyu sun sa hannu a rikodi ɗaya.",
  start_move_in: "Fara rikodin shiga",
  start_move_out: "Fara rikodin fita",
  walk_move_in: "Shiga",
  walk_move_out: "Fita",
  pick_rooms: "Waɗanne ɗakuna",
  add_item: "Ɗauki hoton wani abu",
  caption: "Menene",
  verdict_snag: "Lalacewa",
  verdict_fine: "Lafiya",
  acknowledge: "Sa hannu a wannan rikodin",
  acknowledged_both: "Duka biyu sun sa hannu. Babu abin da zai canza shi yanzu.",
  acknowledged_one: "Ɓangare ɗaya ya sa hannu. Ana jiran ɗayan.",
  draft: "Daftari. Kowane ɓangare na iya canza shi tukuna.",
  compare: "Kusa da rikodin shiga",
  unchanged: "Kamar lokacin shiga.",
  new_snags: "Sabbin lalacewa",
  fixed_since: "An gyara tun",
  missing_since: "Ya ɓace tun",
  added_since: "An ƙara tun",
  end_tenancy: "Kawo ƙarshen haya",
  ended: "Ta ƙare. Rikodin ya rage ga ɓangarorin biyu.",
  nothing_recorded: "Ba a rubuta komai ba tukuna.",
  period_of: "Lokaci",
  add_a_note: "Ƙara bayani",
  city: "Birni",
  any_city: "Ko'ina",
  distance_from: "Nisa daga",
  pick_a_place: "Zaɓi wurin da kake zuwa akai-akai — aikinka, makaranta, kasuwa",
  within_km: "A cikin",
  km_from: "km daga",
  area_guide: "Abin da masu haya a nan ke cewa",
  area_guide_lede: "Amsoshi daga mutanen da ke da haya a wannan yankin — ƙidaya, ba hukunci ba. Babu komai game da kowane mutum.",
  guide_not_enough: "Babu isassun amsoshi tukuna. Jagorar za ta bayyana idan masu haya biyar daban-daban sun amsa.",
  guide_answers: "masu haya sun amsa",
  q_power: "Wutar lantarki, awanni a rana",
  q_water: "Ruwa",
  q_transport: "Yadda ake zuwa nan",
  q_market: "Kasuwar yau da kullum",
  power_under_4h: "Ƙasa da awa 4",
  power_4_to_8h: "Awa 4 zuwa 8",
  power_8_to_16h: "Awa 8 zuwa 16",
  power_over_16h: "Fiye da awa 16",
  water_borehole: "Rijiyar burtsatse",
  water_public_supply: "Ruwan gwamnati",
  water_water_vendor: "Mai sayar da ruwa",
  water_well: "Rijiya",
  transport_bus: "Bas",
  transport_keke: "Keke",
  transport_okada: "Okada",
  transport_brt: "BRT",
  transport_train: "Jirgin ƙasa",
  transport_ferry: "Jirgin ruwa",
  market_walking: "Tafiya a ƙafa",
  market_short_ride: "Ɗan gajeren tafiya",
  market_far: "Nesa",
  tell_about_area: "Faɗa wa wasu game da wannan yankin",
  tell_about_area_lede: "Tambayoyi huɗu da tsayayyun amsoshi. Amsarka ta ƙarshe ce ake ƙidaya, kuma sunanka ba ya kanta.",
  answer_sent: "Na gode. An ƙidaya amsoshinka tare da na sauran.",
  apply_for_this: "Nemi wannan wurin",
  apply_lede: "Da kalmominka, ga wannan wakili, don wannan wurin. Keys yana ƙara abin da kake iya gani a allonka kawai: tsawon lokacinka a Keys da yawan hayar da ya rubuta maka. Ba ya lissafa komai game da kai.",
  occupation: "Abin da kake yi",
  household_size: "Ku nawa za ku zauna a nan",
  move_in_by: "Lokacin da za ka iya shiga (YYYY-MM-DD)",
  application_note: "Wani abu kuma da kake son wakilin ya sani",
  send_application: "Aika",
  applications: "Buƙatu",
  applications_lede: "Kowane canjin matsayi, yadda ya faru. Wakili na iya ƙi; Keys ba ya taɓa faɗin dalili, domin babu filin dalili.",
  applications_none: "Babu buƙatu tukuna.",
  agent_applications_lede: "Kalmomin mai nema. Keys bai lissafa komai game da su ba, kuma ba ya ba ka abin da ba zai iya nuna musu ba.",
  on_keys_for_days: "A Keys tsawon",
  days: "kwanaki",
  tenancies_recorded: "hayoyin da aka rubuta",
  app_submitted: "An aika",
  app_seen: "An gani",
  app_shortlisted: "An zaɓa",
  app_offered: "An bayar",
  app_declined: "An ƙi",
  app_withdrawn: "An janye",
  withdraw_application: "Janye",
  already_applied: "Kana da buƙata a buɗe don wannan wurin.",
};

export const YO: Readonly<Record<Phrase, string>> = {
  app_name: "Keys",
  try_again: "Gbìyànjú lẹ́ẹ̀kansi",
  loading: "Ń gbé wọlé",
  verified: "A ti fọwọ́sí",
  report_a_number: "Ròyìn nọ́mbà kan",
  check_a_number: "Ṣàyẹ̀wò nọ́mbà kan",
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
  no_signal_nothing_sent: "Kò sí ìsopọ̀",
  refused_reply_window_open: "Ọjọ́ méje kò tí ì pé.",
  refused_no_evidence: "Kò sí ẹ̀rí kankan tí a so mọ́ ọn.",
  refused_already_decided: "Ẹnìkan ti pinnu lórí èyí tẹ́lẹ̀.",
  verified_agent: "Nọ́mbà yìí jẹ́ ti aṣojú tí Keys ti ṣàyẹ̀wò.",
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
  cannot_keep_a_session: "Fóònù yìí kò lè pa àkántì mọ́ láìséwu, nítorí náà Keys kò ní ṣí ọ̀kan sí i.",
  open_an_account: "Ṣí àkántì",
  what_tenants_see: "Ohun tí agbatọ́jú rí nígbà tí ó bá ṣàyẹ̀wò nọ́mbà rẹ",
  ask_a_landlord: "Béèrè lọ́wọ́ onílé kí ó fọwọ́ sí ọ",
  ask_a_landlord_help: "A ó fi kóòdù ránṣẹ́ sí i. Kò sí ohun tí ó ń yípadà àyàfi tí ó bá tẹ̀ ẹ́. Lo nọ́mbà tirẹ̀, kì í ṣe nọ́mbà kejì tìrẹ — a ń ṣàyẹ̀wò, a sì ń kọ̀.",
  which_property: "Ilé wo",
  landlord_number: "Nọ́mbà onílé",
  ask_them: "Béèrè lọ́wọ́ rẹ̀",
  what_you_are_letting: "Ohun tí ò ń yá",
  save_draft: "Pa àkọsílẹ̀ mọ́",
  publish_listing: "Tẹ̀ jáde",
  draft_private: "Àkọsílẹ̀. Kò sí ẹni tí ó lè rí èyí.",
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
  this_will_use_data: "Èyí yóò lo nǹkan bí",
  send_it: "Fi ránṣẹ́",
  not_now: "Kì í ṣe nísinsìnyí",
  capture_cancelled: "A kò fi nǹkankan ránṣẹ́.",
  take_a_photo: "Ya fọ́tò níbí",
  record_a_walkthrough: "Ya fídíò ìrìn àyíká níbí",
  capture_accepted: "A ti gbà á.",
  your_properties: "Àwọn ilé rẹ",
  add_a_property: "Fi ilé kún un",
  no_properties_yet: "Kò sí ilé kankan síbẹ̀. Fi ọ̀kan kún un, kí o sàmi ibi tí ó wà kí o sì ya fọ́tò rẹ̀.",
  a_draft: "Àkọsílẹ̀",
  is_verified: "A ti fọwọ́ sí i",
  steps_left: "ó ṣẹ́kù",
  all_steps_done: "Gbogbo rẹ̀ ti parí",
  back_to_properties: "Àwọn ilé rẹ",
  what_this_property_needs: "Ohun tí ilé yìí nílò",
  add_property_help: "Ilé kan lẹ́ẹ̀kan. O lè kọ ọ́ sílẹ̀ níbikíbi; ìyókù gbọ́dọ̀ ṣe nígbà tí o dúró níbẹ̀.",
  tab_find: "Wá",
  find_a_place: "Wá ibùgbé",
  find_a_place_lede: "Àwọn ibi tí Keys ti ṣàyẹ̀wò nìkan, àyàfi tí o bá béèrè fún àwọn yòókù.",
  search_places_hint: "Yaba, yàrá méjì, Herbert Macaulay",
  saved_places: "A ti fi pamọ́",
  save_this_place: "Fi ibí yìí pamọ́",
  saved_already: "A ti fi pamọ́",
  saved_copy_heading: "Ohun tí Keys ti ṣàyẹ̀wò nígbà tí o fi èyí pamọ́",
  saved_today: "a fi pamọ́ lónìí",
  saved_recently: "a fi pamọ́ láàrin ọ̀sẹ̀ méjì",
  saved_a_while_ago: "a fi pamọ́ ju ọ̀sẹ̀ méjì lọ",
  keys_cannot_check_offline: "Keys kò lè ṣàyẹ̀wò èyí mọ́ títí tí o fi ní ìsopọ̀, nítorí náà kò sọ bóyá a ṣì ṣàyẹ̀wò rẹ̀.",
  verified_only: "Àwọn ibi tí a ṣàyẹ̀wò nìkan",
  nothing_found: "Kò sí nǹkan níbí síbẹ̀",
  nothing_found_detail: "Keys ṣì jẹ́ tuntun. Gbìyànjú ọ̀rọ̀ díẹ̀, tàbí pa àyẹ̀wò náà kí o rí gbogbo ohun tí a ti fi sí.",
  check_met: "a ti ṣàyẹ̀wò",
  check_not_met: "kò tíì ṣàyẹ̀wò",
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
  paid_to_appear_here: "Àwọn aṣojú wọ̀nyí san owó láti fara hàn níbí",
  what_your_search_found: "Ohun tí ìwádìí rẹ rí",
  matched_not_shown: "bá a mu, a kò sì fi wọ́n hàn, nítorí a kò lè jẹ́rìí sí wọn.",
  save_this_search: "Fi ìwádìí yìí pamọ́",
  search_saved: "A ti fi pamọ́. Padà sí i lábẹ́ Ìránṣẹ́ láti rí ohun tó yí padà.",
  saved_searches: "Àwọn ìwádìí tí a fi pamọ́",
  saved_searches_lede: "Ọ̀kọ̀ọ̀kan rántí ohun tó rí. Ṣíṣí èyí ni ó ń gbé “láti ìgbà tó kọjá” síwájú.",
  saved_searches_none: "Kò sí ìwádìí tí a fi pamọ́ síbẹ̀. Fi ọ̀kan pamọ́ láti Wá.",
  nothing_moved: "Kò sí ohun tó yí padà láti ìgbà tí o wò kẹ́yìn.",
  move_new: "Tuntun láti ìgbà tí o wò kẹ́yìn",
  move_price: "Owó yí padà",
  move_gone: "A kò fi hàn mọ́",
  move_reappeared: "Àwọn fọ́tò kan náà, padà lábẹ́ aṣojú mìíràn",
  forget_search: "Gbàgbé",
  matching_now: "tó bá a mu báyìí",
  sign_in_to_save_search: "Kọ́kọ́ béèrè nípa ibì kan láti ní àkọọ́lẹ̀; lẹ́yìn náà a lè fi ìwádìí pamọ́.",
  report_this_listing: "Ròyìn ìpolówó yìí",
  report_this_listing_help: "O kò nílò nọ́mbà aṣojú. Keys mọ ẹni tí ìpolówó yìí jẹ́ tirẹ̀.",
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
  enquiries: "Àwọn ìbéèrè",
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
  where_your_session_lives: "Àkántì rẹ lórí fóònù yìí",
  session_in_keychain: "A pa á mọ́ nínú ibi ìpamọ́ ààbò fóònù náà.",
  session_nowhere_safe: "Fóònù yìí kò ní ibi tí ó lè pa àkántì mọ́ láìséwu.",
  appearance: "Ìrísí",
  language_setting: "Èdè",
  check_a_number_hint: "0803 123 4567",
  check_a_number_help: "Ìrísí èyíkéyìí. 0803…, +234 803…, tàbí 803….",
  not_a_nigerian_number: "Èyí kò dà bí nọ́mbà fóònù Nàìjíríà.",
  nothing_upheld: "Kò sí ìròyìn tí a fọwọ́sí lórí nọ́mbà yìí.",
  not_a_clean_bill: "Èyí kì í ṣe ẹ̀rí mímọ́. Ọ̀pọ̀ jìbìtì ni a kò ròyìn rí. Má sanwó kí o tó rí ibẹ̀ kí o sì bá ẹni náà pàdé.",
  reviewed_by_a_person: "Ènìyàn ló ṣàyẹ̀wò ọ̀kọ̀ọ̀kan, ẹni tó ní nọ́mbà yìí sì ní ọjọ́ méje láti dáhùn.",
  upheld_reports: "ìròyìn tí a fọwọ́sí",
  one_upheld_report: "Ìròyìn kan tí a fọwọ́sí lórí nọ́mbà yìí.",
  report_this_number: "Ròyìn nọ́mbà yìí",
  lede_registry: "Ìròyìn jìbìtì ìyáléta ní Nàìjíríà. Ènìyàn ni ó ń ṣàyẹ̀wò ọ̀kọ̀ọ̀kan kí ó tó farahàn níbí.",
  claims_note: "Keys ń ṣàyẹ̀wò àṣẹ láti yá ilé, kì í ṣe níní ilé, kò sì ń mú owó.",
  category_fake_listing: "Ilé náà kò sí",
  category_inspection_fee_scam: "Owó àyẹ̀wò fún ìwò tí kò ṣẹlẹ̀ rí",
  category_property_already_let: "A ti yá ilé náà tẹ́lẹ̀",
  category_impersonation: "Wọ́n ṣe bí aṣojú tàbí onílé tí wọn kì í ṣe",
  category_undisclosed_fees: "Owó tí a kò dárúkọ rí",
  category_no_show: "Wọ́n gba ìpàdé, wọn kò sì dé",
  share_this_answer: "Fi èyí ránṣẹ́ sí ẹni tó béèrè",
  tenancy: "Ìgbàlé",
  tenancies_lede: "Àdéhùn rẹ, ohun tí a kọ sílẹ̀, gbogbo ìwé ẹ̀rí àti ìwé ipò ilé méjèèjì — lórí fóònù yìí, pẹ̀lú tàbí láìsí nẹ́tíwọ̀kì.",
  tenancies_none: "Kò tíì sí ìgbàlé. Ẹni tó ń gbé ilé lé ọ lọ́wọ́ ni yóò ṣí i; yóò hàn níbí fún ìbuwọ́lù.",
  portfolio: "Àwọn ìgbàlé rẹ",
  portfolio_lede: "Ìlà kan fún ìgbàlé kọ̀ọ̀kan: ohun tó ń bọ̀, ohun tí a kọ sílẹ̀, àti àwọn tíkẹ́ẹ̀tì tó ń dúró. Kì í ṣe àpapọ̀ láé.",
  portfolio_none: "Kò tíì sí ìgbàlé. Ṣí ọ̀kan lórí ilé tí o ní àṣẹ lé lórí.",
  open_a_tenancy: "Ṣí ìgbàlé",
  tenant_account_id: "Nọ́mbà àkáǹtì ayálégbé, láti inú ìbánisọ̀rọ̀ yín",
  rent_per_period: "Owó ilé fún àkókò kan, ní náírà",
  period: "Àkókò",
  period_monthly: "Oṣooṣù",
  period_quarterly: "Oṣù mẹ́ta mẹ́ta",
  period_yearly: "Ọdọọdún",
  periods_count: "Àkókò mélòó",
  caution_deposit: "Owó ìdúró, ní náírà",
  starts_on: "Ó bẹ̀rẹ̀ ní (YYYY-MM-DD)",
  agreement: "Àdéhùn náà",
  template_not_reviewed: "Agbẹjọ́rò kò tíì ka àwòṣe yìí. Keys kò fún ni ní ìmọ̀ràn òfin; ẹnikẹ́ni lára yín lè wá tirẹ̀.",
  signed_by_both: "Àwọn méjèèjì ti buwọ́lù. Ó ti wà ní ipa.",
  signed_by_you: "O ti buwọ́lù. À ń dúró de ẹgbẹ́ kejì.",
  signed_by_other: "Ẹgbẹ́ kejì ti buwọ́lù. À ń dúró dè ọ́.",
  unsigned: "Kò tíì buwọ́lù.",
  sign_agreement: "Buwọ́lù pẹ̀lú fóònù yìí",
  recorded_note: "Keys ń kọ ohun tí àwọn ẹgbẹ́ sọ pé ó ṣẹlẹ̀. Kì í gba, kì í pa mọ́, kì í gbé, kì í sì béèrè owó.",
  schedule: "Ètò ìsanwó",
  due_on: "Ọjọ́ tó yẹ",
  recorded_so_far: "A ti kọ sílẹ̀ títí di ìsinsìnyí",
  disputed: "Ayálégbé kò gbà",
  record_received: "Kọ pé a ti gbà",
  amount_naira: "Iye, ní náírà",
  received_on: "Ọjọ́ tí a gbà (YYYY-MM-DD)",
  correct_amount: "Ṣàtúnṣe iye yìí",
  why_wrong: "Ìdí tí ìkọsílẹ̀ àkọ́kọ́ fi jẹ́ àṣìṣe",
  dispute_amount: "Èyí kò tọ́",
  what_is_wrong: "Kí ló kù",
  receipts: "Àwọn ìwé ẹ̀rí",
  receipt_corrected: "A ṣàtúnṣe sí",
  tickets: "Àtúnṣe ilé",
  open_ticket: "Sọ nípa àléébù",
  ticket_category: "Irú àléébù wo",
  ticket_description: "Kí ló bàjẹ́, níbo",
  cat_plumbing: "Omi àti páìpù",
  cat_electrical: "Iná mànàmáná",
  cat_structural: "Ilé fúnra rẹ̀",
  cat_security: "Ààbò",
  cat_pests: "Kòkòrò",
  cat_appliance: "Ẹ̀rọ",
  cat_other: "Ohun mìíràn",
  state_open: "Ṣíṣí",
  state_acknowledged: "A ti rí i",
  state_assigned: "A ti gbé fún ẹnìkan",
  state_in_progress: "À ń tún ṣe",
  state_resolved: "A ti tún ṣe, ni ẹni tó ń gbé ilé wí",
  state_closed: "Ayálégbé ti tì í",
  move_to: "Fi àmì sí",
  walk_record: "Ìwé ipò ilé",
  walk_record_lede: "Yàrá dé yàrá, fọ́tò dé fọ́tò, ní ọjọ́ tí a ṣì lè kọ ọ́ sílẹ̀. Ó kà nígbà tí àwọn méjèèjì bá ti buwọ́lù sí ìwé kan náà.",
  start_move_in: "Bẹ̀rẹ̀ ìwé ìwọlé",
  start_move_out: "Bẹ̀rẹ̀ ìwé ìjáde",
  walk_move_in: "Ìwọlé",
  walk_move_out: "Ìjáde",
  pick_rooms: "Àwọn yàrá wo",
  add_item: "Ya fọ́tò ohun kan",
  caption: "Kí ni",
  verdict_snag: "Àléébù",
  verdict_fine: "Ó dára",
  acknowledge: "Buwọ́lù sí ìwé yìí",
  acknowledged_both: "Àwọn méjèèjì ti buwọ́lù. Kò sí ohun tó lè yí i padà mọ́.",
  acknowledged_one: "Ẹgbẹ́ kan ti buwọ́lù. À ń dúró de èkejì.",
  draft: "Àkọsílẹ̀. Ẹgbẹ́ kọ̀ọ̀kan ṣì lè yí i padà.",
  compare: "Lẹ́gbẹ̀ẹ́ ìwé ìwọlé",
  unchanged: "Bí ó ti wà nígbà ìwọlé.",
  new_snags: "Àléébù tuntun",
  fixed_since: "A ti tún ṣe láti",
  missing_since: "Ó ti sọnù láti",
  added_since: "A ti fi kún láti",
  end_tenancy: "Parí ìgbàlé",
  ended: "Ó ti parí. Ìwé náà wà lọ́wọ́ àwọn méjèèjì.",
  nothing_recorded: "Kò tíì sí ohun tí a kọ sílẹ̀.",
  period_of: "Àkókò",
  add_a_note: "Fi àkọsílẹ̀ kún",
  city: "Ìlú",
  any_city: "Níbikíbi",
  distance_from: "Ìjìnnà láti",
  pick_a_place: "Yan ibi tí o máa ń lọ déédéé — ibi iṣẹ́ rẹ, ilé ẹ̀kọ́, ọjà",
  within_km: "Láàrin",
  km_from: "km láti",
  area_guide: "Ohun tí àwọn ayálégbé níbí sọ",
  area_guide_lede: "Ìdáhùn láti ọ̀dọ̀ àwọn tó ní ìgbàlé ní agbègbè yìí — ìkà, kì í ṣe ìdájọ́. Kò sí nǹkan kan nípa ẹnikẹ́ni.",
  guide_not_enough: "Kò tíì sí ìdáhùn tó pọ̀ tó. Ìtọ́sọ́nà máa hàn nígbà tí ayálégbé márùn-ún ọ̀tọ̀ọ̀tọ̀ bá ti dáhùn.",
  guide_answers: "ayálégbé dáhùn",
  q_power: "Iná, wákàtí lójúmọ́",
  q_water: "Omi",
  q_transport: "Bí a ṣe ń dé ibí",
  q_market: "Ọjà ojoojúmọ́",
  power_under_4h: "Kò tó wákàtí 4",
  power_4_to_8h: "Wákàtí 4 sí 8",
  power_8_to_16h: "Wákàtí 8 sí 16",
  power_over_16h: "Ju wákàtí 16 lọ",
  water_borehole: "Kànga ẹ̀rọ",
  water_public_supply: "Omi ìjọba",
  water_water_vendor: "Olùta omi",
  water_well: "Kànga",
  transport_bus: "Bọ́ọ̀sì",
  transport_keke: "Kẹ̀kẹ́",
  transport_okada: "Ọkadà",
  transport_brt: "BRT",
  transport_train: "Ọkọ̀ ojú irin",
  transport_ferry: "Ọkọ̀ ojú omi",
  market_walking: "Ìrìn ẹsẹ̀",
  market_short_ride: "Ìrìnàjò kúkúrú",
  market_far: "Ó jìnnà",
  tell_about_area: "Sọ fún àwọn ẹlòmíràn nípa agbègbè yìí",
  tell_about_area_lede: "Ìbéèrè mẹ́rin pẹ̀lú ìdáhùn tó wà lẹ́sẹ̀. Ìdáhùn rẹ tó kẹ́yìn ni a ń kà, orúkọ rẹ kò sì sí lórí rẹ̀ láé.",
  answer_sent: "O ṣeun. A ti ka ìdáhùn rẹ pẹ̀lú ti àwọn yòókù.",
  apply_for_this: "Bèèrè fún ibí yìí",
  apply_lede: "Ní ọ̀rọ̀ tìrẹ, sí aṣojú yìí, fún ibí yìí. Keys fi kún ohun tí o lè rí lórí ìbojú rẹ nìkan: bí o ṣe pẹ́ tó lórí Keys àti iye ìgbàlé tí ó ti kọ sílẹ̀ fún ọ. Kò ṣírò ohunkóhun nípa rẹ.",
  occupation: "Ohun tí o ń ṣe",
  household_size: "Mélòó nínú yín ni yóò gbé níbí",
  move_in_by: "Ìgbà tí o lè wọlé (YYYY-MM-DD)",
  application_note: "Ohun mìíràn tí o fẹ́ kí aṣojú mọ̀",
  send_application: "Fi ránṣẹ́",
  applications: "Àwọn ìbéèrè",
  applications_lede: "Gbogbo ìyípadà ipò, bí ó ti ṣẹlẹ̀. Aṣojú lè kọ̀; Keys kì í sọ ìdí rẹ̀ láé, nítorí kò sí ààyè fún ìdí.",
  applications_none: "Kò tíì sí ìbéèrè.",
  agent_applications_lede: "Ọ̀rọ̀ olùbéèrè fúnra rẹ̀. Keys kò ṣírò ohunkóhun nípa wọn, kò sì fún ọ ní ohun tí kò lè fi hàn wọ́n.",
  on_keys_for_days: "Lórí Keys fún",
  days: "ọjọ́",
  tenancies_recorded: "ìgbàlé tí a kọ sílẹ̀",
  app_submitted: "A ti fi ránṣẹ́",
  app_seen: "A ti rí i",
  app_shortlisted: "A ti yàn",
  app_offered: "A ti fún",
  app_declined: "A kọ̀",
  app_withdrawn: "A ti fà sẹ́yìn",
  withdraw_application: "Fà sẹ́yìn",
  already_applied: "O ní ìbéèrè tó ṣí sílẹ̀ fún ibí yìí.",
};

export const IG: Readonly<Record<Phrase, string>> = {
  app_name: "Keys",
  try_again: "Nwaa ọzọ",
  loading: "Na-ebugo",
  verified: "A kwadoro ya",
  report_a_number: "Kọọ nọmba",
  check_a_number: "Lelee nọmba",
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
  no_signal_nothing_sent: "Enweghị netwọk",
  refused_reply_window_open: "Ụbọchị asaa erubeghị.",
  refused_no_evidence: "Ọ dịghị ihe akaebe e jikọtara na ya.",
  refused_already_decided: "Otu onye ekpebiela nke a.",
  verified_agent: "Nọmba a bụ nke onye nnọchiteanya Keys nyochara.",
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
  cannot_keep_a_session: "Ekwentị a enweghị ike ichekwa akaụntụ nʼudo, ya mere Keys agaghị emepe otu na ya.",
  open_an_account: "Meghee akaụntụ",
  what_tenants_see: "Ihe onye mgbazinye na-ahụ mgbe ọ nyochara nọmba gị",
  ask_a_landlord: "Rịọ onye nwe ụlọ ka ọ kwado gị",
  ask_a_landlord_help: "Anyị na-ezigara ya koodu na ozi. Ọ dịghị ihe na-agbanwe ma ọ bụghị na o tinye ya. Jiri nọmba nke ya, ọ bụghị nọmba nke abụọ gị — anyị na-enyocha, anyị na-ajụkwa.",
  which_property: "Ụlọ ole",
  landlord_number: "Nọmba onye nwe ụlọ",
  ask_them: "Rịọ ya",
  what_you_are_letting: "Ihe ị na-agbazinye",
  save_draft: "Chekwaa ederede",
  publish_listing: "Bipụta",
  draft_private: "Ederede. Ọ dịghị onye na-ahụ nke a.",
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
  this_will_use_data: "Nke a ga-eji ihe dịka",
  send_it: "Zipu ya",
  not_now: "Ọ bụghị ugbu a",
  capture_cancelled: "E zipughị ihe ọ bụla.",
  take_a_photo: "Sere foto ebe a",
  record_a_walkthrough: "Dekọọ vidiyo njegharị ebe a",
  capture_accepted: "Anabatala ya.",
  your_properties: "Ụlọ gị",
  add_a_property: "Tinye ụlọ",
  no_properties_yet: "Enweghị ụlọ ugbu a. Tinye otu, wee debe ebe ọ dị ma sere ya foto.",
  a_draft: "Ederede",
  is_verified: "Akwadoro ya",
  steps_left: "fọdụrụ",
  all_steps_done: "Emechaala ihe niile",
  back_to_properties: "Ụlọ gị",
  what_this_property_needs: "Ihe ụlọ a chọrọ",
  add_property_help: "Otu ụlọ n'otu oge. Ị nwere ike ide ya ebe ọ bụla; ihe fọdụrụ ka a ga-eme ka ị guzo na ya.",
  tab_find: "Chọọ",
  find_a_place: "Chọọ ebe obibi",
  find_a_place_lede: "Naanị ebe Keys nyochara, ma ọ bụrụ na ị rịọ maka ndị ọzọ.",
  search_places_hint: "Yaba, ime ụlọ abụọ, Herbert Macaulay",
  saved_places: "Echekwara",
  save_this_place: "Chekwaa ebe a",
  saved_already: "Echekwara",
  saved_copy_heading: "Ihe Keys nyochara mgbe ị chekwara nke a",
  saved_today: "echekwara taa",
  saved_recently: "echekwara nʼime izu abụọ",
  saved_a_while_ago: "echekwara karịa izu abụọ",
  keys_cannot_check_offline: "Keys enweghị ike ịnyocha nke a ọzọ ruo mgbe ị nwere netwọk, ya mere ọ naghị ekwu ma a ka nyochara ya.",
  verified_only: "Naanị ebe e nyochara",
  nothing_found: "Ọ dịghị ihe ebe a ugbu a",
  nothing_found_detail: "Keys bụ ihe ọhụrụ. Nwaa okwu ole na ole, ma ọ bụ gbanyụọ nzacha ka ị hụ ihe niile etinyere.",
  check_met: "enyochara",
  check_not_met: "anyochabeghị",
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
  paid_to_appear_here: "Ndị nnọchi a kwụrụ ụgwọ ka ha pụta ebe a",
  what_your_search_found: "Ihe nchọta gị chọtara",
  matched_not_shown: "dabara ma egosighị ha, n’ihi na enweghị ike ịkwado ha.",
  save_this_search: "Chekwaa nchọta a",
  search_saved: "Echekwara ya. Laghachi na ya n’okpuru Ozi ka ị hụ ihe gbanwere.",
  saved_searches: "Nchọta ndị echekwara",
  saved_searches_lede: "Nke ọ bụla na-echeta ihe ọ hụrụ. Imeghe nke a bụ ihe na-ebuga “kemgbe oge ikpeazụ” n’ihu.",
  saved_searches_none: "Enwebeghị nchọta echekwara. Chekwaa otu site na Chọọ.",
  nothing_moved: "Ọ dịghị ihe gbanwere kemgbe oge ikpeazụ ị lere anya.",
  move_new: "Ọhụrụ kemgbe oge ikpeazụ ị lere anya",
  move_price: "Ọnụahịa gbanwere",
  move_gone: "Egosighịzi ya",
  move_reappeared: "Otu foto ahụ, laghachiri n’okpuru onye ọrụ ọzọ",
  forget_search: "Chefuo",
  matching_now: "na-adaba ugbu a",
  sign_in_to_save_search: "Buru ụzọ jụọ maka ebe ka i nweta akaụntụ; mgbe ahụ enwere ike ichekwa nchọta.",
  report_this_listing: "Kọọ mgbasa ozi a",
  report_this_listing_help: "Ị chọghị nọmba onye nnọchi. Keys maara onye nwe mgbasa ozi a.",
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
  enquiries: "Ajụjụ",
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
  where_your_session_lives: "Akaụntụ gị na ekwentị a",
  session_in_keychain: "Echekwara ya nʼebe nchekwa ekwentị.",
  session_nowhere_safe: "Ekwentị a enweghị ebe nchekwa maka akaụntụ.",
  appearance: "Ọdịdị",
  language_setting: "Asụsụ",
  check_a_number_hint: "0803 123 4567",
  check_a_number_help: "Ụdị ọ bụla. 0803…, +234 803…, ma ọ bụ 803….",
  not_a_nigerian_number: "Nke a adịghị ka nọmba ekwentị Naịjirịa.",
  nothing_upheld: "Ọ dịghị akụkọ akwadoro megide nọmba a.",
  not_a_clean_bill: "Nke a abụghị akwụkwọ ahụike dị ọcha. Ọtụtụ aghụghọ ka a na-akọghị. Akwụla ụgwọ tupu ị hụ ebe ahụ ma zute onye ahụ.",
  reviewed_by_a_person: "Mmadụ nyochara nke ọ bụla, onye nwere nọmba a nwekwara ụbọchị asaa iji zaa.",
  upheld_reports: "akụkọ akwadoro",
  one_upheld_report: "Otu akụkọ akwadoro megide nọmba a.",
  report_this_number: "Kọọ nọmba a",
  lede_registry: "Akụkọ aghụghọ mgbazinye ụlọ na Naịjirịa. Mmadụ na-enyocha nke ọ bụla tupu o gosi ebe a.",
  claims_note: "Keys na-elele ikike ịgbazinye ụlọ, ọ bụghị inwe ụlọ, ọ naghịkwa ejide ego.",
  category_fake_listing: "Ụlọ ahụ adịghị",
  category_inspection_fee_scam: "Ego nyocha maka nleta na-emeghị eme",
  category_property_already_let: "E gbazinyelarị ụlọ ahụ",
  category_impersonation: "Ha mere ka onye nnọchiteanya ma ọ bụ onye nwe ụlọ ha na-abụghị",
  category_undisclosed_fees: "Ụgwọ a na-akpọtụghị aha ya",
  category_no_show: "Ha nabatara oge ma ha abịaghị",
  share_this_answer: "Zigara onye jụrụ nke a",
  tenancy: "Mgbazinye ụlọ",
  tenancies_lede: "Nkwekọrịta gị, ihe e dere, akwụkwọ nnata ọ bụla na ndekọ ọnọdụ ụlọ abụọ — n'ekwentị a, ma nwee netwọk ma ọ bụ enweghị.",
  tenancies_none: "Enwebeghị mgbazinye. Onye na-agbazinye ga-emepe gị otu; ọ ga-apụta ebe a ka ị bịanye aka.",
  portfolio: "Mgbazinye gị niile",
  portfolio_lede: "Otu ahịrị maka mgbazinye ọ bụla: ihe na-abịa, ihe e dere megide ya, na tiketi na-eche. Ọ bụghị nchikota ma ọlị.",
  portfolio_none: "Enwebeghị mgbazinye. Mepee otu n'ụlọ ị nwere ikike na ya.",
  open_a_tenancy: "Mepee mgbazinye",
  tenant_account_id: "Nọmba akaụntụ onye bi n'ụlọ, site na mkparịta ụka unu",
  rent_per_period: "Ụgwọ ụlọ maka otu oge, na naịra",
  period: "Oge",
  period_monthly: "Kwa ọnwa",
  period_quarterly: "Kwa ọnwa atọ",
  period_yearly: "Kwa afọ",
  periods_count: "Oge ole",
  caution_deposit: "Ego nkwụnye, na naịra",
  starts_on: "Na-amalite na (YYYY-MM-DD)",
  agreement: "Nkwekọrịta ahụ",
  template_not_reviewed: "Onye ọka iwu agụbeghị ụdị a. Keys anaghị enye ndụmọdụ iwu; akụkụ ọ bụla nwere ike ịchọta nke ya.",
  signed_by_both: "Ha abụọ bịanyere aka. Ọ na-arụ ọrụ.",
  signed_by_you: "Ị bịanyere aka. A na-eche akụkụ nke ọzọ.",
  signed_by_other: "Akụkụ nke ọzọ bịanyere aka. A na-eche gị.",
  unsigned: "A bịanyebeghị aka.",
  sign_agreement: "Bịanye aka na ekwentị a",
  recorded_note: "Keys na-ede ihe akụkụ abụọ kwuru na ọ mere. Ọ naghị anata, ejide, ebugharị ma ọ bụ rịọ ego.",
  schedule: "Usoro ụgwọ",
  due_on: "Ụbọchị ọ ruru",
  recorded_so_far: "E dere ruo ugbu a",
  disputed: "Onye bi n'ụlọ ekwenyeghị",
  record_received: "Dee na e nwetara ya",
  amount_naira: "Ego ole, na naịra",
  received_on: "Ụbọchị e nwetara ya (YYYY-MM-DD)",
  correct_amount: "Dozie ego a",
  why_wrong: "Ihe mere ndekọ mbụ ji dị njọ",
  dispute_amount: "Nke a ezighị ezi",
  what_is_wrong: "Gịnị na-ezighị ezi",
  receipts: "Akwụkwọ nnata",
  receipt_corrected: "E doziri ya ka ọ bụrụ",
  tickets: "Nrụzi",
  open_ticket: "Kọọ ihe mebiri",
  ticket_category: "Ụdị mmebi",
  ticket_description: "Gịnị mebiri, na ebee",
  cat_plumbing: "Ọkpọkọ mmiri",
  cat_electrical: "Ọkụ eletrik",
  cat_structural: "Ahụ ụlọ",
  cat_security: "Nchekwa",
  cat_pests: "Ụmụ ahụhụ",
  cat_appliance: "Ngwá",
  cat_other: "Ihe ọzọ",
  state_open: "Emepere",
  state_acknowledged: "Ahụla ya",
  state_assigned: "Enyere mmadụ",
  state_in_progress: "A na-arụzi ya",
  state_resolved: "Arụziela ya, ka onye na-agbazinye kwuru",
  state_closed: "Onye bi n'ụlọ mechiri ya",
  move_to: "Kaa ya dịka",
  walk_record: "Ndekọ ọnọdụ ụlọ",
  walk_record_lede: "Ọnụ ụlọ n'otu n'otu, foto n'otu n'otu, n'ụbọchị a ka nwere ike idetu ya. Ọ na-agụ mgbe ha abụọ bịanyere aka n'otu ndekọ.",
  start_move_in: "Malite ndekọ mbata",
  start_move_out: "Malite ndekọ ọpụpụ",
  walk_move_in: "Mbata",
  walk_move_out: "Ọpụpụ",
  pick_rooms: "Ọnụ ụlọ ndị",
  add_item: "See foto ihe",
  caption: "Gịnị bụ ya",
  verdict_snag: "Mmebi",
  verdict_fine: "Ọ dị mma",
  acknowledge: "Bịanye aka na ndekọ a",
  acknowledged_both: "Ha abụọ bịanyere aka. Ọ dịghị ihe ga-agbanwe ya ugbu a.",
  acknowledged_one: "Otu akụkụ bịanyere aka. A na-eche nke ọzọ.",
  draft: "Ihe odide. Akụkụ ọ bụla ka nwere ike gbanwee ya.",
  compare: "N'akụkụ ndekọ mbata",
  unchanged: "Dịka ọ dị na mbata.",
  new_snags: "Mmebi ọhụrụ",
  fixed_since: "E doziri kemgbe",
  missing_since: "Ọ furu kemgbe",
  added_since: "Agbakwunyere kemgbe",
  end_tenancy: "Kwụsị mgbazinye",
  ended: "Ọ kwụsịrị. Ndekọ ahụ dị n'aka akụkụ abụọ.",
  nothing_recorded: "Edebeghị ihe ọ bụla.",
  period_of: "Oge",
  add_a_note: "Tinye ihe odide",
  city: "Obodo",
  any_city: "Ebe ọ bụla",
  distance_from: "Ebe dị anya site na",
  pick_a_place: "Họrọ ebe ị na-aga mgbe niile — ọrụ gị, ụlọ akwụkwọ, ahịa",
  within_km: "N'ime",
  km_from: "km site na",
  area_guide: "Ihe ndị bi ebe a na-ekwu",
  area_guide_lede: "Azịza sitere n'aka ndị nwere mgbazinye na mpaghara a — ọnụ ọgụgụ, ọ bụghị mkpebi. Ọ dịghị ihe gbasara onye ọ bụla.",
  guide_not_enough: "Azịza ezughị oke. Ntuziaka ga-apụta mgbe mmadụ ise dị iche zara.",
  guide_answers: "ndị bi ebe a zara",
  q_power: "Ọkụ, awa kwa ụbọchị",
  q_water: "Mmiri",
  q_transport: "Otu e si abịa ebe a",
  q_market: "Ahịa kwa ụbọchị",
  power_under_4h: "N'okpuru awa 4",
  power_4_to_8h: "Awa 4 ruo 8",
  power_8_to_16h: "Awa 8 ruo 16",
  power_over_16h: "Karịa awa 16",
  water_borehole: "Olulu mmiri",
  water_public_supply: "Mmiri gọọmentị",
  water_water_vendor: "Onye na-ere mmiri",
  water_well: "Olulu",
  transport_bus: "Bọs",
  transport_keke: "Keke",
  transport_okada: "Okada",
  transport_brt: "BRT",
  transport_train: "Ụgbọ oloko",
  transport_ferry: "Ụgbọ mmiri",
  market_walking: "Ije ụkwụ",
  market_short_ride: "Njem dị mkpụmkpụ",
  market_far: "Ọ dị anya",
  tell_about_area: "Gwa ndị ọzọ gbasara mpaghara a",
  tell_about_area_lede: "Ajụjụ anọ nwere azịza a kara aka. Azịza gị ikpeazụ ka a na-agụ, aha gị adịghịkwa na ya ma ọlị.",
  answer_sent: "Daalụ. A gụnyere azịza gị na nke ndị ọzọ.",
  apply_for_this: "Rịọ maka ebe a",
  apply_lede: "N'okwu nke gị, nye onye nnọchi anya a, maka ebe a. Keys na-agbakwunye naanị ihe ị na-ahụ na ihuenyo gị: ogologo oge ị nọrọ na Keys na ole mgbazinye o dere gị. Ọ naghị agbakọ ihe ọ bụla gbasara gị.",
  occupation: "Ihe ị na-arụ",
  household_size: "Mmadụ ole n'ime unu ga-ebi ebe a",
  move_in_by: "Mgbe ị nwere ike ịbata (YYYY-MM-DD)",
  application_note: "Ihe ọzọ ị chọrọ ka onye nnọchi anya mara",
  send_application: "Zipu",
  applications: "Arịrịọ",
  applications_lede: "Mgbanwe ọnọdụ ọ bụla, ka o mere. Onye nnọchi anya nwere ike ịjụ; Keys anaghị ekwu ihe kpatara ya, n'ihi na enweghị ebe maka ihe kpatara.",
  applications_none: "Enwebeghị arịrịọ.",
  agent_applications_lede: "Okwu onye na-arịọ n'onwe ya. Keys agbakọghị ihe ọ bụla gbasara ha, ọ naghịkwa enye gị ihe ọ na-enweghị ike igosi ha.",
  on_keys_for_days: "Na Keys ruo",
  days: "ụbọchị",
  tenancies_recorded: "mgbazinye e dere",
  app_submitted: "Ezipụrụ",
  app_seen: "Ahụla",
  app_shortlisted: "Ahọrọla",
  app_offered: "Enyela",
  app_declined: "Ajụrụ",
  app_withdrawn: "Ewepụrụ",
  withdraw_application: "Wepụ",
  already_applied: "Ị nwere arịrịọ mepere emepe maka ebe a.",
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
