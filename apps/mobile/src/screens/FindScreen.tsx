import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type SearchResponse } from '@keys/api';

import { Chip } from '../components/Chip';
import { naira } from '@keys/domain';

import { PropertyRow } from '../components/PropertyRow';
import { SearchField } from '../components/SearchField';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';
import { useSaved } from '../state/saved';

/**
 * Finding somewhere to live.
 *
 * The tenant's other job, and the one the whole verification ladder exists to
 * serve — checking a number is what you do when somebody has already found
 * you.
 *
 * **Checked places only, by default.** Turning the filter off is a deliberate
 * act, and what comes back then still says, per listing, that it has not been
 * checked. A product whose default is "show me everything" has a badge nobody
 * has any reason to earn.
 */
export function FindScreen({
  baseUrl,
  onOpen,
}: {
  baseUrl: string;
  onOpen: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const saved = useSaved();

  const { query, refresh } = useQuery<SearchResponse>(
    () => attempt(() => client({ baseUrl }).search({ q: typed.trim(), verifiedOnly })),
    [typed, verifiedOnly, baseUrl],
  );

  const found = query.state === 'ready' ? query.value : null;

  /*
    Reading from the phone rather than the network, either because somebody
    asked or because the request failed and there is something to fall back on.
  */
  const offline =
    showSaved || (query.state === 'unreachable' && saved.listings.length > 0);
  const results = found?.results ?? null;
  const featured = found?.featured ?? [];

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text variant="headline">{t('find_a_place')}</Text>
      <Text variant="body" tone="secondary" style={styles.lede}>
        {t('find_a_place_lede')}
      </Text>

      <SearchField
        value={typed}
        onChange={setTyped}
        placeholder={t('search_places_hint')}
        accessibilityLabel={t('find_a_place')}
      />

      <View style={styles.filter}>
        {/*
          The Verified filter is about a live search, so it goes while one is
          not happening.

          Leaving it lit above a list of saved copies would say Keys had
          filtered them to checked places — a claim the card on each of those
          pages spends a paragraph carefully not making.
        */}
        {!offline && (
          <Chip
            label={t('verified_only')}
            selected={verifiedOnly}
            onPress={() => setVerifiedOnly((was) => !was)}
          />
        )}
        {/*
          Saved places, as a chip rather than a sixth tab.

          Five is what a bottom bar holds, and this is not a peer of Find — it
          is the same question asked of what is already on the phone.
        */}
        {saved.listings.length > 0 && (
          <Chip
            label={t('saved_places')}
            selected={showSaved}
            onPress={() => setShowSaved((was) => !was)}
          />
        )}
      </View>

      {/*
        Loading, unreachable and refused, before any content. An empty list
        drawn over a failed request is the lie this app refuses everywhere.

        Hidden while the saved list is showing, because there is nothing
        unready about it — it is on the phone, and saying "cannot reach the
        server" above content that never needed the server would be describing
        a problem that is not affecting what somebody is looking at.
      */}
      {!offline && <Unready query={query} onRetry={refresh} />}

      {/*
        The paid band, above the answer and labelled as bought.

        Not interleaved, and not sorted against anything. `rank()` has never
        heard of featuring — no parameter, no field — so this cannot quietly
        become a boost. What money buys here is a slot with a label on it; what
        it cannot buy is a better answer to the question somebody asked, and
        keeping the two apart in the response is what makes that checkable
        rather than promised.

        Usually empty, and rendering nothing when it is: an empty "no paid
        listings" heading would be an advert for advertising.
      */}
      {/*
        When the network is gone and there are saved places, show them.

        Not a decision the person has to make while standing in a lift with no
        bars: the app already knows the request failed and already knows it has
        something. What it must not do is pretend the saved copies are a live
        answer, which is what the heading on each row is for.
      */}
      {offline && (
        <View style={styles.rows}>
          <Text variant="label" tone="secondary" style={styles.heading}>
            {t('saved_places')}
          </Text>
          {saved.listings.map((listing) => (
            <PropertyRow
              key={listing.id}
              title={listing.title}
              address={listing.address}
              status={
                typeof listing.moveInKobo === 'number'
                  ? `${naira(listing.moveInKobo)} · ${listing.agentName}`
                  : listing.agentName
              }
              /*
                Never `clear`, at any age.

                A green dot is this app saying it checked something, and a phone
                with no signal has checked nothing. See `mayShowBadgeOffline`,
                which answers false for a copy saved thirty seconds ago.
              */
              tone="quiet"
              onPress={() => onOpen(listing.id)}
            />
          ))}
        </View>
      )}

      {!offline && featured.length > 0 && (
        <View style={styles.band}>
          <Text variant="label" tone="secondary">
            {t('paid_to_appear_here')}
          </Text>
          {featured.map((result) => (
            <PropertyRow
              key={result.id}
              title={result.title}
              address={result.address}
              status={
                typeof result.moveInKobo === 'number'
                  ? `${naira(result.moveInKobo)} · ${result.agentName}`
                  : result.agentName
              }
              tone={result.verified ? 'clear' : 'quiet'}
              onPress={() => onOpen(result.id)}
            />
          ))}
        </View>
      )}

      {!offline && results !== null &&
        (results.length === 0 && featured.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="title">{t('nothing_found')}</Text>
            <Text variant="body" tone="secondary" style={styles.row}>
              {t('nothing_found_detail')}
            </Text>
          </View>
        ) : (
          <View style={styles.rows}>
            {/*
              A heading on the free list, but only when there is a paid band
              above it.

              Without one, the band and the answer render identically and there
              is no line where "bought" stops — a reader with one paid listing
              above three free ones cannot tell which is which, which makes the
              label decorative. With nothing bought there is nothing to
              distinguish, and a heading over the only list on the screen is
              furniture.
            */}
            {/*
        When the network is gone and there are saved places, show them.

        Not a decision the person has to make while standing in a lift with no
        bars: the app already knows the request failed and already knows it has
        something. What it must not do is pretend the saved copies are a live
        answer, which is what the heading on each row is for.
      */}
      {offline && (
        <View style={styles.rows}>
          <Text variant="label" tone="secondary" style={styles.heading}>
            {t('saved_places')}
          </Text>
          {saved.listings.map((listing) => (
            <PropertyRow
              key={listing.id}
              title={listing.title}
              address={listing.address}
              status={
                typeof listing.moveInKobo === 'number'
                  ? `${naira(listing.moveInKobo)} · ${listing.agentName}`
                  : listing.agentName
              }
              /*
                Never `clear`, at any age.

                A green dot is this app saying it checked something, and a phone
                with no signal has checked nothing. See `mayShowBadgeOffline`,
                which answers false for a copy saved thirty seconds ago.
              */
              tone="quiet"
              onPress={() => onOpen(listing.id)}
            />
          ))}
        </View>
      )}

      {!offline && featured.length > 0 && (
              <Text variant="label" tone="secondary" style={styles.heading}>
                {t('what_your_search_found')}
              </Text>
            )}
            {results.map((result) => (
              <PropertyRow
                key={result.id}
                title={result.title}
                address={result.address}
                /*
                  What it costs to move in, then who is letting it.

                  Not the badge: everything in a filtered list is Verified, so
                  repeating it on every row says nothing. And not the rent —
                  two listings advertising ₦800,000 are not the same price, and
                  a list showing only rent hides the difference somebody opened
                  the app to compare.
                */
                status={
                  /*
                    `typeof`, not `=== null`.

                    The type says `number | null`, and a response from an older
                    server omits the field entirely — which is neither, and
                    which `=== null` waves through into `naira(undefined)` and
                    renders "₦NaN" beside a real address. A price is the one
                    field on this row that must never be guessed at.
                  */
                  typeof result.moveInKobo === 'number'
                    ? `${naira(result.moveInKobo)} · ${result.agentName}`
                    : result.agentName
                }
                tone={result.verified ? 'clear' : 'quiet'}
                onPress={() => onOpen(result.id)}
              />
            ))}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.xl, flexGrow: 1 },
  lede: { marginTop: space.sm, marginBottom: space.md },
  filter: { marginTop: space.md, flexDirection: 'row' },
  rows: { marginTop: space.lg },
  band: { marginTop: space.lg, gap: space.xs },
  heading: { marginBottom: space.sm },
  empty: { marginTop: space.xl },
  row: { marginTop: space.sm },
});
