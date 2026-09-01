import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type Conversation, type Inspection } from '@keys/api';
import { naira } from '@keys/domain';

import { Button } from '../components/Button';
import { Choice } from '../components/Choice';
import { Field } from '../components/Field';
import { Glass } from '../components/Glass';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { radius, space } from '../design/tokens';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';
import { useSession } from '../state/session';
import { useTenant } from '../state/tenant';

/**
 * One conversation, and everything you can do inside it.
 *
 * Arranging a viewing lives here rather than in a tab of its own, for the
 * reason the agent's account screen taught: an action that has to ask *which
 * one* is an action on the wrong screen. A separate Inspections tab would open
 * with a "which conversation" field; here the screen already knows.
 *
 * The three things you can do appear in the order they become possible —
 * say something, swap numbers, ask to see it — and the fourth, saying what
 * happened, only exists after somebody agreed to show you round.
 *
 * ## One screen for both sides
 *
 * A tenant and an agent see the same thread, the same contact panel and the
 * same message box; they differ only in the viewing panel, where one asks and
 * says what happened and the other agrees and names a fee. Two files would have
 * been two copies of the part that must never disagree — which is the exact
 * duplication that put a ticked "photographed at the property" in front of one
 * person and nothing in front of another, and cost this codebase `assessListing`
 * to undo.
 */
