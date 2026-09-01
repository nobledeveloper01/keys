import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client } from '@keys/api';
import { REPORT_CATEGORIES, categoryPhrase, type ReportCategory } from '@keys/domain';

import { Button } from '../components/Button';
import { Choice } from '../components/Choice';
import { Field } from '../components/Field';
import { Glass } from '../components/Glass';
import { Text } from '../components/Text';
import { space } from '../design/tokens';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';

/**
 * Reporting a number, from the app.
 *
 * This existed only on the web for a phase, which meant a tenant could look a
 * number up on their phone, find nothing, get scammed that afternoon, and have
 * nowhere in the app to say so. The registry is only as good as what reaches
 * it, and what reaches it comes from people holding phones.
 *
 * Everything here assumes the reader has just lost money and is angry. So the
 * screen says what a report *is* before it asks for anything — an accusation
 * about a named person, read by a reviewer, answerable by them — rather than
 * putting that in small print under the send button where somebody in that
 * state will not read it.
 */
export function ReportScreen({
  baseUrl,
  phone,
  listingId,
  onDone,
  onCancel,
}: {
  baseUrl: string;
  /** Pre-filled from the lookup they just did. Editable, because they may have mistyped. */
  phone: string;
  /**
   * The listing this is about, when it came from a listing page.
   *
   * When it is set, the number field is not shown at all — and not because it
   * is inconvenient. A tenant who found this place through search has never
   * seen the agent's number; that is what deferred contact exchange is *for*.
   * Asking them to supply one would have made every listing they can see
   * unreportable, which is what it quietly was until this prop existed.
   */
  listingId?: string | undefined;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const colours = useColours();

  const [reported, setReported] = useState(phone);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Glass
          elevated
          tone={{ line: colours.clear, wash: colours.clearWash }}
          style={styles.card}
        >
          <Text variant="title">{t('report_received')}</Text>
          <Text variant="body" tone="secondary" style={styles.row}>
            {t('report_received_detail')}
          </Text>
        </Glass>
        <Button label={t('go_back')} onPress={onDone} />
      </ScrollView>
    );
  }

  // Twenty characters is the server's floor. Checking it here as well is not a
  // second rule — it is the same number, and the point is that somebody is
  // told before they press send rather than after a round trip.
  const tooShort = description.trim().length < 20;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Button label={t('go_back')} onPress={onCancel} quiet />

      <Text variant="headline" style={styles.title}>
        {t('report_a_number')}
      </Text>
      <Text variant="body" tone="secondary" style={styles.row}>
        {t('report_lede')}
      </Text>

      {/*
        The warning is a card, not a footnote.

        A false report is a public accusation about a named person that Keys
        has to answer for, and the moment somebody is most likely to file one
        is the moment they are angriest. This sits above the fields on purpose.
      */}
      <Glass tone={{ line: colours.caution, wash: colours.cautionWash }} style={styles.card}>
        <Text variant="body">{t('only_report_what_happened_to_you')}</Text>
      </Glass>

      {problem !== null && (
        <Text variant="body" tone="alarm" accessibilityRole="alert" style={styles.row}>
          {problem}
        </Text>
      )}

      {/*
        No number field at all when this is about a listing.

        Not hidden as a convenience — a tenant who found this place through
        search has never seen the agent's number, and a field they cannot fill
        in is a report they cannot file.
      */}
      {listingId === undefined ? (
        <Field
          label={t('which_number_reported')}
          value={reported}
          onChange={setReported}
          keyboard="phone-pad"
          help={t('check_a_number_help')}
        />
      ) : (
        <Text variant="body" tone="secondary" style={styles.row}>
          {t('report_this_listing_help')}
        </Text>
      )}

      <Text variant="label" style={styles.kind}>
        {t('what_kind')}
      </Text>
      <Choice
        options={REPORT_CATEGORIES.map((c) => ({ id: c, label: t(categoryPhrase(c)) }))}
        chosen={category}
        // Narrowed here rather than widening the state: `Choice` is a general
        // list of ids and the category union is the domain's, so the cast
        // belongs at the one point they meet.
        onChoose={(id) => setCategory(id as ReportCategory)}
      />

      <Field
        label={t('what_happened')}
        value={description}
        onChange={setDescription}
        help={t('what_happened_help')}
        lines={6}
      />

      <View style={styles.send}>
        <Button
          label={t('send_report')}
          disabled={
            busy ||
            category === null ||
            tooShort ||
            (listingId === undefined && reported.trim().length < 7)
          }
          accessibilityHint={tooShort ? t('report_too_short') : undefined}
          onPress={() => {
            /*
              Returns rather than defaulting.

              The first version wrote `category ?? 'fake_listing'` to satisfy
              the type — which would have filed a report under a category
              nobody chose, if the disabled button were ever bypassed. A
              fallback that invents an accusation is worse than a button that
              does nothing.
            */
            if (category === null) return;
            setBusy(true);
            setProblem(null);
            void attempt(() =>
              client({ baseUrl }).report({
                /*
                  One of the two, never both invented.

                  With a listing, the server resolves whose it is from data
                  this phone has never held. Without one, this is the registry
                  path and the number is what there is.
                */
                ...(listingId === undefined
                  ? { reportedPhone: reported.trim() }
                  : { listingId }),
                category,
                description: description.trim(),
                evidenceKeys: [],
              }),
            ).then((result) => {
              setBusy(false);
              if (result.ok) setSent(true);
              else
                setProblem(
                  result.failure.kind === 'refused'
                    ? result.failure.detail
                    : t('no_signal_saved_here'),
                );
            });
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.lg, flexGrow: 1 },
  title: { marginTop: space.md },
  row: { marginTop: space.sm },
  card: { marginTop: space.md },
  kind: { marginTop: space.lg },
  send: { marginBottom: space.xl },
});
