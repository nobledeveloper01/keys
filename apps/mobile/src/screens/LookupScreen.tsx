import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';

import { attempt, client, type AgentProfile, type Lookup } from '@keys/api';
import { categoryPhrase, tierPhrase, type ReportCategory } from '@keys/domain';

import { Brand } from '../components/Brand';
import { Counter } from '../components/Counter';
import { Glass } from '../components/Glass';
import { Press } from '../components/Press';
import { SearchField } from '../components/SearchField';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';
import { normalise } from '../state/phone';
import { useQuery } from '../state/server';

/**
 * The wedge, on a phone.
 *
 * The same job the web page does, for somebody who has the app: check a number
 * before paying anybody anything. It asks for no account and it is the first
 * screen, because a product whose useful thing is three taps behind a sign-up
 * is a product nobody reaches the useful thing in.
 */
export function LookupScreen({
  baseUrl,
  onVerdict,
}: {
  baseUrl: string;
  /** Reported up so the shell can colour the light behind the whole screen. */
  onVerdict?: (tone: string | undefined) => void;
}) {
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');

  const phone = useMemo(() => (typed.trim() ? normalise(typed) : null), [typed]);

  const colours = useColours();

  const { query, refresh } = useQuery<Lookup | null>(
    () =>
      phone
        ? attempt(() => client({ baseUrl }).lookup(phone))
        : Promise.resolve({ ok: true as const, value: null }),
    [phone, baseUrl],
  );

  /*
    The other half of the answer, asked separately and allowed to fail.

    The registry says what has been held against a number. This says what has
    been confirmed about whoever trades under it, and a screen showing only the
    first tells a tenant what to fear and nothing about what to trust.

    Separate query on purpose: a 404 here is the ordinary case — most numbers
    belong to nobody on Keys — and folding it into the lookup would mean an
    ordinary absence could take the warning down with it. The warning is the
    part that must always render.
  */
  const { query: agentQuery } = useQuery<AgentProfile | null>(
    () =>
      phone
        ? attempt(() => client({ baseUrl }).agentByPhone(phone)).then((result) =>
            result.ok
              ? result
              : result.failure.kind === 'refused' && result.failure.status === 404
                ? ({ ok: true as const, value: null })
                : result,
          )
        : Promise.resolve({ ok: true as const, value: null }),
    [phone, baseUrl],
  );
  const agent = agentQuery.state === 'ready' ? agentQuery.value : null;

  /*
    Told once, when the answer changes.

    Deliberately not on every render: `onVerdict` sets state in the shell, and
    calling it during render would loop. An effect keyed on the outcome runs
    after commit, once per real change.
  */
  const answer = query.state === 'ready' ? query.value : null;
  useEffect(() => {
    if (phone === null || answer === null) {
      onVerdict?.(undefined);
      return;
    }
    onVerdict?.(answer.upheldReports === 0 ? colours.clear : colours.alarm);
  }, [phone, answer, colours.clear, colours.alarm, onVerdict]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {/*
        Brand, then the question, then the lede — the same order as the web.

        This screen used to open with a header bar carrying the same words as
        the empty state below it, so `Check a number` appeared twice on one
        screen with nothing between them explaining what it would be checked
        against. Somebody who arrived here from a link a friend sent had no way
        to tell whose answer they were about to read.
      */}
      <Brand />

      <Text variant="headline" style={styles.title}>
        {t('check_a_number')}
      </Text>
      <Text variant="body" tone="secondary" style={styles.lede}>
        {t('lede_registry')}
      </Text>

      <SearchField
        value={typed}
        onChange={setTyped}
        placeholder={t('check_a_number_hint')}
        accessibilityLabel={t('check_a_number')}
      />
      <Text variant="label" tone="secondary">
        {t('check_a_number_help')}
      </Text>

      {typed.trim() !== '' && phone === null && (
        <Glass style={styles.card}>
          <Text variant="body">{t('not_a_nigerian_number')}</Text>
        </Glass>
      )}

      {/* Loading, unreachable and refused, before any content is rendered.
          An unreachable lookup rendered as zero reports is the one mistake
          this screen must never make. */}
      {phone !== null && <Unready query={query} onRetry={refresh} />}

      {phone !== null && answer !== null && <Answer answer={answer} phone={phone} />}

      {/*
        Below the verdict, never instead of it.

        An agent Keys has checked can still have upheld reports against them,
        and the order on the screen has to say which of the two matters more.
        A confirmation panel above a warning would read as a rebuttal of it.
      */}
      {phone !== null && answer !== null && agent !== null && (
        <Verified agent={agent} reported={answer.upheldReports > 0} />
      )}

      {/*
        No empty state before the first search.

        There was one, and it repeated the screen's own title back at the
        reader under a large icon — a placeholder occupying the space the
        answer will use. The lede above already says what to do; saying it
        again in the middle of the screen is furniture.
      */}

      <View style={styles.claims}>
        <Text variant="label" tone="secondary">
          {t('claims_note')}
        </Text>
      </View>
      </ScrollView>
    </View>
  );
}

