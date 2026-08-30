import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type Lookup } from '@keys/api';
import { categoryPhrase, type ReportCategory } from '@keys/domain';

import { Brand } from '../components/Brand';
import { Card } from '../components/Card';
import { SearchField } from '../components/SearchField';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
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
export function LookupScreen({ baseUrl }: { baseUrl: string }) {
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');

  const phone = useMemo(() => (typed.trim() ? normalise(typed) : null), [typed]);

  const { query, refresh } = useQuery<Lookup | null>(
    () =>
      phone
        ? attempt(() => client({ baseUrl }).lookup(phone))
        : Promise.resolve({ ok: true as const, value: null }),
    [phone, baseUrl],
  );

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
        <Card emphasis="plain" style={styles.card}>
          <Text variant="body">{t('not_a_nigerian_number')}</Text>
        </Card>
      )}

      {/* Loading, unreachable and refused, before any content is rendered.
          An unreachable lookup rendered as zero reports is the one mistake
          this screen must never make. */}
      {phone !== null && <Unready query={query} onRetry={refresh} />}

      {phone !== null && query.state === 'ready' && query.value !== null && (
        <Answer answer={query.value} />
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

function Answer({ answer }: { answer: Lookup }) {
  const { t } = useLanguage();
  const clean = answer.upheldReports === 0;

  return (
    <Card emphasis={clean ? 'raised' : 'alarm'} style={styles.card}>
      <Text variant="display" tabular>
        {String(answer.upheldReports)}
      </Text>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { padding: space.lg, paddingTop: space.xl, gap: space.sm, flexGrow: 1 },
  title: { marginTop: space.lg },
  lede: { marginBottom: space.md },
  card: { marginTop: space.md },
  category: { marginTop: space.xs },
  /* Pushed to the bottom of the scroll, the way the web's footer is. */
  claims: { marginTop: 'auto', paddingTop: space.xl },
});
