import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type Conversation, type Listing } from '@keys/api';
import {
  VERIFIED_CONDITIONS,
  conditionPhrase,
  conditionStepPhrase,
  megabytes,
} from '@keys/domain';

import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Glass } from '../components/Glass';
import { Progress } from '../components/Progress';
import { PropertyRow } from '../components/PropertyRow';
import { Text } from '../components/Text';
import KeysCapture from '../native/NativeKeysCapture';
import { captureFor, deviceIdFor } from '../state/capture';
import { space } from '../design/tokens';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';

/**
 * One property, and everything that can be done to it.
 *
 * Split out of the account screen, which had grown into every action for every
 * listing in one scroll — three properties meant fifteen buttons and no way to
 * see which needed attention.
 *
 * The actions are in the order they have to happen, and only the one that is
 * next is offered at full weight. Asking a landlord lives here rather than at
 * account level because it was always *about* a property: the form used to
 * carry a "which property" field, which is a question the screen already knows
 * the answer to.
 */
export function PropertyScreen({
  baseUrl,
  token,
  listing,
  onBack,
  onChanged,
  onOpenEnquiry,
}: {
  baseUrl: string;
  token: string;
  listing: Listing;
  onBack: () => void;
  onChanged: (said: string) => void;
  onOpenEnquiry: (conversationId: string) => void;
}) {
  const { t } = useLanguage();
  const colours = useColours();

  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [landlordPhone, setLandlordPhone] = useState('');

  /*
    An upload waiting on somebody's answer about their own data.

    Held as state rather than shown through `Alert.alert`, because a system
    dialog cannot be translated by this app's own dictionary — it would be the
    one sentence on the screen in English while everything around it is in
    Hausa, and it would be the sentence about money.
  */
  const [spend, setSpend] = useState<{ bytes: number; decide: (yes: boolean) => void } | null>(
    null,
  );

  const askToSpend = (bytes: number) =>
    new Promise<boolean>((resolve) => {
      setSpend({
        bytes,
        decide: (yes) => {
          setSpend(null);
          resolve(yes);
        },
      });
    });

  /*
    People asking about *this* property.

    Fetched here rather than listed on the account screen, for the reason that
    screen was rebuilt: an enquiry belongs to a property, and a floating list of
    them would have to say which one each was about — a column that exists only
    because the list is in the wrong place.
  */
  const { query: enquiries } = useQuery<readonly Conversation[]>(
    async () => {
      const all = await attempt(() =>
        client({ baseUrl, agentToken: token }).agent.conversations(),
      );
      return all.ok
        ? { ok: true as const, value: all.value.filter((c) => c.listingId === listing.id) }
        : all;
    },
    [baseUrl, token, listing.id],
  );
  const asking = enquiries.state === 'ready' ? enquiries.value : [];
  /*
    Naira in the fields, kobo on the wire.

    Nobody types kobo. An agent types 800000 and means ₦800,000, so the
    conversion happens once, here, at the boundary — and every figure below
    this line is an integer number of kobo that nothing divides.
  */
  const [money, setMoney] = useState({
    rent: '',
    agency: '',
    legal: '',
    deposit: '',
    service: '',
  });

  const unmet = new Set(listing.stillNeeded.map((n) => n.condition));
  const steps = VERIFIED_CONDITIONS.map((condition) => ({
    id: condition,
    // A noun, true ticked or not. The instruction is the detail, and only the
    // next step shows one.
    label: t(conditionStepPhrase(condition)),
    detail: t(conditionPhrase(condition)),
    done: !unmet.has(condition),
  }));
  const left = steps.filter((step) => !step.done).length;

  function refuse(detail: string | null) {
    setProblem(detail ?? t('no_signal_nothing_sent'));
  }


  async function device(): Promise<string | null> {
    const remembered = await AsyncStorage.getItem('keys.device.id').catch(() => null);
    const answer = await deviceIdFor(baseUrl, token, remembered);
    if ('why' in answer) {
      refuse(answer.why);
      return null;
    }
    if (!remembered) await AsyncStorage.setItem('keys.device.id', answer.deviceId).catch(() => {});
    return answer.deviceId;
  }

  /*
    `why: string | null`, not an optional.

    `exactOptionalPropertyTypes` is on, so an optional field and a field that
    may be `undefined` are different types — and every caller here naturally
    produces the second. Null says "no reason given" once, rather than each
    call site converting between two ways of saying nothing.
  */
  function run(
    what: string,
    work: () => Promise<{ ok: boolean; why: string | null }>,
    said: string,
  ) {
    setBusy(what);
    setProblem(null);
    void work()
      .then((result) => {
        if (result.ok) onChanged(said);
        else refuse(result.why);
      })
      .catch((error: unknown) => refuse(error instanceof Error ? error.message : null))
      .finally(() => setBusy(null));
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Button label={t('back_to_properties')} onPress={onBack} quiet />

      <Text variant="headline" style={styles.title}>
        {listing.title}
      </Text>
      <Text variant="body" tone="secondary">
        {listing.propertyId}
      </Text>

      {problem !== null && (
        <Text variant="body" tone="alarm" accessibilityRole="alert" style={styles.row}>
          {problem}
        </Text>
      )}

      {/*
        What this will cost, before it costs it.

        Data here is bought in bundles that run out, and a walkthrough is the
        most expensive thing this product asks anybody to do. A progress bar
        afterwards tells somebody what they have already spent; this asks them
        first, which is the only version where the answer can be no.
      */}
      {spend !== null && (
        <Glass style={styles.card}>
          <Text variant="title">{`${t('this_will_use_data')} ${megabytes(spend.bytes)}`}</Text>
          <Button label={t('send_it')} onPress={() => spend.decide(true)} />
          <Button label={t('not_now')} quiet onPress={() => spend.decide(false)} />
        </Glass>
      )}

      {/*
        The state of it, before anything you can do about it.

        A checklist rather than a list of complaints: an agent four steps in
        should see four ticks, not four fewer paragraphs than last time.
      */}
      <Glass style={styles.card}>
        <Text variant="label" tone="secondary">
          {t('what_this_property_needs')}
        </Text>
        <Text variant="title" style={styles.row}>
          {left === 0 ? t('all_steps_done') : `${left} ${t('steps_left')}`}
        </Text>
        <Progress steps={steps} />
      </Glass>

      {/* Marking the place comes before photographing it, and nothing else can. */}
      {!listing.placed ? (
        <View style={styles.section}>
          <Text variant="body" tone="secondary">
            {t('mark_where_this_is_help')}
          </Text>
          <Button
            label={t('mark_where_this_is')}
            disabled={busy === 'place'}
            onPress={() =>
              run(
                'place',
                async () => {
                  const here = await KeysCapture.whereAmI();
                  const result = await attempt(() =>
                    client({ baseUrl, agentToken: token }).agent.place(
                      listing.id,
                      here.latitude,
                      here.longitude,
                    ),
                  );
                  return result.ok
                    ? { ok: true, why: null }
                    : {
                        ok: false,
                        why: result.failure.kind === 'refused' ? result.failure.detail : null,
                      };
                },
                t('property_placed'),
              )
            }
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Button
            label={t('take_a_photo')}
            disabled={busy === 'photo'}
            onPress={() =>
              run(
                'photo',
                async () => {
                  const id = await device();
                  if (id === null) return { ok: false, why: null };
                  const result = await captureFor(
                    baseUrl,
                    token,
                    listing.id,
                    'photo',
                    id,
                    askToSpend,
                  );
                  /*
                    Declining is not a failure, and it does not fall through to
                    "No signal" — which would blame the network for a decision
                    somebody made deliberately, and give them a reason to
                    disbelieve that message the next time it is true.
                  */
                  if ('declined' in result) return { ok: false, why: t('capture_cancelled') };
                  return result.ok ? { ok: true, why: null } : { ok: false, why: result.why };
                },
                t('capture_accepted'),
              )
            }
          />
          <Button
            label={t('record_a_walkthrough')}
            quiet
            disabled={busy === 'video'}
            onPress={() =>
              run(
                'video',
                async () => {
                  const id = await device();
                  if (id === null) return { ok: false, why: null };
                  const result = await captureFor(
                    baseUrl,
                    token,
                    listing.id,
                    'video',
                    id,
                    askToSpend,
                  );
                  /*
                    Declining is not a failure, and it does not fall through to
                    "No signal" — which would blame the network for a decision
                    somebody made deliberately, and give them a reason to
                    disbelieve that message the next time it is true.
                  */
                  if ('declined' in result) return { ok: false, why: t('capture_cancelled') };
                  return result.ok ? { ok: true, why: null } : { ok: false, why: result.why };
                },
                t('capture_accepted'),
              )
            }
          />
        </View>
      )}

      {/*
        Asking a landlord, without a "which property" field.

        It always took a property id. Floating at account level it had to ask
        for one; here the screen knows, and the agent types one number instead
        of two things.
      */}
      {unmet.has('landlord_authority') && (
        <View style={styles.section}>
          <Text variant="title">{t('ask_a_landlord')}</Text>
          <Text variant="body" tone="secondary" style={styles.row}>
            {t('ask_a_landlord_help')}
          </Text>
          <Field
            label={t('landlord_number')}
            value={landlordPhone}
            onChange={setLandlordPhone}
            keyboard="phone-pad"
          />
          <Button
            label={t('ask_them')}
            disabled={busy === 'ask' || landlordPhone.trim().length < 7}
            onPress={() =>
              run(
                'ask',
                async () => {
                  const result = await attempt(() =>
                    client({ baseUrl, agentToken: token }).agent.askLandlord(
                      listing.propertyId,
                      landlordPhone.trim(),
                    ),
                  );
                  if (result.ok) setLandlordPhone('');
                  return result.ok
                    ? { ok: true, why: null }
                    : {
                        ok: false,
                        why: result.failure.kind === 'refused' ? result.failure.detail : null,
                      };
                },
                t('text_queued'),
              )
            }
          />
        </View>
      )}

      {/*
        What it costs, asked only while it is unanswered.

        Five fields is a lot to put on a screen, which is why they are not on
        it once they have been answered. The alternative — a permanently open
        cost form under every property — is the thing that made the old account
        screen unreadable.
      */}
      {unmet.has('costs_stated') && (
        <View style={styles.section}>
          <Text variant="title">{t('costs_heading')}</Text>
          <Text variant="body" tone="secondary" style={styles.row}>
            {t('costs_help')}
          </Text>
          <Field
            label={t('costs_rent')}
            value={money.rent}
            onChange={(rent) => setMoney((m) => ({ ...m, rent }))}
            keyboard="number-pad"
          />
          <Field
            label={t('costs_agency_fee')}
            value={money.agency}
            onChange={(agency) => setMoney((m) => ({ ...m, agency }))}
            keyboard="number-pad"
          />
          <Field
            label={t('costs_legal_fee')}
            value={money.legal}
            onChange={(legal) => setMoney((m) => ({ ...m, legal }))}
            keyboard="number-pad"
          />
          <Field
            label={t('costs_caution_deposit')}
            value={money.deposit}
            onChange={(deposit) => setMoney((m) => ({ ...m, deposit }))}
            keyboard="number-pad"
          />
          <Field
            label={t('costs_service_charge')}
            value={money.service}
            onChange={(service) => setMoney((m) => ({ ...m, service }))}
            keyboard="number-pad"
          />
          {/*
            Everything but rent may be left blank, and blank means zero here.

            That is not the server's rule — the API refuses a missing field,
            deliberately, so that a client bug cannot invent a "nothing to pay"
            claim on an agent's behalf. But a person who left the service
            charge box empty on a form headed "what it costs" has answered it,
            and this screen is where that judgement belongs.
          */}
          <Button
            label={t('costs_save')}
            disabled={busy === 'costs' || kobo(money.rent) <= 0}
            onPress={() =>
              run(
                'costs',
                async () => {
                  const result = await attempt(() =>
                    client({ baseUrl, agentToken: token }).agent.stateCosts(listing.id, {
                      annualRentKobo: kobo(money.rent),
                      agencyFeeKobo: kobo(money.agency),
                      legalFeeKobo: kobo(money.legal),
                      cautionDepositKobo: kobo(money.deposit),
                      serviceChargeKobo: kobo(money.service),
                    }),
                  );
                  return result.ok
                    ? { ok: true, why: null }
                    : {
                        ok: false,
                        why: result.failure.kind === 'refused' ? result.failure.detail : null,
                      };
                },
                t('costs_saved'),
              )
            }
          />
        </View>
      )}

      {/*
        Enquiries, only when there are some.

        An empty "nobody has asked" panel under every property would be a row
        of furniture reporting that nothing happened.
      */}
      {asking.length > 0 && (
        <View style={styles.section}>
          <Text variant="title">{t('enquiries')}</Text>
          {asking.map((conversation) => (
            <PropertyRow
              key={conversation.id}
              title={conversation.otherPartyName}
              address={lastWord(conversation)}
              status={
                conversation.exchange === 'exchanged'
                  ? t('number_shared')
                  : t('reply_to_them')
              }
              tone={conversation.exchange === 'exchanged' ? 'clear' : 'quiet'}
              onPress={() => onOpenEnquiry(conversation.id)}
            />
          ))}
        </View>
      )}

      <View style={styles.section}>
        {listing.publishedAt === null ? (
          <>
            <Text variant="body" tone="secondary">
              {t('draft_private')}
            </Text>
            <Button
              label={t('publish_listing')}
              disabled={
                busy === 'publish' ||
                unmet.has('agent_identity') ||
                unmet.has('landlord_authority')
              }
              onPress={() =>
                run(
                  'publish',
                  async () => {
                    const result = await attempt(() =>
                      client({ baseUrl, agentToken: token }).agent.publish(listing.id),
                    );
                    return result.ok
                      ? { ok: true, why: null }
                      : {
                          ok: false,
                          why: result.failure.kind === 'refused' ? result.failure.detail : null,
                        };
                  },
                  t('published_now'),
                )
              }
            />
          </>
        ) : (
          <>
            <Text variant="body" style={{ color: colours.clear }}>
              {t('published_now')}
            </Text>
            <Text variant="label" tone="secondary" style={styles.row}>
              {t('confirm_every_fortnight')}
            </Text>
            <Button
              label={t('still_available')}
              quiet
              disabled={busy === 'confirm'}
              onPress={() =>
                run(
                  'confirm',
                  async () => {
                    const result = await attempt(() =>
                      client({
                        baseUrl,
                        agentToken: token,
                      }).agent.confirmStillAvailable(listing.id),
                    );
                    return result.ok
                      ? { ok: true, why: null }
                      : {
                          ok: false,
                          why: result.failure.kind === 'refused' ? result.failure.detail : null,
                        };
                  },
                  t('confirmed_today'),
                )
              }
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

/** The last thing said, so a row is worth reading before it is opened. */
function lastWord(conversation: Conversation): string {
  return conversation.messages.at(-1)?.body ?? '';
}

/**
 * Naira typed into a field, as kobo.
 *
 * Separators and a naira sign are stripped rather than refused — somebody who
 * typed "₦800,000" has said what they mean, and rejecting them for punctuation
 * is a form that argues with people. A blank is zero; anything that is not a
 * whole number of naira is zero too, which the rent check then catches.
 */
function kobo(typed: string): number {
  const digits = typed.replace(/[^0-9]/g, '');
  if (digits === '') return 0;
  const naira = Number(digits);
  return Number.isSafeInteger(naira) ? naira * 100 : 0;
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.lg, paddingBottom: space.xl, flexGrow: 1 },
  title: { marginTop: space.md },
  row: { marginTop: space.sm },
  card: { marginTop: space.lg },
  section: { marginTop: space.xl },
});
