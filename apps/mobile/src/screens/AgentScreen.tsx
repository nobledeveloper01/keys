import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type AgentProfile, type Listing } from '@keys/api';
import { conditionPhrase, tierPhrase } from '@keys/domain';

import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Glass } from '../components/Glass';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';
import { useSession } from '../state/session';
import { useQuery } from '../state/server';

/**
 * The agent's own screen.
 *
 * The web has had this for a phase; the app is where the people who use it
 * actually are. Nothing here is a port — the web page is a desk, this is a
 * phone held in one hand at a property, so the order is different: standing
 * first, then the one action that improves it, then the listings.
 *
 * There is no ID check on this screen and there cannot be until a vendor is
 * chosen. Rather than hide that behind a step that would not help, the screen
 * says it.
 */
export function AgentScreen({ baseUrl }: { baseUrl: string }) {
  const { t } = useLanguage();
  const { token, signIn, signOut } = useSession();

  const [nonce, setNonce] = useState(0);

  /*
    The notice lives here, above the thing that causes it.

    It used to live inside `AskALandlord`, and it was never once seen: setting
    it also asked for a refresh, the refresh put the query back into `loading`,
    and everything below unmounted — taking the message with it. The agent got
    two cleared fields and no confirmation that anything had happened, which on
    a phone reads as a button that did not work.

    A notice about an action has to outlive the component that performed it.
  */
  const [notice, setNotice] = useState<string | null>(null);
  const again = useCallback((said: string) => {
    setNotice(said);
    setNonce((n) => n + 1);
  }, []);

  const { query, refresh } = useQuery<{
    profile: AgentProfile;
    listings: Listing[];
  } | null>(
    () =>
      token
        ? attempt(async () => {
            const api = client({ baseUrl, agentToken: token });
            const [profile, listings] = await Promise.all([
              api.agent.me(),
              api.agent.listings(),
            ]);
            return { profile, listings };
          })
        : Promise.resolve({ ok: true as const, value: null }),
    [token, baseUrl, nonce],
  );

  if (!token) return <SignUp baseUrl={baseUrl} onSignedIn={signIn} />;

  /*
    A dead session is a signed-out screen, not an error.

    The stored token outlives a database reset and an account a reviewer has
    removed. Showing "something went wrong" to somebody whose session simply
    ended sends them looking for a fault that is not there.
  */
  if (query.state === 'refused' && query.failure.status === 401) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text variant="headline">{t('your_account')}</Text>
        <Text variant="body" tone="secondary" style={styles.lede}>
          {t('session_ended')}
        </Text>
        <Button label={t('open_an_account')} onPress={signOut} />
      </ScrollView>
    );
  }

  const answer = query.state === 'ready' ? query.value : null;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text variant="headline">{t('your_account')}</Text>

      {notice !== null && (
        <Text variant="body" tone="clear" style={styles.row}>
          {notice}
        </Text>
      )}

      <Unready query={query} onRetry={refresh} />

      {answer && (
        <>
          <Standing profile={answer.profile} />
          {answer.profile.tier === 'unverified' && (
            <Glass style={styles.card}>
              <Text variant="body">{t('id_check_not_available')}</Text>
            </Glass>
          )}

          <AskALandlord baseUrl={baseUrl} token={token} onDone={again} />
          <Listings
            baseUrl={baseUrl}
            token={token}
            listings={answer.listings}
            onDone={again}
          />

          <View style={styles.out}>
            <Button label={t('sign_out')} onPress={signOut} quiet />
          </View>
        </>
      )}
    </ScrollView>
  );
}

/**
 * Opening an account, with what it is worth said before the fields rather than
 * after them.
 */
function SignUp({
  baseUrl,
  onSignedIn,
}: {
  baseUrl: string;
  onSignedIn: (token: string) => void;
}) {
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text variant="headline">{t('your_account')}</Text>
      <Text variant="body" tone="secondary" style={styles.lede}>
        {t('account_proves_nothing')}
      </Text>

      {problem !== null && (
        <Text variant="body" tone="alarm" accessibilityRole="alert" style={styles.problem}>
          {problem}
        </Text>
      )}

      <Field
        label={t('your_name_label')}
        value={displayName}
        onChange={setDisplayName}
        autoComplete="name"
      />
      <Field
        label={t('your_number_label')}
        value={phone}
        onChange={setPhone}
        keyboard="phone-pad"
        autoComplete="tel"
        help={t('check_a_number_help')}
      />

      <Button
        label={t('open_an_account')}
        disabled={busy || displayName.trim().length < 2 || phone.trim().length < 7}
        onPress={() => {
          setBusy(true);
          setProblem(null);
          void attempt(() =>
            client({ baseUrl }).signUp(displayName.trim(), phone.trim()),
          ).then((result) => {
            setBusy(false);
            if (result.ok) onSignedIn(result.value.token);
            else setProblem(result.failure.kind === 'refused' ? result.failure.detail : t('no_signal_saved_here'));
          });
        }}
      />
    </ScrollView>
  );
}

