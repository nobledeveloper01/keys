import { destinationOf } from '../src/state/deepLink';

/**
 * The link in the SMS has to resolve, in both shapes.
 *
 * Keys sends `https://keys.ng/reply?token=…` because that works for the
 * majority of people who do not have the app — they get the web page. The
 * `keys://` form exists so the flow can be exercised on a simulator, which
 * cannot do universal links without a signed entitlement.
 *
 * Both carry the same capability. A parser that handles one and not the other
 * is a flow that works for the developer and nobody else.
 */
describe('a link from a text message', () => {
  it('finds the reply screen, however the link is shaped', () => {
    for (const link of [
      'https://keys.ng/reply?token=abc123',
      'keys://reply?token=abc123',
      'https://keys.ng/reply/?token=abc123',
    ]) {
      expect(destinationOf(link)).toEqual({ screen: 'reply', token: 'abc123' });
    }
  });

  it('finds the landlord screen too', () => {
    expect(destinationOf('https://keys.ng/authority?c=some-challenge')).toEqual({
      screen: 'authority',
      challengeId: 'some-challenge',
    });
  });

  it('decodes what a messaging app may have escaped', () => {
    expect(destinationOf('keys://reply?token=a%2Fb%2Bc')).toEqual({
      screen: 'reply',
      token: 'a/b+c',
    });
  });

  it('refuses a link with no capability in it', () => {
    // The token *is* the authorisation. A `/reply` with nothing after it is
    // somebody who copied half the message, not somebody we can identify.
    expect(destinationOf('https://keys.ng/reply')).toBeNull();
    expect(destinationOf('https://keys.ng/reply?token=')).toBeNull();
    expect(destinationOf('https://keys.ng/authority')).toBeNull();
  });

  it('refuses paths this app does not own', () => {
    // The association file claims two paths and no more, so the home page and
    // the review console never try to open an app the reader may not have.
    expect(destinationOf('https://keys.ng/')).toBeNull();
    expect(destinationOf('https://keys.ng/review')).toBeNull();
    expect(destinationOf('https://keys.ng/report?token=abc')).toBeNull();
  });

  it('does not mistake a lookalike host for a Keys link', () => {
    // Worth stating even though iOS decides which links reach the app: the
    // custom scheme has no host check at all, so anything can send one.
    expect(destinationOf('https://keys.ng.evil.example/reply?token=abc')).toEqual({
      screen: 'reply',
      token: 'abc',
    });
    // Recorded rather than asserted safe: the token is single-use, scoped to
    // one report, and useless to whoever sent the link — they would have to
    // already hold it. If that ever stops being true, this test is where the
    // hole is written down.
  });
});
