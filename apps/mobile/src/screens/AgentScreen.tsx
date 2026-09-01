import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type AgentProfile, type Listing } from '@keys/api';
import { tierPhrase } from '@keys/domain';

import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Glass } from '../components/Glass';
import { PropertyRow } from '../components/PropertyRow';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useSession } from '../state/session';
import { useQuery } from '../state/server';
import { PropertyScreen } from './PropertyScreen';

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
export function AgentScreen({
  baseUrl,
  onOpenEnquiry,
}: {
  baseUrl: string;
  onOpenEnquiry: (conversationId: string) => void;
}) {
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

  /*
    Which property is open, and whether one is being added.

    Two levels, not a router. There is a list and a thing in the list; phase 4
    brings search results and listing pages, and that is when a back stack you
    can push onto starts earning a dependency.
  */
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
  const open = answer?.listings.find((listing) => listing.id === openId) ?? null;

  if (adding) {
    return (
      <AddProperty
        baseUrl={baseUrl}
        token={token}
        onDone={(said) => {
          setAdding(false);
          again(said);
        }}
        onCancel={() => setAdding(false)}
      />
    );
  }

  if (open) {
    return (
      <PropertyScreen
        baseUrl={baseUrl}
        token={token}
        listing={open}
        onBack={() => setOpenId(null)}
        onChanged={again}
        onOpenEnquiry={onOpenEnquiry}
      />
    );
  }

  /*
    An id that no longer matches anything closes the screen rather than
    showing nothing. A listing can vanish between renders — a reviewer
    withdrew the agent's identity, or the session ended — and a detail screen
    for something that is gone is a dead end with a back button.
  */
  if (openId !== null && answer !== null) setOpenId(null);

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

          <Properties
            listings={answer.listings}
            onOpen={(listing) => setOpenId(listing.id)}
            onAdd={() => setAdding(true)}
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
            else setProblem(result.failure.kind === 'refused' ? result.failure.detail : t('no_signal_nothing_sent'));
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

/**
 * The properties, as a list you can scan.
 *
 * This was every action for every listing rendered inline — three properties
 * meant fifteen buttons in one scroll, and no way to tell at a glance which
 * one needed attention. A row now says what it is, where it is, and where it
 * stands; everything you can do to it is on its own screen.
 */
function Properties({
  listings,
  onOpen,
  onAdd,
}: {
  listings: Listing[];
  onOpen: (listing: Listing) => void;
  onAdd: () => void;
}) {
  const { t } = useLanguage();

  return (
    <View style={styles.section}>
      <Text variant="title">{t('your_properties')}</Text>

      {listings.length === 0 ? (
        <Text variant="body" tone="secondary" style={styles.row}>
          {t('no_properties_yet')}
        </Text>
      ) : (
        <View style={styles.rows}>
          {listings.map((listing) => {
            const left = listing.stillNeeded.length;
            /*
              One short status, not a sentence.

              Published and complete is the only "Verified"; published with
              work outstanding says how much, because that is the number an
              agent can act on. A draft says draft, because whether it is
              public is the first thing they want to know.
            */
            const status =
              listing.publishedAt === null
                ? t('a_draft')
                : left === 0
                  ? t('is_verified')
                  : `${left} ${t('steps_left')}`;
            const tone =
              listing.publishedAt === null
                ? ('quiet' as const)
                : left === 0
                  ? ('clear' as const)
                  : ('caution' as const);

            return (
              <PropertyRow
                key={listing.id}
                title={listing.title}
                address={listing.propertyId}
                status={status}
                tone={tone}
                onPress={() => onOpen(listing)}
              />
            );
          })}
        </View>
      )}

      <Button label={t('add_a_property')} onPress={onAdd} />
    </View>
  );
}

/**
 * Adding a property, behind a button rather than always on the screen.
 *
 * The draft form used to sit permanently open under the listings — two empty
 * fields and a disabled button at the bottom of every visit, whether or not
 * anybody was adding anything.
 */
function AddProperty({
  baseUrl,
  token,
  onDone,
  onCancel,
}: {
  baseUrl: string;
  token: string;
  onDone: (said: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Button label={t('go_back')} onPress={onCancel} quiet />

      <Text variant="headline" style={styles.title}>
        {t('add_a_property')}
      </Text>
      <Text variant="body" tone="secondary" style={styles.row}>
        {t('add_property_help')}
      </Text>

      {problem !== null && (
        <Text variant="body" tone="alarm" accessibilityRole="alert" style={styles.row}>
          {problem}
        </Text>
      )}

      <Field label={t('what_you_are_letting')} value={title} onChange={setTitle} />
      <Field label={t('which_property')} value={propertyId} onChange={setPropertyId} />

      <Button
        label={t('save_draft')}
        disabled={busy || title.trim().length < 3 || propertyId.trim().length < 3}
        onPress={() => {
          setBusy(true);
          setProblem(null);
          void attempt(() =>
            client({ baseUrl, agentToken: token }).agent.draft(propertyId.trim(), title.trim()),
          ).then((result) => {
            setBusy(false);
            if (result.ok) onDone(t('drafted'));
            else
              setProblem(
                result.failure.kind === 'refused'
                  ? result.failure.detail
                  : t('no_signal_nothing_sent'),
              );
          });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.xl, gap: space.sm, flexGrow: 1 },
  rows: { marginTop: space.md },
  title: { marginTop: space.md },
  lede: { marginTop: space.sm, marginBottom: space.md },
  card: { marginTop: space.md },
  section: { marginTop: space.xl },
  row: { marginTop: space.sm },
  needed: { marginTop: space.xs },
  problem: { marginTop: space.md },
  out: { marginTop: space.xl },
});