/** The tenant's view of this agent, shown to the agent in the tenant's words. */
function Standing({ profile }: { profile: AgentProfile }) {
  const { t } = useLanguage();

  return (
    <Glass style={styles.card}>
      <Text variant="label" tone="secondary">
        {t('what_tenants_see')}
      </Text>
      <Text variant="title">{profile.displayName}</Text>
      {/*
        Quoted, because these sentences are written for a tenant reading about
        somebody else. Unquoted under the agent's own name, "nothing about this
        person has been checked" reads as the app addressing them in the third
        person. Rewriting it in the second person would mean two versions of
        every tier sentence, and the whole value of this panel is that it shows
        the agent the *exact* words a tenant sees.
      */}
      <Text variant="body" style={styles.row}>
        {`\u201C${t(tierPhrase(profile.tier))}\u201D`}
      </Text>
      {/*
        One is a different sentence, not the same sentence with a 1 in front.

        This read "1 properties a landlord confirmed". The phrase tables carry
        no interpolation on purpose — word order differs across these four
        languages — so a count beside a plural noun is the only shape
        available, and English is the language that punishes it. Hausa, Yoruba
        and Igbo do not inflect this noun, which is why their singular and
        plural strings are the same sentence.
      */}
      {profile.confirmedProperties === 1 && (
        <Text variant="label" tone="secondary" style={styles.row}>
          {t('one_property_confirmed')}
        </Text>
      )}
      {profile.confirmedProperties > 1 && (
        <Text variant="label" tone="secondary" style={styles.row}>
          {`${profile.confirmedProperties} ${t('properties_confirmed')}`}
        </Text>
      )}
      {profile.upheldReports > 0 && (
        <Text variant="body" tone="alarm" style={styles.row}>
          {profile.upheldReports === 1 ? t('one_upheld_report') : `${profile.upheldReports} ${t('upheld_reports')}`}
        </Text>
      )}
    </Glass>
  );
}

function AskALandlord({
  baseUrl,
  token,
  onDone,
}: {
  baseUrl: string;
  token: string;
  onDone: (said: string) => void;
}) {
  const { t } = useLanguage();
  const [propertyId, setPropertyId] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <View style={styles.section}>
      <Text variant="title">{t('ask_a_landlord')}</Text>
      <Text variant="body" tone="secondary" style={styles.row}>
        {t('ask_a_landlord_help')}
      </Text>

      {problem !== null && (
        <Text variant="body" tone="alarm" accessibilityRole="alert" style={styles.row}>
          {problem}
        </Text>
      )}

      <Field label={t('which_property')} value={propertyId} onChange={setPropertyId} />
      <Field
        label={t('landlord_number')}
        value={landlordPhone}
        onChange={setLandlordPhone}
        keyboard="phone-pad"
      />

      <Button
        label={t('ask_them')}
        disabled={busy || propertyId.trim().length < 3 || landlordPhone.trim().length < 7}
        onPress={() => {
          setBusy(true);
          setProblem(null);
          void attempt(() =>
            client({ baseUrl, agentToken: token }).agent.askLandlord(
              propertyId.trim(),
              landlordPhone.trim(),
            ),
          ).then((result) => {
            setBusy(false);
            if (result.ok) {
              setPropertyId('');
              setLandlordPhone('');
              onDone(t('text_queued'));
            } else {
              setProblem(
                result.failure.kind === 'refused'
                  ? result.failure.detail
                  : t('no_signal_saved_here'),
              );
            }
          });
        }}
      />
    </View>
  );
}

