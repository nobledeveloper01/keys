import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { attempt, client, type ReplyView } from '@keys/api';
import { categoryPhrase } from '@keys/domain';

import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Glass } from '../components/Glass';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';

/**
 * Answering a report about your own number.
 *
 * Reached from a link in an SMS and from nowhere else — there is no tab, no
 * entry in a menu, and no sign-in. Holding the texted token is the only proof
 * of control over the number that this product accepts, because demanding an
 * account before somebody may answer an accusation about them would mean most
 * of them never answer, and a registry of unanswered accusations is the thing
 * this whole review process exists to avoid.
 *
 * Everything assumes the reader is angry and that this is the first they have
 * heard of it. So the sentence that matters — *nothing has been published* —
 * is above the accusation rather than below it.
 */
export function ReplyScreen({
  baseUrl,
  token,
  onDone,
}: {
  baseUrl: string;
  token: string;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const colours = useColours();

  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const { query, refresh } = useQuery<ReplyView>(
    () => attempt(() => client({ baseUrl }).reportAboutMe(token)),
    [token, baseUrl],
  );

  if (sent) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Glass
          elevated
          tone={{ line: colours.clear, wash: colours.clearWash }}
          style={styles.card}
        >
          <Text variant="title">{t('answer_recorded')}</Text>
          <Text variant="body" tone="secondary" style={styles.row}>
            {t('answer_recorded_detail')}
          </Text>
        </Glass>
        <Button label={t('go_back')} onPress={onDone} />
      </ScrollView>
    );
  }

  /*
    A bad token is its own screen, not an error.

    The link is a capability and it can be mistyped, truncated by a messaging
    app, or expired. "Something went wrong" would send somebody who has been
    accused of something looking for a fault in their phone.
  */
  if (query.state === 'refused') {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text variant="headline">{t('reply_link_not_valid')}</Text>
        <Text variant="body" tone="secondary" style={styles.row}>
          {t('reply_link_help')}
        </Text>
        <Button label={t('go_back')} onPress={onDone} quiet />
      </ScrollView>
    );
  }

  const report = query.state === 'ready' ? query.value : null;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Button label={t('go_back')} onPress={onDone} quiet />

      <Text variant="headline" style={styles.title}>
        {t('a_report_about_your_number')}
      </Text>

      {/* Above the accusation, because it is the part that calms somebody down. */}
      <Text variant="body" style={styles.row}>
        {t('nothing_published_yet')}
      </Text>

      <Unready query={query} onRetry={refresh} />

      {report && (
        <>
          <Glass style={styles.card}>
            <Text variant="label" tone="secondary">
              {t('what_was_said')}
            </Text>
            <Text variant="title" style={styles.row}>
              {t(categoryPhrase(report.category))}
            </Text>
            <Text variant="body" style={styles.row}>
              {report.description}
            </Text>
            <Text variant="label" tone="secondary" style={styles.row}>
              {`${t('you_have_until')} ${new Date(report.replyBy).toDateString()}`}
            </Text>
          </Glass>

          {report.alreadyReplied ? (
            <Text variant="body" tone="clear" style={styles.row}>
              {t('already_answered')}
            </Text>
          ) : (
            <>
              {problem !== null && (
                <Text
                  variant="body"
                  tone="alarm"
                  accessibilityRole="alert"
                  style={styles.row}
                >
                  {problem}
                </Text>
              )}

              <Field
                label={t('your_answer')}
                value={answer}
                onChange={setAnswer}
                help={t('your_answer_help')}
                lines={6}
              />

              <Button
                label={t('send_your_answer')}
                disabled={busy || answer.trim().length < 10}
                onPress={() => {
                  setBusy(true);
                  setProblem(null);
                  void attempt(() =>
                    client({ baseUrl }).answer({ token, reply: answer.trim() }),
                  ).then((result) => {
                    setBusy(false);
                    if (result.ok) setSent(true);
                    else
                      setProblem(
                        result.failure.kind === 'refused'
                          ? result.failure.detail
                          : t('no_signal_nothing_sent'),
                      );
                  });
                }}
              />
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.lg, flexGrow: 1 },
  title: { marginTop: space.md },
  row: { marginTop: space.sm },
  card: { marginTop: space.md },
});
