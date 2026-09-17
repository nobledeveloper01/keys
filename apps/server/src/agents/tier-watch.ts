import { tierDropNotice, tierDropped, type Tier } from '@keys/domain';

import type { MarketStore } from '../market/market.store';
import type { AgentsStore } from './agents.store';

/**
 * A tier change is an event, and everyone with an open enquiry is told
 * (ADR-0019).
 *
 * Called from every path that computes a tier, with the tier it computed.
 * The store compares it with what it last observed and records the change;
 * when the change is a drop, a message from `keys` goes into every
 * conversation the agent is party to. A rise is recorded and not announced.
 *
 * Nothing here decides a tier, and nothing reads what this wrote to decide
 * one. The tenant is told within one read of the change — the next time
 * anyone looks at the agent — rather than never.
 */
export async function noteTier(
  stores: { agents: AgentsStore; market: MarketStore },
  agentId: string,
  tier: Tier,
  now: Date,
): Promise<void> {
  const change = await stores.agents.observeTier(agentId, tier, now);
  if (!change || !tierDropped(change.from, change.to)) return;
  const open = await stores.market.conversationsForAgent(agentId);
  for (const conversation of open) {
    await stores.market.say({
      conversationId: conversation.id,
      speaker: 'keys',
      body: tierDropNotice(change.from, change.to),
      now,
    });
  }
}