function Listings({
  baseUrl,
  token,
  listings,
  onDone,
}: {
  baseUrl: string;
  token: string;
  listings: Listing[];
  onDone: (said: string) => void;
}) {
  const { t } = useLanguage();
  const colours = useColours();
  const [title, setTitle] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  function refuse(detail: string | null) {
    setProblem(detail ?? t('no_signal_saved_here'));
  }

  return (
    <View style={styles.section}>
      <Text variant="title">{t('your_listings')}</Text>

      {problem !== null && (
        <Text variant="body" tone="alarm" accessibilityRole="alert" style={styles.row}>
          {problem}
        </Text>
      )}

      {listings.length === 0 && (
        <Text variant="body" tone="secondary" style={styles.row}>
          {t('no_listings_yet')}
        </Text>
      )}

      {listings.map((listing) => {
        /*
          Publication and the badge are different questions.

          Two of the seven conditions gate publishing at all — a live ID check
          and a landlord confirmation on this property. The other five gate the
          Verified badge, and a listing can be public without it. Offering a
          button the server will refuse makes a working product look broken.
        */
        const cannotPublish = listing.stillNeeded.some(
          (n) => n.condition === 'agent_identity' || n.condition === 'landlord_authority',
        );

        return (
          <Glass key={listing.id} style={styles.card}>
            <Text variant="title">{listing.title}</Text>
            <Text variant="label" tone="secondary" style={styles.row}>
              {listing.propertyId}
            </Text>

            {listing.stillNeeded.length === 0 ? (
              <Text variant="body" tone="clear" style={styles.row}>
                {t('listing_verified')}
              </Text>
            ) : (
              <>
                <Text variant="label" tone="secondary" style={styles.row}>
                  {t('not_verified_yet')}
                </Text>
                {listing.stillNeeded.map((needed) => (
                  <Text key={needed.condition} variant="body" style={styles.needed}>
                    {`·  ${t(conditionPhrase(needed.condition))}`}
                  </Text>
                ))}
              </>
            )}

            {/*
              The confirmation, on published listings only.

              A draft nobody can see does not go stale, and asking an agent to
              keep confirming something private is asking for a habit they will
              form and then apply without reading — which is exactly what makes
              a confirmation worthless.
            */}
            {listing.publishedAt !== null && (
              <>
                <Text variant="label" tone="secondary" style={styles.row}>
                  {t('confirm_every_fortnight')}
                </Text>
                <Button
                  label={t('still_available')}
                  disabled={busy === `confirm-${listing.id}`}
                  onPress={() => {
                    setBusy(`confirm-${listing.id}`);
                    setProblem(null);
                    void attempt(() =>
                      client({ baseUrl, agentToken: token }).agent.confirmStillAvailable(
                        listing.id,
                      ),
                    ).then((result) => {
                      setBusy(null);
                      if (result.ok) onDone(t('confirmed_today'));
                      else
                        refuse(
                          result.failure.kind === 'refused' ? result.failure.detail : null,
                        );
                    });
                  }}
                />
              </>
            )}

            {listing.publishedAt === null ? (
              <>
                <Text variant="label" tone="secondary" style={styles.row}>
                  {t('draft_private')}
                </Text>
                <Button
                  label={t('publish_listing')}
                  disabled={busy === listing.id || cannotPublish}
                  onPress={() => {
                    setBusy(listing.id);
                    setProblem(null);
                    void attempt(() =>
                      client({ baseUrl, agentToken: token }).agent.publish(listing.id),
                    ).then((result) => {
                      setBusy(null);
                      if (result.ok) onDone(t('published_now'));
                      else refuse(result.failure.kind === 'refused' ? result.failure.detail : null);
                    });
                  }}
                />
              </>
            ) : (
              <Text variant="body" style={[styles.row, { color: colours.clear }]}>
                {t('published_now')}
              </Text>
            )}
          </Glass>
        );
      })}

      <Text variant="title" style={styles.section}>
        {t('draft_another')}
      </Text>
      <Field label={t('what_you_are_letting')} value={title} onChange={setTitle} />
      <Field label={t('which_property')} value={propertyId} onChange={setPropertyId} />
      <Button
        label={t('save_draft')}
        disabled={busy === 'draft' || title.trim().length < 3 || propertyId.trim().length < 3}
        onPress={() => {
          setBusy('draft');
          setProblem(null);
          void attempt(() =>
            client({ baseUrl, agentToken: token }).agent.draft(propertyId.trim(), title.trim()),
          ).then((result) => {
            setBusy(null);
            if (result.ok) {
              setTitle('');
              setPropertyId('');
              onDone(t('drafted'));
            } else {
              refuse(result.failure.kind === 'refused' ? result.failure.detail : null);
            }
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.xl, gap: space.sm, flexGrow: 1 },
  lede: { marginTop: space.sm, marginBottom: space.md },
  card: { marginTop: space.md },
  section: { marginTop: space.xl },
  row: { marginTop: space.sm },
  needed: { marginTop: space.xs },
  problem: { marginTop: space.md },
  out: { marginTop: space.xl },
});
