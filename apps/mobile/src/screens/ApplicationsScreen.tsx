import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type ApplicationView } from '@keys/api';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Empty } from '../components/Empty';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';

type As = 'tenant' | 'agent';

/**
 * Applications, from either side (ADR-0015). The tenant sees every change
 * of status as it happened and may withdraw; the agent sees the applicant's
 * own words and moves the application along a closed list. No score, no
 * reason field on a decline — because a reason field becomes a
 * discrimination record.
 */
export function ApplicationsScreen({ baseUrl, token, as, onBack }: { baseUrl: string; token: string; as: As; onBack: () => void }) {
  const { t } = useLanguage();
  const api = () => client(as === 'tenant' ? { baseUrl, tenantToken: token } : { baseUrl, agentToken: token }).reach;
  const { query, refresh } = useQuery<ApplicationView[]>(() => attempt(() => (as === 'tenant' ? api().mine() : api().forAgent())), [baseUrl, token, as]);
  const list = query.state === 'ready' ? query.value : null;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenHeader title={t('applications')} onBack={onBack} />
      <Text variant="body" tone="secondary">
        {as === 'tenant' ? t('applications_lede') : t('agent_applications_lede')}
      </Text>
      <Unready query={query} onRetry={refresh} />
      {list !== null && list.length === 0 && <Empty icon="document" title={t('applications')} detail={t('applications_none')} />}
      {list?.map((a) => (
        <Card key={a.id} overline={a.listingTitle} icon="document">
          <Text variant="title">{t(statePhrase(a.state))}</Text>
          {as === 'agent' && (
            <>
              <Text variant="body">{`${a.profile.occupation} · ${a.profile.householdSize} · ${a.profile.moveInBy}`}</Text>
              {a.profile.note ? <Text variant="body">{a.profile.note}</Text> : null}
              <Text variant="label" tone="secondary">{`${t('on_keys_for_days')} ${a.standing.accountAgeDays} ${t('days')} · ${a.standing.tenanciesRecorded} ${t('tenancies_recorded')}`}</Text>
            </>
          )}
          <View style={styles.history}>
            {a.events.map((e, i) => (
              <Text key={i} variant="label" tone="secondary">{`${e.at.slice(0, 10)} · ${t(e.kind === 'submitted' ? 'app_submitted' : statePhrase(e.to ?? 'submitted'))}`}</Text>
            ))}
          </View>
          {as === 'agent' &&
            a.moves.map((to) => (
              <Button
                key={to}
                label={t(statePhrase(to))}
                quiet
                onPress={() => {
                  void attempt(() => api().move(a.id, to)).then(refresh);
                }}
              />
            ))}
          {as === 'tenant' && a.moves.includes('withdrawn') && (
            <Button
              label={t('withdraw_application')}
              quiet
              onPress={() => {
                void attempt(() => api().withdraw(a.id)).then(refresh);
              }}
            />
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

function statePhrase(s: string): 'app_submitted' | 'app_seen' | 'app_shortlisted' | 'app_offered' | 'app_declined' | 'app_withdrawn' {
  switch (s) {
    case 'seen':
      return 'app_seen';
    case 'shortlisted':
      return 'app_shortlisted';
    case 'offered':
      return 'app_offered';
    case 'declined':
      return 'app_declined';
    case 'withdrawn':
      return 'app_withdrawn';
    default:
      return 'app_submitted';
  }
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md },
  history: { gap: space.xs, marginTop: space.xs },
});
