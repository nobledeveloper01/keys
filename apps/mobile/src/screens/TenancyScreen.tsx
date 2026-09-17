import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type Receipt, type Tenancy, type Ticket } from '@keys/api';
import { TICKET_CATEGORIES, naira, reminderOn } from '@keys/domain';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Choice } from '../components/Choice';
import { Field } from '../components/Field';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';
import { signAsLetting, signAsTenant } from '../state/signing';
import { periodPhrase } from './TenanciesScreen';

type Party = 'tenant' | 'letting';

/**
 * One tenancy, the same screen from both sides (ADR-0010): the agreement
 * and its signatures, the schedule with what was recorded against each
 * period, the receipts, the tickets. What each side may do is what the
 * server allows that side — the tenant disputes and raises, the letting
 * side records and moves — and the screen offers nothing else. No balance,
 * no total, no *pay* (ADR-0009).
 */
export function TenancyScreen({
  baseUrl,
  token,
  as,
  id,
  onOpenCondition,
  onTellArea,
  onBack,
}: {
  baseUrl: string;
  token: string;
  as: Party;
  id: string;
  onOpenCondition: () => void;
  onTellArea: () => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const options = as === 'tenant' ? { baseUrl, tenantToken: token } : { baseUrl, agentToken: token };
  const api = () => client(options).tenancy;
  const { query, refresh } = useQuery<Tenancy>(() => attempt(() => api().one(id)), [baseUrl, token, id]);
  const receipts = useQuery<Receipt[]>(() => attempt(() => api().receipts(id)), [baseUrl, token, id]);
  const tickets = useQuery<Ticket[]>(() => attempt(() => api().tickets(id)), [baseUrl, token, id]);
  const [problem, setProblem] = useState<string | null>(null);
  const [recording, setRecording] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [receivedOn, setReceivedOn] = useState('');
  const [disputing, setDisputing] = useState<string | null>(null);
  const [why, setWhy] = useState('');
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [noting, setNoting] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [raising, setRaising] = useState(false);
  const today = new Date();
  const [category, setCategory] = useState<string>('plumbing');
  const [description, setDescription] = useState('');

  const tenancy = query.state === 'ready' ? query.value : null;
  const me = tenancy ? (as === 'tenant' ? tenancy.agreement.tenantId : tenancy.agreement.lettingId) : null;
  const signedBy = new Set((tenancy?.entries ?? []).filter((e) => e.kind === 'agreement_signed').map((e) => e.by));
  const mineSigned = me !== null && signedBy.has(me);
  const ended = (tenancy?.entries ?? []).some((e) => e.kind === 'ended');

  function refused(r: { ok: false; failure: { kind: string; detail?: string } }) {
    setProblem(r.failure.kind === 'refused' ? (r.failure.detail ?? t('try_again')) : t('no_signal_nothing_sent'));
  }
  function refreshAll() {
    refresh();
    receipts.refresh();
    tickets.refresh();
  }

  async function sign() {
    setProblem(null);
    const bytes = await attempt(() => api().agreement(id));
    if (!bytes.ok) return refused(bytes);
    const signed = as === 'tenant' ? await signAsTenant(baseUrl, token, bytes.value.message) : await signAsLetting(baseUrl, token, bytes.value.message);
    if ('why' in signed) return setProblem(signed.why);
    const r = await attempt(() => api().sign(id, signed.signature, signed.deviceId));
    if (!r.ok) return refused(r);
    refreshAll();
  }

  async function record(periodIndex: number) {
    setProblem(null);
    const r = await attempt(() => api().recordPayment(id, { periodIndex, amountKobo: Math.round(Number(amount) * 100), receivedOn: receivedOn.trim() }));
    if (!r.ok) return refused(r);
    setRecording(null);
    setAmount('');
    setReceivedOn('');
    refreshAll();
  }

  async function dispute(paymentId: string) {
    setProblem(null);
    const r = await attempt(() => api().disputePayment(id, paymentId, why.trim()));
    if (!r.ok) return refused(r);
    setDisputing(null);
    setWhy('');
    refreshAll();
  }

  async function correct(paymentId: string) {
    setProblem(null);
    const r = await attempt(() => api().correctPayment(id, paymentId, Math.round(Number(amount) * 100), why.trim()));
    if (!r.ok) return refused(r);
    setCorrecting(null);
    setAmount('');
    setWhy('');
    refreshAll();
  }

  async function addNote(ticketId: string) {
    setProblem(null);
    const r = await attempt(() => api().noteTicket(ticketId, noteText.trim()));
    if (!r.ok) return refused(r);
    setNoting(null);
    setNoteText('');
    tickets.refresh();
  }

  async function raise() {
    setProblem(null);
    const r = await attempt(() => api().openTicket(id, { category, description: description.trim() }));
    if (!r.ok) return refused(r);
    setRaising(false);
    setDescription('');
    tickets.refresh();
  }

  async function moveTicket(ticketId: string, to: string) {
    setProblem(null);
    const r = await attempt(() => api().moveTicket(ticketId, to));
    if (!r.ok) return refused(r);
    tickets.refresh();
  }

  async function end() {
    setProblem(null);
    const r = await attempt(() => api().end(id));
    if (!r.ok) return refused(r);
    refreshAll();
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenHeader title={tenancy?.agreement.propertyId ?? t('tenancy')} onBack={onBack} />
      <Unready query={query} onRetry={refresh} />
      {problem !== null && (
        <Text variant="body" tone="caution">
          {problem}
        </Text>
      )}
      {tenancy !== null && (
        <>
          <Card overline={t('agreement')} icon="document">
            <Text variant="title">{`${naira(tenancy.agreement.rentKobo)} · ${t(periodPhrase(tenancy.agreement.period))} · ${tenancy.agreement.periods}`}</Text>
            <Text variant="body" tone="secondary">{`${t('starts_on')} ${tenancy.agreement.startsOn} · ${t('caution_deposit')} ${naira(tenancy.agreement.cautionDepositKobo)}`}</Text>
            {!tenancy.templateLegallyReviewed && (
              <Text variant="label" tone="caution">
                {t('template_not_reviewed')}
              </Text>
            )}
            <Text variant="body" tone={tenancy.signed ? 'clear' : 'secondary'}>
              {ended ? t('ended') : tenancy.signed ? t('signed_by_both') : mineSigned ? t('signed_by_you') : signedBy.size > 0 ? t('signed_by_other') : t('unsigned')}
            </Text>
            {!tenancy.signed && !mineSigned && !ended && <Button label={t('sign_agreement')} onPress={() => void sign()} />}
            <Text variant="label" tone="secondary">
              {t('recorded_note')}
            </Text>
          </Card>

          <Card overline={t('schedule')} icon="naira">
            {tenancy.recorded.map((row) => (
              <View key={row.periodIndex} style={styles.row}>
                <Text variant="body">{`${t('period_of')} ${row.periodIndex} · ${t('due_on')} ${row.dueOn} · ${naira(row.dueKobo)}`}</Text>
                {(() => {
                  // The tenant's own phone reading its own schedule: a date is coming. Never "pay".
                  const days = reminderOn({ index: row.periodIndex, dueOn: new Date(`${row.dueOn}T00:00:00.000Z`), amountKobo: row.dueKobo }, today);
                  return days === null ? null : (
                    <Text variant="label" tone="accent">{`${t('due_on')} ${row.dueOn} · ${days}`}</Text>
                  );
                })()}
                <Text variant="label" tone={row.disputed ? 'caution' : row.recordedKobo >= row.dueKobo ? 'clear' : 'secondary'}>
                  {`${t('recorded_so_far')} ${naira(row.recordedKobo)}${row.disputed ? ` · ${t('disputed')}` : ''}`}
                </Text>
                {as === 'letting' && tenancy.signed && !ended && recording !== row.periodIndex && (
                  <Button label={t('record_received')} onPress={() => setRecording(row.periodIndex)} quiet />
                )}
                {as === 'letting' && recording === row.periodIndex && (
                  <View style={styles.form}>
                    <Field label={t('amount_naira')} value={amount} onChange={setAmount} keyboard="number-pad" />
                    <Field label={t('received_on')} value={receivedOn} onChange={setReceivedOn} placeholder="2026-10-01" />
                    <Button label={t('record_received')} onPress={() => void record(row.periodIndex)} disabled={!amount || !receivedOn} />
                    <Button label={t('not_now')} onPress={() => setRecording(null)} quiet />
                  </View>
                )}
              </View>
            ))}
            {tenancy.recorded.every((r) => r.recordedKobo === 0) && (
              <Text variant="label" tone="secondary">
                {t('nothing_recorded')}
              </Text>
            )}
          </Card>

          <Card overline={t('receipts')} icon="check">
            <Unready query={receipts.query} onRetry={receipts.refresh} />
            {receipts.query.state === 'ready' &&
              receipts.query.value.map((r) => (
                <View key={r.paymentId} style={styles.row}>
                  <Text variant="body">{`${t('period_of')} ${r.periodIndex} / ${r.periods} · ${naira(r.amountKobo)} · ${r.receivedOn.slice(0, 10)}`}</Text>
                  {r.correctedToKobo !== null && (
                    <Text variant="label" tone="caution">{`${t('receipt_corrected')} ${naira(r.correctedToKobo)}`}</Text>
                  )}
                  {as === 'tenant' && !ended && disputing !== r.paymentId && <Button label={t('dispute_amount')} onPress={() => setDisputing(r.paymentId)} quiet />}
                  {as === 'letting' && !ended && correcting !== r.paymentId && <Button label={t('correct_amount')} onPress={() => setCorrecting(r.paymentId)} quiet />}
                  {as === 'letting' && correcting === r.paymentId && (
                    <View style={styles.form}>
                      <Field label={t('amount_naira')} value={amount} onChange={setAmount} keyboard="number-pad" />
                      <Field label={t('why_wrong')} value={why} onChange={setWhy} lines={2} />
                      <Button label={t('correct_amount')} onPress={() => void correct(r.paymentId)} disabled={!amount || !why.trim()} />
                      <Button label={t('not_now')} onPress={() => setCorrecting(null)} quiet />
                    </View>
                  )}
                  {as === 'tenant' && disputing === r.paymentId && (
                    <View style={styles.form}>
                      <Field label={t('what_is_wrong')} value={why} onChange={setWhy} lines={3} />
                      <Button label={t('dispute_amount')} onPress={() => void dispute(r.paymentId)} disabled={!why.trim()} />
                      <Button label={t('not_now')} onPress={() => setDisputing(null)} quiet />
                    </View>
                  )}
                </View>
              ))}
          </Card>

          <Card overline={t('tickets')} icon="alert">
            <Unready query={tickets.query} onRetry={tickets.refresh} />
            {tickets.query.state === 'ready' &&
              tickets.query.value.map((k) => {
                const opened = k.events.find((e) => e.kind === 'opened');
                return (
                  <View key={k.id} style={styles.row}>
                    <Text variant="body">{`${t(categoryPhrase(opened?.category ?? 'other'))} · ${opened?.description ?? ''}`}</Text>
                    <Text variant="label" tone="secondary">
                      {t(statePhrase(k.state))}
                    </Text>
                    {k.events
                      .filter((e) => e.kind === 'noted')
                      .map((e, i) => (
                        <Text key={i} variant="label" tone="secondary">{`${e.at.slice(0, 10)} · ${e.note ?? ''}`}</Text>
                      ))}
                    {k.moves.map((to) => (
                      <Button key={to} label={`${t('move_to')} ${t(statePhrase(to))}`} onPress={() => void moveTicket(k.id, to)} quiet />
                    ))}
                    {noting !== k.id ? (
                      <Button label={t('add_a_note')} onPress={() => setNoting(k.id)} quiet />
                    ) : (
                      <View style={styles.form}>
                        <Field label={t('add_a_note')} value={noteText} onChange={setNoteText} lines={2} />
                        <Button label={t('add_a_note')} onPress={() => void addNote(k.id)} disabled={!noteText.trim()} />
                        <Button label={t('not_now')} onPress={() => setNoting(null)} quiet />
                      </View>
                    )}
                  </View>
                );
              })}
            {as === 'tenant' && tenancy.signed && !ended && !raising && <Button label={t('open_ticket')} onPress={() => setRaising(true)} />}
            {raising && (
              <View style={styles.form}>
                <Text variant="label">{t('ticket_category')}</Text>
                <Choice options={TICKET_CATEGORIES.map((c) => ({ id: c, label: t(categoryPhrase(c)) }))} chosen={category} onChoose={setCategory} />
                <Field label={t('ticket_description')} value={description} onChange={setDescription} lines={3} />
                <Button label={t('open_ticket')} onPress={() => void raise()} disabled={!description.trim()} />
                <Button label={t('not_now')} onPress={() => setRaising(false)} quiet />
              </View>
            )}
          </Card>

          <Button label={t('walk_record')} onPress={onOpenCondition} quiet />
          {as === 'tenant' && tenancy.signed && <Button label={t('tell_about_area')} onPress={onTellArea} quiet />}
          {!ended && <Button label={t('end_tenancy')} onPress={() => void end()} quiet />}
        </>
      )}
    </ScrollView>
  );
}

export function categoryPhrase(c: string): 'cat_plumbing' | 'cat_electrical' | 'cat_structural' | 'cat_security' | 'cat_pests' | 'cat_appliance' | 'cat_other' {
  switch (c) {
    case 'plumbing':
      return 'cat_plumbing';
    case 'electrical':
      return 'cat_electrical';
    case 'structural':
      return 'cat_structural';
    case 'security':
      return 'cat_security';
    case 'pests':
      return 'cat_pests';
    case 'appliance':
      return 'cat_appliance';
    default:
      return 'cat_other';
  }
}

export function statePhrase(s: string): 'state_open' | 'state_acknowledged' | 'state_assigned' | 'state_in_progress' | 'state_resolved' | 'state_closed' {
  switch (s) {
    case 'acknowledged':
      return 'state_acknowledged';
    case 'assigned':
      return 'state_assigned';
    case 'in_progress':
      return 'state_in_progress';
    case 'resolved':
      return 'state_resolved';
    case 'closed':
      return 'state_closed';
    default:
      return 'state_open';
  }
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md },
  row: { gap: space.xs, paddingVertical: space.xs },
  form: { gap: space.sm },
});
