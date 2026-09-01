import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { attempt, client } from '@keys/api';

import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Text } from '../components/Text';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useTenant } from '../state/tenant';

/**
 * Asking an agent about a place.
 *
 * One screen, and the account is a *part* of it rather than a gate in front of
 * it. Somebody who has found a flat and wants to ask about it has a reason to
 * give a name; somebody who has just opened the app has none, and asking then
 * is how a product teaches people to close it.
 *
 * So the name and number appear only for somebody who has no account yet, and
 * they appear underneath the question they are trying to ask — which is also
 * the answer to "why does this app want my number", visible on the same screen
 * as the request.
 */
export function AskScreen({
  baseUrl,
  listingId,
  onBack,
  onStarted,
}: {
  baseUrl: string;
  listingId: string;
  onBack: () => void;
  onStarted: (conversationId: string) => void;
}) {
  const { t } = useLanguage();
  const { token, signIn } = useTenant();

  const [said, setSaid] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const needsAccount = token === null;
  const ready =
    said.trim().length > 0 && (!needsAccount || (name.trim().length >= 2 && phone.trim().length >= 7));

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Button label={t('go_back')} onPress={onBack} quiet />

      <Text variant="headline" style={styles.title}>
        {t('ask_about_this_place')}
      </Text>

      {problem !== null && (
        <Text variant="body" tone="alarm" accessibilityRole="alert" style={styles.row}>
          {problem}
        </Text>
      )}

      <Field label={t('say_something')} value={said} onChange={setSaid} lines={3} />

      {needsAccount && (
        <>
          {/*
            The explanation sits with the request, not in a policy page.

            And it is its own phrase rather than the contact-exchange one,
            which said "they will only see it if they share theirs" — true of a
            number offered *inside* a conversation and false of this one. This
            number is hashed on arrival and no agent ever sees it. Borrowing the
            other sentence would have told somebody their number was on its way
            to an agent when it was not, which is a worse failure than saying
            nothing.
          */}
          <Text variant="body" tone="secondary" style={styles.row}>
            {t('why_we_want_your_number')}
          </Text>
          <Field label={t('your_name')} value={name} onChange={setName} />
          <Field label={t('your_number')} value={phone} onChange={setPhone} keyboard="phone-pad" />
        </>
      )}

      <Button
        label={t('send')}
        disabled={busy || !ready}
        onPress={() => {
          setBusy(true);
          setProblem(null);
          void (async () => {
            let mine = token;
            if (mine === null) {
              const opened = await attempt(() =>
                client({ baseUrl }).tenant.signUp(name.trim(), phone.trim()),
              );
              if (!opened.ok) {
                setProblem(refusal(opened, t));
                return;
              }
              mine = opened.value.token;
              signIn(mine);
            }
            const started = await attempt(() =>
              client({ baseUrl, tenantToken: mine }).tenant.ask(listingId, said.trim()),
            );
            if (started.ok) onStarted(started.value.id);
            else setProblem(refusal(started, t));
          })().finally(() => setBusy(false));
        }}
      />
    </ScrollView>
  );
}

function refusal(
  result: { ok: false; failure: { kind: string; detail?: string } } | { ok: true },
  t: (key: 'no_signal_nothing_sent') => string,
): string {
  if (result.ok) return '';
  return result.failure.kind === 'refused'
    ? (result.failure.detail ?? t('no_signal_nothing_sent'))
    : t('no_signal_nothing_sent');
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md },
  title: { marginTop: space.sm },
  row: { marginTop: space.xs },
});
