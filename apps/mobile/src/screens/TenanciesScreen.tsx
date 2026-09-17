import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type Tenancy } from '@keys/api';
import { naira } from '@keys/domain';

import { Empty } from '../components/Empty';
import { PropertyRow } from '../components/PropertyRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';

/**
 * The tenant's tenancies, or the letting side's (F-708 is the portfolio,
 * which is the other screen). A row is the property and where the agreement
 * stands; everything you can do lives on the tenancy's own screen.
 */
export function TenanciesScreen({
  baseUrl,
  tenantToken,
  agentToken,
  onOpen,
  onBack,
}: {
  baseUrl: string;
  tenantToken: string | null;
  agentToken: string | null;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const options = tenantToken ? { baseUrl, tenantToken } : { baseUrl, agentToken: agentToken ?? '' };
  const { query, refresh } = useQuery<Tenancy[]>(() => attempt(() => client(options).tenancy.mine()), [baseUrl, tenantToken, agentToken]);
  const tenancies = query.state === 'ready' ? query.value : null;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenHeader title={t('tenancy')} onBack={onBack} />
      <Text variant="body" tone="secondary" style={styles.lede}>
        {t('tenancies_lede')}
      </Text>
      <Unready query={query} onRetry={refresh} />
      {tenancies !== null &&
        (tenancies.length === 0 ? (
          <Empty icon="document" title={t('tenancy')} detail={t('tenancies_none')} />
        ) : (
          <View style={styles.rows}>
            {tenancies.map((tenancy) => (
              <PropertyRow
                key={tenancy.id}
                title={tenancy.agreement.propertyId}
                address={`${naira(tenancy.agreement.rentKobo)} · ${t(periodPhrase(tenancy.agreement.period))}`}
                status={tenancy.signed ? t('signed_by_both') : t('unsigned')}
                tone={tenancy.signed ? 'clear' : 'quiet'}
                onPress={() => onOpen(tenancy.id)}
              />
            ))}
          </View>
        ))}
    </ScrollView>
  );
}

export function periodPhrase(period: string): 'period_monthly' | 'period_quarterly' | 'period_yearly' {
  return period === 'yearly' ? 'period_yearly' : period === 'quarterly' ? 'period_quarterly' : 'period_monthly';
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.sm },
  lede: { marginBottom: space.sm },
  rows: { marginTop: space.sm },
});