export function ConversationScreen({
  baseUrl,
  id,
  as,
  onBack,
}: {
  baseUrl: string;
  id: string;
  as: 'tenant' | 'agent';
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const { token: tenantToken } = useTenant();
  const { token: agentToken } = useSession();
  const colours = useColours();

  const [typed, setTyped] = useState('');
  const [contact, setContact] = useState('');
  const [paid, setPaid] = useState('');
  const [fee, setFee] = useState('');
  const [outcome, setOutcome] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const token = as === 'tenant' ? tenantToken : agentToken;
  const api = () =>
    client({ baseUrl, ...(as === 'tenant' ? { tenantToken: token ?? '' } : { agentToken: token ?? '' }) });

  /*
    The same four operations, addressed to whichever door this side knocks on.

    Named once here rather than branched at each call site: a screen that wrote
    `as === 'tenant' ? … : …` in six places would eventually get one of them
    wrong, and the wrong one would send an agent's message on a tenant's token.
  */
  const mine = {
    conversation: () =>
      as === 'tenant' ? api().tenant.conversation(id) : api().agent.conversation(id),
    say: (body: string) =>
      as === 'tenant' ? api().tenant.say(id, body) : api().agent.reply(id, body),
    offerContact: (contact: string) =>
      as === 'tenant'
        ? api().tenant.offerContact(id, contact)
        : api().agent.offerContact(id, contact),
    withdrawContact: () =>
      as === 'tenant' ? api().tenant.withdrawContact(id) : api().agent.withdrawContact(id),
    inspections: () =>
      as === 'tenant' ? api().tenant.inspections() : api().agent.inspectionRequests(),
  };

  const { query, refresh } = useQuery<{
    conversation: Conversation;
    inspections: readonly Inspection[];
  }>(async () => {
    const conversation = await attempt(() => mine.conversation());
    if (!conversation.ok) return conversation;
    const inspections = await attempt(() => mine.inspections());
    if (!inspections.ok) return inspections;
    return {
      ok: true as const,
      value: {
        conversation: conversation.value,
        inspections: inspections.value.filter(
          (i) => i.listingId === conversation.value.listingId,
        ),
      },
    };
  }, [baseUrl, id, token, as]);

  const loaded = query.state === 'ready' ? query.value : null;

  function run(what: string, work: () => Promise<{ ok: boolean; why: string | null }>) {
    setBusy(what);
    setProblem(null);
    void work()
      .then((result) => {
        if (result.ok) refresh();
        else setProblem(result.why ?? t('no_signal_nothing_sent'));
      })
      .catch((error: unknown) =>
        setProblem(error instanceof Error ? error.message : t('no_signal_nothing_sent')),
      )
      .finally(() => setBusy(null));
  }

  const call = async (work: () => Promise<unknown>) => {
    const result = await attempt(work);
    return result.ok
      ? { ok: true, why: null }
      : { ok: false, why: result.failure.kind === 'refused' ? result.failure.detail : null };
  };

  const conversation = loaded?.conversation ?? null;
  // The most recent one, because a listing can be visited more than once and
  // the one being acted on is always the latest.
  const visit = loaded?.inspections.at(-1) ?? null;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Button label={t('go_back')} onPress={onBack} quiet />
      <Unready query={query} onRetry={refresh} />

      {conversation !== null && (
        <>
          <Text variant="headline" style={styles.title}>
            {conversation.listingTitle}
          </Text>
          <Text variant="body" tone="secondary">
            {conversation.otherPartyName}
          </Text>

          {problem !== null && (
            <Text variant="body" tone="alarm" accessibilityRole="alert" style={styles.row}>
              {problem}
            </Text>
          )}

          <View style={styles.thread}>
            {conversation.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.bubble,
                  message.speaker === as ? styles.mine : styles.theirs,
                  {
                    backgroundColor:
                      message.speaker === 'keys'
                        ? colours.accentWash
                        : message.speaker === as
                          ? colours.accentWash
                          : colours.surfaceDim,
                  },
                ]}
              >
                <Text variant="body">{message.body}</Text>
              </View>
            ))}
          </View>

          <Field label={t('say_something')} value={typed} onChange={setTyped} lines={3} />
          <Button
            label={t('send')}
            disabled={busy === 'say' || typed.trim().length === 0}
            onPress={() =>
              run('say', async () => {
                const done = await call(() => mine.say(typed.trim()));
                if (done.ok) setTyped('');
                return done;
              })
            }
          />

          {/*
            The number, and where it stands.

            Three states with three different next actions, so three different
            panels rather than one with conditions inside it. The one that
            matters is the middle: you have offered and they have not, which is
            the only moment the "take it back" button means anything.
          */}
          <Glass
            style={styles.card}
            {...(conversation.exchange === 'exchanged'
              ? { tone: { line: colours.clear, wash: colours.clearWash } }
              : {})}
          >
            {conversation.exchange === 'exchanged' ? (
              <>
                <Text variant="label" tone="secondary">
                  {t('their_number')}
                </Text>
                <Text variant="title">{conversation.theirContact}</Text>
              </>
            ) : conversation.exchange === `${as}_offered` ? (
              <>
                <Text variant="body">{t('exchange_you_offered')}</Text>
                <Button
                  label={t('take_my_number_back')}
                  quiet
                  disabled={busy === 'unoffer'}
                  onPress={() =>
                    run('unoffer', () => call(() => mine.withdrawContact()))
                  }
                />
              </>
            ) : (
              <>
                <Text variant="body" tone="secondary">
                  {t('share_my_number_help')}
                </Text>
                <Field
                  label={t('your_number')}
                  value={contact}
                  onChange={setContact}
                  keyboard="phone-pad"
                />
                <Button
                  label={t('share_my_number')}
                  disabled={busy === 'offer' || contact.trim().length < 7}
                  onPress={() =>
                    run('offer', () => call(() => mine.offerContact(contact.trim())))
                  }
                />
              </>
            )}
          </Glass>

          {/*
            Seeing the place.

            Nothing at all for an agent with no request — an empty "no viewings
            requested" panel on every conversation would be a row of furniture
            saying nothing happened.
          */}
          {visit === null ? (
            as === 'tenant' ? (
              <Button
                label={t('ask_to_see_it')}
                disabled={busy === 'visit'}
                onPress={() => run('visit', () => call(() => api().tenant.askToVisit(id)))}
              />
            ) : null
          ) : (
            <Glass style={styles.card}>
              {visit.state === 'requested' &&
                (as === 'tenant' ? (
                  <Text variant="body" tone="secondary">
                    {t('waiting_on_the_agent')}
                  </Text>
                ) : (
                  <>
                    <Text variant="title">{t('they_want_to_see_it')}</Text>
                    {/*
                      The fee is asked for here, before anybody sets off, and
                      zero is a real answer rather than a blank.

                      That is the whole mechanism: a figure named in advance
                      turns "they asked for more at the door" from an argument
                      about what was said into a claim with a number attached.
                    */}
                    <Field
                      label={t('what_will_you_charge')}
                      value={fee}
                      onChange={setFee}
                      keyboard="number-pad"
                    />
                    <Button
                      label={t('agree_to_show')}
                      disabled={busy === 'answer'}
                      onPress={() =>
                        run('answer', () =>
                          call(() =>
                            api().agent.answerInspection(visit.id, true, kobo(fee)),
                          ),
                        )
                      }
                    />
                    <Button
                      label={t('decline')}
                      quiet
                      disabled={busy === 'answer'}
                      onPress={() =>
                        run('answer', () =>
                          call(() => api().agent.answerInspection(visit.id, false, 0)),
                        )
                      }
                    />
                  </>
                ))}
              {visit.state === 'declined' && (
                <Text variant="body" tone="secondary">
                  {t('they_declined')}
                </Text>
              )}
              {visit.state === 'agreed' && (
                <>
                  <Text variant="title">{t('they_agreed_to_show_it')}</Text>
                  {/*
                    The fee, said before anybody sets off.

                    That is the whole mechanism: a figure stated in advance
                    turns "they asked for more at the door" from an argument
                    about what was said into a broken claim.
                  */}
                  <Text variant="body" tone="secondary" style={styles.row}>
                    {visit.feeKobo === 0
                      ? t('inspection_free')
                      : `${t('inspection_fee_is')} ${naira(visit.feeKobo)}`}
                  </Text>

                  {/* Only the person who went can say what happened. */}
                  {as === 'tenant' && (
                    <>
                  <Text variant="label" tone="secondary" style={styles.row}>
                    {t('what_happened_when_you_went')}
                  </Text>
                  <Choice
                    options={OUTCOMES.map((id) => ({ id, label: t(`outcome_${id}`) }))}
                    chosen={outcome}
                    onChoose={setOutcome}
                  />
                  {/*
                    The amount is asked for only when the complaint is about
                    money, because a field nobody needs is a field everybody
                    reads.
                  */}
                  {outcome === 'asked_for_more_money' && (
                    <Field
                      label={t('how_much_were_you_asked')}
                      value={paid}
                      onChange={setPaid}
                      keyboard="number-pad"
                    />
                  )}
                  <Button
                    label={t('tell_us')}
                    disabled={busy === 'outcome' || outcome === null}
                    onPress={() =>
                      run('outcome', () =>
                        call(() =>
                          api().tenant.recordOutcome(
                            visit.id,
                            outcome!,
                            outcome === 'asked_for_more_money'
                              ? Number(paid.replace(/[^0-9]/g, '') || '0') * 100
                              : undefined,
                          ),
                        ),
                      )
                    }
                  />
                    </>
                  )}
                </>
              )}
              {visit.state === 'done' && (
                <Text variant="body" tone="secondary">
                  {t('outcome_recorded')}
                </Text>
              )}
            </Glass>
          )}
        </>
      )}
    </ScrollView>
  );
}

/**
 * Naira typed into a field, as kobo.
 *
 * Nobody types kobo. Separators and a naira sign are stripped rather than
 * refused — somebody who typed "₦5,000" has said what they mean, and arguing
 * with them about punctuation is a form nobody finishes.
 */
function kobo(typed: string): number {
  const digits = typed.replace(/[^0-9]/g, '');
  if (digits === '') return 0;
  const naira = Number(digits);
  return Number.isSafeInteger(naira) ? naira * 100 : 0;
}

const OUTCOMES = [
  'did_not_exist',
  'agent_did_not_show',
  'asked_for_more_money',
  'as_described',
  'not_for_me',
] as const;

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md },
  title: { marginTop: space.sm },
  row: { marginTop: space.xs },
  thread: { gap: space.sm, marginVertical: space.sm },
  bubble: { padding: space.md, borderRadius: radius.lg, maxWidth: '86%' },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  card: { gap: space.sm },
});
