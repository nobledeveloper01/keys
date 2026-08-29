import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type Lookup } from '@keys/api';

import { Card } from '../components/Card';
import { Empty } from '../components/Empty';
import { ScreenHeader } from '../components/ScreenHeader';
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
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <ScreenHeader title={t('check_a_number')} />

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

      {typed.trim() === '' && (
        <View style={styles.card}>
          <Empty
            icon="search"
            title={t('check_a_number')}
            detail={t('no_reports_yet_detail')}
          />
        </View>
      )}
    </ScrollView>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, gap: space.sm },
  card: { marginTop: space.md },
});
