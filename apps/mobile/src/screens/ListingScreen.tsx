import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type ListingView } from '@keys/api';
import { CONFIRMATION_DAYS, savedAge } from '@keys/domain';

import { Button } from '../components/Button';
import { Costs } from '../components/Costs';
import { Glass } from '../components/Glass';
import { Progress } from '../components/Progress';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';
import { snapshot, useSaved } from '../state/saved';

/**
 * One place, and what was actually checked about it.
 *
 * The evidence panel is the product. A badge is a claim a tenant has to take
 * on trust and a shape anybody can screenshot; this is the list of things that
 * were checked — an ID against a live photo, a landlord confirming the
 * authority, a photograph taken on site, somebody saying within the fortnight
 * that it is still there — which a tenant can read and disagree with.
 *
 * Unchecked listings are reachable and say so, at the top, before the details.
 * Hiding them would push the market back to WhatsApp; showing them without
 * saying would make the badge meaningless.
 */
export function ListingScreen({
  baseUrl,
  id,
  onBack,
  onCheckAgent,
  onMessage,
  onReport,
}: {
  baseUrl: string;
  id: string;
  onBack: () => void;
  onCheckAgent: () => void;
  onMessage: () => void;
  onReport: () => void;
}) {
  const { t, language } = useLanguage();
  const colours = useColours();

  const saved = useSaved();
  const kept = saved.listings.find((l) => l.id === id) ?? null;

  const { query, refresh } = useQuery<ListingView>(
    () => attempt(() => client({ baseUrl }).listing(id, language)),
    [id, language, baseUrl],
  );

  const listing = query.state === 'ready' ? query.value : null;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {/*
        `go_back`, not `back_to_properties`. That phrase means *your*
        properties and belongs to an agent; a tenant reading about somebody
        else's flat is not going back to theirs.
      */}
      <Button label={t('go_back')} onPress={onBack} quiet />

      {/*
        The saved copy, when the live one cannot be had.

        It shows the address, the price and what *had* been checked — and says,
        in the heading and in a sentence underneath, that this is a copy and
        when it was taken. What it never shows is the badge: `mayShowBadgeOffline`
        answers false at every age, because a badge means Keys checked this and
        a phone with no signal has checked nothing.
      */}
      {query.state === 'unreachable' && kept !== null && (
        <>
          <Text variant="headline" style={styles.title}>
            {kept.title}
          </Text>
          <Text variant="body" tone="secondary">
            {kept.address}
          </Text>

          <Glass style={styles.card}>
            <Text variant="label" tone="secondary">
              {t('saved_copy_heading')}
            </Text>
            <Text variant="body" style={styles.row}>
              {ageWords(kept.savedAt, t)}
            </Text>
            <Progress
              steps={kept.checks.map((check) => ({
                id: check.condition,
                label: check.label,
                detail: '',
                done: check.met,
              }))}
            />
            <Text variant="body" tone="secondary" style={styles.row}>
              {t('keys_cannot_check_offline')}
            </Text>
          </Glass>
        </>
      )}

      {/*
        Not while a saved copy is on the screen.

        The card above already says what happened and what it is showing. A
        "we cannot reach Keys" panel underneath it would be a second, blunter
        account of the same situation, sitting under an explanation that was
        written for it.
      */}
      {!(query.state === 'unreachable' && kept !== null) && (
        <Unready query={query} onRetry={refresh} />
      )}

      {listing && (
        <>
          <Text variant="headline" style={styles.title}>
            {listing.title}
          </Text>
          <Text variant="body" tone="secondary">
            {listing.address}
          </Text>

          {/* The warning before the detail, when there is one. */}
          {!listing.verified && (
            <Glass
              tone={{ line: colours.caution, wash: colours.cautionWash }}
              style={styles.card}
            >
              <Text variant="body">{t('not_verified_listing')}</Text>
            </Glass>
          )}

          {/*
            Cost before evidence.

            Somebody scanning a listing is asking two questions and this is the
            first of them. The evidence panel answers "is this real"; it does
            not answer "can I afford it", and a page that makes you scroll past
            seven ticks to find the price has its priorities from the seller's
            side rather than the reader's.
          */}
          <Costs costs={listing.costs} />

          {/*
            Spread rather than `tone={… : undefined}`.

            `exactOptionalPropertyTypes` treats an absent prop and one set to
            `undefined` as different things, which is the point of the setting:
            passing `undefined` explicitly is a decision, and here the decision
            is that an unchecked listing has no status colour at all.
          */}
          <Glass
            elevated
            {...(listing.verified
              ? { tone: { line: colours.clear, wash: colours.clearWash } }
              : {})}
            style={styles.card}
          >
            <Text variant="label" tone="secondary">
              {t('what_was_checked_here')}
            </Text>
            <Progress
              steps={listing.checks.map((check) => ({
                id: check.condition,
                label: check.label,
                // A tenant is not being told what to do — they are being told
                // what was checked. The instruction belongs to the agent.
                detail: '',
                done: check.met,
              }))}
            />
          </Glass>

          <View style={styles.section}>
            <Text variant="label" tone="secondary">
              {t('listed_by')}
            </Text>
            <Text variant="title">{listing.agentName}</Text>
            <Text variant="body" style={styles.row}>
              {`“${listing.agentMeaning}”`}
            </Text>
            {/*
              Asking comes before checking.

              Somebody reading this page wants to know whether they can see the
              flat. Checking the agent's number is what you do when you already
              have doubts — the quiet button, for the same reason Check is the
              second tab rather than the first.
            */}
            <Button label={t('message_the_agent')} onPress={onMessage} />
            <Button label={t('check_this_agent')} onPress={onCheckAgent} quiet />
            {/*
              Reporting is last and quiet, and it exists at all only because
              the number field on that screen became optional. Before that, a
              tenant could read this whole page, believe the place was fiction,
              and have nothing to press.
            */}
            <Button
              label={saved.has(id) ? t('saved_already') : t('save_this_place')}
              quiet
              disabled={saved.has(id)}
              onPress={() =>
                saved.save(snapshot(id, listing, listing.costs?.moveInKobo ?? null, new Date()))
              }
            />
            <Button label={t('report_this_listing')} onPress={onReport} quiet />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.lg, paddingBottom: space.xl, flexGrow: 1 },
  title: { marginTop: space.md },
  card: { marginTop: space.lg },
  section: { marginTop: space.xl },
  row: { marginTop: space.sm },
});


/**
 * How old this copy is, in words rather than a date.
 *
 * "saved today" is what somebody needs to decide whether to trust the address
 * they are walking to. A timestamp is more precise and less useful, and the
 * boundary between "recently" and "a while ago" is `CONFIRMATION_DAYS` — past
 * that the copy is older than the freshest claim the live product would have
 * made about it.
 */
function ageWords(
  savedAt: Date,
  t: (key: 'saved_today' | 'saved_recently' | 'saved_a_while_ago') => string,
): string {
  switch (savedAge({ savedAt }, new Date(), CONFIRMATION_DAYS)) {
    case 'today':
      return t('saved_today');
    case 'recent':
      return t('saved_recently');
    default:
      return t('saved_a_while_ago');
  }
}
