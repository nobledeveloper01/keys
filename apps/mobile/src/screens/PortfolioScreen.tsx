import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type PortfolioRow } from '@keys/api';
import { naira } from '@keys/domain';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Choice } from '../components/Choice';
import { Empty } from '../components/Empty';
import { Field } from '../components/Field';
import { PropertyRow } from '../components/PropertyRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';

/**
 * The letting side's view (F-708): one row per tenancy with the facts the
 * domain computes — what is due next, what is recorded against it, periods
 * short, tickets waiting — and never a total across them. Opening a tenancy
 * is here too, because the property it is on is one this account holds
 * authority over, and the server checks that rather than the screen.
 */
export function PortfolioScreen({ baseUrl, token, onOpen, onBack }: { baseUrl: string; token: string; onOpen: (id: string) => void; onBack: () => void }) {
  const { t } = useLanguage();
  const { query, refresh } = useQuery<PortfolioRow[]>(() => attempt(() => client({ baseUrl, agentToken: token }).tenancy.portfolio()), [baseUrl, token]);
  const rows = query.state === 'ready' ? query.value : null;
  const [opening, setOpening] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [rent, setRent] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [periods, setPeriods] = useState('1');
  const [deposit, setDeposit] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  async function open() {
    setProblem(null);
    const r = await attempt(() =>
      client({ baseUrl, agentToken: token }).tenancy.open({
        propertyId: propertyId.trim(),
        tenantId: tenantId.trim(),
        rentKobo: Math.round(Number(rent) * 100),
        period,
        periods: Number(periods),
        cautionDepositKobo: Math.round(Number(deposit || '0') * 100),
        startsOn: startsOn.trim(),
      }),
    );
    if (!r.ok) {
      setProblem(r.failure.kind === 'refused' ? r.failure.detail : t('no_signal_nothing_sent'));
      return;
    }
    setOpening(false);
    refresh();
    onOpen(r.value.id);
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenHeader title={t('portfolio')} onBack={onBack} />
      <Text variant="body" tone="secondary" style={styles.lede}>
        {t('portfolio_lede')}
      </Text>
      <Unready query={query} onRetry={refresh} />
      {rows !== null &&
        (rows.length === 0 ? (
          <Empty icon="document" title={t('portfolio')} detail={t('portfolio_none')} />
        ) : (
          <View style={styles.rows}>
            {rows.map((row) => (
              <PropertyRow
                key={row.tenancyId}
                title={row.propertyId}
                address={row.nextDueOn ? `${t('due_on')} ${row.nextDueOn} · ${naira(row.nextDueKobo)} · ${t('recorded_so_far')} ${naira(row.nextRecordedKobo)}` : t('ended')}
                status={row.disputed ? t('disputed') : row.openTickets > 0 ? `${t('tickets')} ${row.openTickets}` : row.signed ? t('signed_by_both') : t('unsigned')}
                tone={row.disputed || row.periodsShort > 0 ? 'caution' : row.signed ? 'clear' : 'quiet'}
                onPress={() => onOpen(row.tenancyId)}
              />
            ))}
          </View>
        ))}
      {opening ? (
        <Card overline={t('open_a_tenancy')}>
          <Field label={t('which_property')} value={propertyId} onChange={setPropertyId} />
          <Field label={t('tenant_account_id')} value={tenantId} onChange={setTenantId} autoComplete="off" />
          <Field label={t('rent_per_period')} value={rent} onChange={setRent} keyboard="number-pad" />
          <Text variant="label">{t('period')}</Text>
          <Choice
            options={[
              { id: 'monthly', label: t('period_monthly') },
              { id: 'quarterly', label: t('period_quarterly') },
              { id: 'yearly', label: t('period_yearly') },
            ]}
            chosen={period}
            onChoose={(id) => setPeriod(id as typeof period)}
          />
          <Field label={t('periods_count')} value={periods} onChange={setPeriods} keyboard="number-pad" />
          <Field label={t('caution_deposit')} value={deposit} onChange={setDeposit} keyboard="number-pad" />
          <Field label={t('starts_on')} value={startsOn} onChange={setStartsOn} placeholder="2026-10-01" />
          <Text variant="label" tone="secondary">
            {t('recorded_note')}
          </Text>
          {problem !== null && (
            <Text variant="body" tone="caution">
              {problem}
            </Text>
          )}
          <Button label={t('open_a_tenancy')} onPress={() => void open()} disabled={!propertyId.trim() || !tenantId.trim() || !rent || !startsOn} />
          <Button label={t('not_now')} onPress={() => setOpening(false)} quiet />
        </Card>
      ) : (
        <Button label={t('open_a_tenancy')} onPress={() => setOpening(true)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.sm },
  lede: { marginBottom: space.sm },
  rows: { marginTop: space.sm },
});
