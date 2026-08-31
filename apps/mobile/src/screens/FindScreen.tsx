import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type SearchResult } from '@keys/api';

import { Chip } from '../components/Chip';
import { naira } from '@keys/domain';

import { PropertyRow } from '../components/PropertyRow';
import { SearchField } from '../components/SearchField';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';

/**
 * Finding somewhere to live.
 *
 * The tenant's other job, and the one the whole verification ladder exists to
 * serve — checking a number is what you do when somebody has already found
 * you.
 *
 * **Checked places only, by default.** Turning the filter off is a deliberate
 * act, and what comes back then still says, per listing, that it has not been
 * checked. A product whose default is "show me everything" has a badge nobody
 * has any reason to earn.
 */
export function FindScreen({
  baseUrl,
  onOpen,
}: {
  baseUrl: string;
  onOpen: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  const { query, refresh } = useQuery<SearchResult[]>(
    () => attempt(() => client({ baseUrl }).search({ q: typed.trim(), verifiedOnly })),
    [typed, verifiedOnly, baseUrl],
  );

  const results = query.state === 'ready' ? query.value : null;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text variant="headline">{t('find_a_place')}</Text>
      <Text variant="body" tone="secondary" style={styles.lede}>
        {t('find_a_place_lede')}
      </Text>

      <SearchField
        value={typed}
        onChange={setTyped}
        placeholder={t('search_places_hint')}
        accessibilityLabel={t('find_a_place')}
      />

      <View style={styles.filter}>
        <Chip
          label={t('verified_only')}
          selected={verifiedOnly}
          onPress={() => setVerifiedOnly((was) => !was)}
        />
      </View>

      {/* Loading, unreachable and refused, before any content. An empty list
          drawn over a failed request is the lie this app refuses everywhere. */}
      <Unready query={query} onRetry={refresh} />

      {results !== null &&
        (results.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="title">{t('nothing_found')}</Text>
            <Text variant="body" tone="secondary" style={styles.row}>
              {t('nothing_found_detail')}
            </Text>
          </View>
        ) : (
          <View style={styles.rows}>
            {results.map((result) => (
              <PropertyRow
                key={result.id}
                title={result.title}
                address={result.address}
                /*
                  What it costs to move in, then who is letting it.

                  Not the badge: everything in a filtered list is Verified, so
                  repeating it on every row says nothing. And not the rent —
                  two listings advertising ₦800,000 are not the same price, and
                  a list showing only rent hides the difference somebody opened
                  the app to compare.
                */
                status={
                  result.moveInKobo === null
                    ? result.agentName
                    : `${naira(result.moveInKobo)} · ${result.agentName}`
                }
                tone={result.verified ? 'clear' : 'quiet'}
                onPress={() => onOpen(result.id)}
              />
            ))}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.xl, flexGrow: 1 },
  lede: { marginTop: space.sm, marginBottom: space.md },
  filter: { marginTop: space.md, flexDirection: 'row' },
  rows: { marginTop: space.lg },
  empty: { marginTop: space.xl },
  row: { marginTop: space.sm },
});
