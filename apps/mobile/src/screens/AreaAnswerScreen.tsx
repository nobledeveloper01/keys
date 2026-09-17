import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client } from '@keys/api';
import { MARKET_BANDS, POWER_BANDS, TRANSPORT_MODES, WATER_SOURCES, type Phrase } from '@keys/domain';

import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Choice } from '../components/Choice';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';

/**
 * Telling others about your area (ADR-0014): four questions with fixed
 * answers, for the area of a tenancy you hold. No free text. Your latest
 * answer is the one that counts, and your name is never on it.
 */
export function AreaAnswerScreen({ baseUrl, token, tenancyId, onDone, onBack }: { baseUrl: string; token: string; tenancyId: string; onDone: () => void; onBack: () => void }) {
  const { t } = useLanguage();
  const [power, setPower] = useState<string | null>(null);
  const [water, setWater] = useState<string | null>(null);
  const [transport, setTransport] = useState<string[]>([]);
  const [market, setMarket] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    setProblem(null);
    if (!power || !water || !market || transport.length === 0) return;
    const r = await attempt(() => client({ baseUrl, tenantToken: token }).reach.answer({ tenancyId, power, water, transport, market }));
    if (!r.ok) {
      setProblem(r.failure.kind === 'refused' ? r.failure.detail : t('no_signal_nothing_sent'));
      return;
    }
    setSent(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenHeader title={t('tell_about_area')} onBack={onBack} />
      <Text variant="body" tone="secondary">
        {t('tell_about_area_lede')}
      </Text>
      {sent ? (
        <>
          <Text variant="body" tone="clear">
            {t('answer_sent')}
          </Text>
          <Button label={t('go_back')} onPress={onDone} quiet />
        </>
      ) : (
        <>
          <Text variant="label">{t('q_power')}</Text>
          <Choice options={POWER_BANDS.map((k) => ({ id: k, label: t(`power_${k}` as Phrase) }))} chosen={power} onChoose={setPower} />
          <Text variant="label">{t('q_water')}</Text>
          <Choice options={WATER_SOURCES.map((k) => ({ id: k, label: t(`water_${k}` as Phrase) }))} chosen={water} onChoose={setWater} />
          <Text variant="label">{t('q_transport')}</Text>
          <View style={styles.chips}>
            {TRANSPORT_MODES.map((k) => (
              <Chip key={k} label={t(`transport_${k}` as Phrase)} selected={transport.includes(k)} onPress={() => setTransport(transport.includes(k) ? transport.filter((x) => x !== k) : [...transport, k])} />
            ))}
          </View>
          <Text variant="label">{t('q_market')}</Text>
          <Choice options={MARKET_BANDS.map((k) => ({ id: k, label: t(`market_${k}` as Phrase) }))} chosen={market} onChoose={setMarket} />
          {problem !== null && (
            <Text variant="body" tone="caution">
              {problem}
            </Text>
          )}
          <Button label={t('send_application')} onPress={() => void send()} disabled={!power || !water || !market || transport.length === 0} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
