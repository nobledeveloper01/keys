import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { attempt, client } from '@keys/api';

import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';

/**
 * Applying (ADR-0015): the tenant's own words in fixed fields, to one agent
 * for one listing. The screen says what Keys adds — two facts the tenant can
 * see on their own screen — and that it computes nothing about them.
 */
export function ApplyScreen({ baseUrl, token, listingId, onDone, onBack }: { baseUrl: string; token: string; listingId: string; onDone: () => void; onBack: () => void }) {
  const { t } = useLanguage();
  const [occupation, setOccupation] = useState('');
  const [household, setHousehold] = useState('1');
  const [moveInBy, setMoveInBy] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  async function send() {
    setProblem(null);
    const r = await attempt(() => client({ baseUrl, tenantToken: token }).reach.apply(listingId, { occupation: occupation.trim(), householdSize: Number(household), moveInBy: moveInBy.trim(), ...(note.trim() ? { note: note.trim() } : {}) }));
    if (!r.ok) {
      setProblem(r.failure.kind === 'refused' ? (r.failure.status === 403 ? t('already_applied') : r.failure.detail) : t('no_signal_nothing_sent'));
      return;
    }
    onDone();
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <ScreenHeader title={t('apply_for_this')} onBack={onBack} />
      <Text variant="body" tone="secondary">
        {t('apply_lede')}
      </Text>
      <Field label={t('occupation')} value={occupation} onChange={setOccupation} />
      <Field label={t('household_size')} value={household} onChange={setHousehold} keyboard="number-pad" />
      <Field label={t('move_in_by')} value={moveInBy} onChange={setMoveInBy} placeholder="2026-11-01" />
      <Field label={t('application_note')} value={note} onChange={setNote} lines={4} />
      {problem !== null && (
        <Text variant="body" tone="caution">
          {problem}
        </Text>
      )}
      <Button label={t('send_application')} onPress={() => void send()} disabled={!occupation.trim() || !moveInBy.trim() || !Number(household)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md },
});
