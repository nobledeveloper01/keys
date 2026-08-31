import { cookies } from 'next/headers';

import { api } from '../../lookup';
import { AgentDesk, SignUp } from './desk';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your agent account — Keys',
  robots: { index: false, follow: false },
};

/**
 * The agent's own page.
 *
 * Built on the web before the app, the same way report and reply were, and for
 * the same reason: the web surface is where the gaps show. Everything an agent
 * does here is a desk task — typing a landlord's number, drafting a listing —
 * and none of it needs a camera until the identity check lands.
 *
 * The session is read here, on the server, out of an httpOnly cookie. Nothing
 * on this page has the token or can obtain it.
 */
export default async function Agent() {
  const jar = await cookies();
  const token = jar.get('keys_agent')?.value;

  if (!token) {
    return (
      <main>
        <h1>Your agent account</h1>
        <p>
          An account is a name and a number. It proves nothing on its own — and
          saying so here rather than after somebody has signed up is the point.
        </p>
        <p className="small quiet">
          What proves something is an ID check, and a landlord confirming you may
          let a specific property. Both come after this, and Keys shows tenants
          which of them you have done.
        </p>
        <SignUp />
      </main>
    );
  }

  let profile;
  let listings;
  try {
    const asAgent = api({ agentToken: token });
    [profile, listings] = await Promise.all([
      asAgent.agent.me(),
      asAgent.agent.listings(),
    ]);
  } catch {
    /*
      A dead session, not an error page.

      The cookie outlives a database reset, a token rotation, and an account a
      reviewer has removed. Showing "something went wrong" to somebody whose
      session simply ended sends them to support for a problem one button
      fixes.
    */
    return (
      <main>
        <h1>You are signed out</h1>
        <p>That session is no longer valid. Sign up again, or use another device where you are still signed in.</p>
        <SignUp />
      </main>
    );
  }

  return <AgentDesk profile={profile} listings={listings} />;
}
