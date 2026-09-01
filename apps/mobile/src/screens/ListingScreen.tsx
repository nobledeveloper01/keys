import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type ListingView } from '@keys/api';

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

      <Unready query={query} onRetry={refresh} />

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