/**
 * Where a shared link points.
 *
 * The public site, not the API — what is being sent is something a person opens,
 * and it has to work for somebody who has never installed this.
 */
const SHARE_ORIGIN = 'https://keys.ng';

function Answer({ answer, phone }: { answer: Lookup; phone: string }) {
  const { t } = useLanguage();
  const colours = useColours();
  const clean = answer.upheldReports === 0;

  return (
    <Glass
      elevated
      tone={
        clean
          ? { line: colours.clear, wash: colours.clearWash }
          : { line: colours.alarm, wash: colours.alarmWash }
      }
      style={styles.card}
    >
      <Counter
        to={answer.upheldReports}
        style={{ color: clean ? colours.clear : colours.alarm }}
      />
      <Text variant="title">
        {clean
          ? t('nothing_upheld')
          : answer.upheldReports === 1
            ? t('one_upheld_report')
            : `${answer.upheldReports} ${t('upheld_reports')}`}
      </Text>
      <Text variant="body" tone="secondary">
        {clean ? t('not_a_clean_bill') : t('reviewed_by_a_person')}
      </Text>

      {/*
        What it was for, not just how many.

        The web surface listed the categories and this screen did not, so the
        app told somebody a number had one upheld report against it and left
        them to guess whether that was a fake listing or a no-show. Same
        registry, same answer, both places.
      */}
      {!clean &&
        answer.categories.map((category: string) => (
          <Text key={category} variant="body" style={styles.category}>
            {`·  ${t(categoryPhrase(category as ReportCategory))}`}
          </Text>
        ))}
      {/*
        Sending the answer on is the point, not a nicety.

        The moment this product is used is a group chat where somebody asks
        whether an agent is known. What helps is the answer arriving in that
        chat — the link carries a preview card showing the verdict, so the
        people in it get it without anybody tapping through on a bad connection.
      */}
      <Press
        onPress={() => {
          void Share.share({
            message: `${t(clean ? 'nothing_upheld' : 'this_number_was_reported')}\n${SHARE_ORIGIN}/?phone=${phone}`,
          });
        }}
        accessibilityLabel={t('share_this_answer')}
        feedback="opacity"
        style={styles.share}
      >
        <Text variant="label" tone="accent">
          {t('share_this_answer')}
        </Text>
      </Press>
    </Glass>
  );
}

/**
 * What Keys has confirmed about the person behind a number.
 *
 * Deliberately not a badge. A badge is a claim nobody can audit and a shape
 * anybody can screenshot; what this shows is the sentence naming *what was
 * checked*, so a tenant reading it could go and check the same thing. The tier
 * word itself never appears on the screen.
 */
function Verified({ agent, reported }: { agent: AgentProfile; reported: boolean }) {
  const { t } = useLanguage();

  return (
    /*
      Neutral, not green — and this was green until it was seen on a screen.

      Two status-coloured cards stacked read as two verdicts, and the second one
      being the same green as a clean result made the confirmation look like a
      second all-clear. Worse the other way round: a green panel under a red
      one is a rebuttal in colour, which is the exact thing the ordering here
      exists to prevent. The status colour belongs to the warning. This is the
      quieter thing underneath it.
    */
    <Glass style={styles.card}>
      <Text variant="label" tone="secondary">
        {t('verified_agent')}
      </Text>
      <Text variant="title">{agent.displayName}</Text>

      <Text variant="label" tone="secondary" style={styles.checkedLabel}>
        {t('what_was_checked')}
      </Text>
      <Text variant="body">{t(tierPhrase(agent.tier))}</Text>

      {/* One is a different sentence — see the agent screen for why. */}
      {agent.confirmedProperties === 1 && (
        <Text variant="label" tone="secondary" style={styles.confirmed}>
          {t('one_property_confirmed')}
        </Text>
      )}
      {agent.confirmedProperties > 1 && (
        <Text variant="label" tone="secondary" style={styles.confirmed}>
          {`${agent.confirmedProperties} ${t('properties_confirmed')}`}
        </Text>
      )}

      {/*
        Said out loud when there is a warning above.

        Ordering alone was doing this work — the red card is first and larger —
        and ordering is not enough for somebody who scrolls to the name they
        recognise. Being checked by Keys is a fact about a document and a
        landlord's phone; it is not a rebuttal of a report a person upheld, and
        the panel has to say so where it could be mistaken for one.
      */}
      {reported && (
        <Text variant="body" style={styles.confirmed}>
          {t('checked_is_not_a_defence')}
        </Text>
      )}
    </Glass>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  checkedLabel: { marginTop: space.md },
  confirmed: { marginTop: space.sm },
  page: { padding: space.lg, paddingTop: space.xl, gap: space.sm, flexGrow: 1 },
  title: { marginTop: space.lg },
  lede: { marginBottom: space.md },
  card: { marginTop: space.md },
  category: { marginTop: space.xs },
  share: { marginTop: space.md, alignSelf: 'flex-start' },
  /* Pushed to the bottom of the scroll, the way the web's footer is. */
  claims: { marginTop: 'auto', paddingTop: space.xl },
});
