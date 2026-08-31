import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type Listing } from '@keys/api';
import { VERIFIED_CONDITIONS, conditionPhrase, conditionStepPhrase } from '@keys/domain';

import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Glass } from '../components/Glass';
import { Progress } from '../components/Progress';
import { Text } from '../components/Text';
import KeysCapture from '../native/NativeKeysCapture';
import { captureFor, deviceIdFor } from '../state/capture';
import { space } from '../design/tokens';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';

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
}: {
  baseUrl: string;
  token: string;
  listing: Listing;
  onBack: () => void;
  onChanged: (said: string) => void;
}) {
  const { t } = useLanguage();
  const colours = useColours();

  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [landlordPhone, setLandlordPhone] = useState('');

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
    setProblem(detail ?? t('no_signal_saved_here'));
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
                  const result = await captureFor(baseUrl, token, listing.id, 'photo', id);
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
                  const result = await captureFor(baseUrl, token, listing.id, 'video', id);
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

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.lg, paddingBottom: space.xl, flexGrow: 1 },
  title: { marginTop: space.md },
  row: { marginTop: space.sm },
  card: { marginTop: space.lg },
  section: { marginTop: space.xl },
});
