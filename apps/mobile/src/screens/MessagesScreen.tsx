import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type Conversation } from '@keys/api';

import { Empty } from '../components/Empty';
import { PropertyRow } from '../components/PropertyRow';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';
import { useTenant } from '../state/tenant';

/**
 * Who you are talking to about what.
 *
 * A list of rows and nothing else. Everything you can *do* — say something,
 * share your number, ask to see the place, say what happened when you went —
 * belongs to one conversation, and lives on that conversation's screen.
 *
 * That is the same lesson the agent's account screen taught: an action that
 * has to ask *which one* is an action on the wrong screen.
 */
export function MessagesScreen({
  baseUrl,
  onOpen,
}: {
  baseUrl: string;
  onOpen: (id: string) => void;
}) {
  const { t } = useLanguage();
  const { token, ready } = useTenant();

  const { query, refresh } = useQuery<Conversation[]>(
    () =>
      token === null
        ? Promise.resolve({ ok: true as const, value: [] })
        : attempt(() => client({ baseUrl, tenantToken: token }).tenant.conversations()),
    [baseUrl, token],
  );

  const conversations =
    token === null ? [] : query.state === 'ready' ? query.value : null;

  if (!ready) return <Unready query={{ state: 'loading' }} onRetry={() => {}} />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text variant="headline">{t('tab_messages')}</Text>
      <Text variant="body" tone="secondary" style={styles.lede}>
        {t('messages_lede')}
      </Text>

      {/*
        No account yet is not an error and not a sign-in wall.

        A tenant gets an account by messaging somebody, from the listing page,
        where they already know what they want to ask about. A Messages tab
        that demanded a sign-up first would ask for a phone number before
        giving anybody a reason to give one.
      */}
      {token !== null && <Unready query={query} onRetry={refresh} />}

      {conversations !== null &&
        (conversations.length === 0 ? (
          <Empty icon="message" title={t('no_messages_yet')} detail={t('no_messages_yet_help')} />
        ) : (
          <View style={styles.rows}>
            {conversations.map((conversation) => (
              <PropertyRow
                key={conversation.id}
                title={conversation.listingTitle}
                address={conversation.otherPartyName}
                /*
                  The status line says where the *number* stands, because that
                  is the only state a conversation has that a person cannot
                  see by opening it. "3 messages" is a count nobody is waiting
                  on; "they shared their number" is news.
                */
                status={statusFor(conversation.exchange, t)}
                tone={conversation.exchange === 'exchanged' ? 'clear' : 'quiet'}
                onPress={() => onOpen(conversation.id)}
              />
            ))}
          </View>
        ))}
    </ScrollView>
  );
}

function statusFor(
  exchange: string,
  t: (key: 'exchange_none' | 'exchange_you_offered' | 'exchange_they_offered' | 'exchange_done') => string,
): string {
  switch (exchange) {
    case 'exchanged':
      return t('exchange_done');
    case 'tenant_offered':
      return t('exchange_you_offered');
    case 'agent_offered':
      return t('exchange_they_offered');
    default:
      return t('exchange_none');
  }
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.sm },
  lede: { marginBottom: space.sm },
  rows: { marginTop: space.sm },
});
