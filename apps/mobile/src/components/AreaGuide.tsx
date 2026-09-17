import { StyleSheet, View } from 'react-native';

import { attempt, client, type GuideView } from '@keys/api';
import { MARKET_BANDS, POWER_BANDS, TRANSPORT_MODES, WATER_SOURCES, areaById } from '@keys/domain';

import { Card } from './Card';
import { Text } from './Text';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import type { Phrase } from '@keys/domain';
import { useQuery } from '../state/server';

/**
 * What tenants in this area answered (ADR-0014): counts per answer, shown
 * only above the floor, never a verdict, never a person. Below the floor the
 * card says so rather than showing two people's opinion as a chart.
 */
export function AreaGuide({ baseUrl, areaId }: { baseUrl: string; areaId: string | null }) {
  const { t } = useLanguage();
  const area = areaId ? areaById(areaId) : null;
  const { query } = useQuery<GuideView | null>(() => (area ? attempt(() => client({ baseUrl }).guide(area.id)) : Promise.resolve({ ok: true as const, value: null })), [baseUrl, area?.id]);
  if (!area || query.state !== 'ready' || query.value === null) return null;
  const g = query.value;
  return (
    <Card overline={`${t('area_guide')} · ${g.areaName}`} icon="pin">
      <Text variant="body" tone="secondary">
        {t('area_guide_lede')}
      </Text>
      {g.answers < g.floor || !g.power || !g.water || !g.transport || !g.market ? (
        <Text variant="body" tone="secondary" style={styles.row}>
          {t('guide_not_enough')}
        </Text>
      ) : (
        <>
          <Text variant="label" tone="secondary" style={styles.row}>{`${g.answers} ${t('guide_answers')}`}</Text>
          <Question title={t('q_power')} counts={g.power} keys={POWER_BANDS} prefix="power_" total={g.answers} />
          <Question title={t('q_water')} counts={g.water} keys={WATER_SOURCES} prefix="water_" total={g.answers} />
          <Question title={t('q_transport')} counts={g.transport} keys={TRANSPORT_MODES} prefix="transport_" total={g.answers} />
          <Question title={t('q_market')} counts={g.market} keys={MARKET_BANDS} prefix="market_" total={g.answers} />
        </>
      )}
    </Card>
  );
}

function Question({ title, counts, keys, prefix, total }: { title: string; counts: Record<string, number>; keys: readonly string[]; prefix: string; total: number }) {
  const { t } = useLanguage();
  return (
    <View style={styles.row}>
      <Text variant="label">{title}</Text>
      {keys
        .filter((k) => (counts[k] ?? 0) > 0)
        .map((k) => (
          <Text key={k} variant="body" tone="secondary">{`${counts[k]} / ${total} · ${t(`${prefix}${k}` as Phrase)}`}</Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: space.sm, gap: space.xs },
});
