import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type SavedSearchView } from '@keys/api';
import { naira } from '@keys/domain';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Empty } from '../components/Empty';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';

/**
 * Saved searches (ADR-0020): each remembers what it saw, and opening this
 * screen is what moves *since last time* forward — the server compares and
 * then keeps the answer it just gave. No push, no badge count: a tenant
 * reads it when they choose.
 */
export function SavedSearchesScreen({ baseUrl, token, onOpen, onBack }: { baseUrl: string; token: string; onOpen: (listingId: string) => void; onBack: () => void }) {
  const { t } = useLanguage();
  const api = () => client({ baseUrl, tenantToken: token }).reach;
  const { query, refresh } = useQuery<SavedSearchView[]>(() => attempt(() => api().savedSearches()), [baseUrl, token]);
  const list = query.state === 'ready' ? query.value : null;

  const describe = (s: SavedSearchView) =>
    [s.q || null, s.city, s.withinKm !== null ? `${t('within_km')} ${s.withinKm} km` : null].filter((x): x is string => x !== null && x !== '').join(' · ');

  const moveLine = (m: SavedSearchView['moves'][number]) => {
    switch (m.kind) {
      case 'price':
        return `${t('move_price')}: ${naira(m.fromKobo ?? 0)} → ${naira(m.toKobo ?? 0)}`;
      case 'reappeared':
        return t('move_reappeared');
      case 'gone':
        return t('move_gone');
      default:
        return t('move_new');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenHeader title={t('saved_searches')} onBack={onBack} />
      <Text variant="body" tone="secondary">
        {t('saved_searches_lede')}
      </Text>
      <Unready query={query} onRetry={refresh} />
      {list !== null && list.length === 0 && <Empty icon="search" title={t('saved_searches')} detail={t('saved_searches_none')} />}
      {list?.map((s) => (
        <Card key={s.id} overline={`${s.matching} ${t('matching_now')}`} icon="search">
          <Text variant="title">{describe(s) || t('find_a_place')}</Text>
          {s.moves.length === 0 ? (
            <Text variant="body" tone="secondary">
              {t('nothing_moved')}
            </Text>
          ) : (
            <View style={styles.moves}>
              {s.moves.map((m, i) => (
                <Button key={`${m.kind}-${m.id}-${i}`} label={moveLine(m)} quiet onPress={() => (m.kind === 'gone' ? undefined : onOpen(m.id))} />
              ))}
            </View>
          )}
          <Button
            label={t('forget_search')}
            quiet
            onPress={() => {
              void attempt(() => api().forgetSearch(s.id)).then(refresh);
            }}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.xl, flexGrow: 1, gap: space.md },
  moves: { gap: space.xs },
});
