import { absent } from '../src/native/onThisPlatform';
import { captureFor } from '../src/state/capture';

/**
 * ADR-0018: a platform without the camera or the signing key opens the app
 * and says so when asked to capture, rather than failing at import. Jest is
 * such a platform — the registry has no native modules at all — so the
 * assertion is the same one an Android phone makes today.
 */
describe('a module absent from this platform', () => {
  it('is a stand-in whose methods reject with one sentence, not a throw at import', async () => {
    const camera = absent<{ capture(kind: string): Promise<unknown> }>('KeysCapture');
    await expect(camera.capture('photo')).rejects.toThrow('KeysCapture is not on this platform yet.');
  });

  it('turns into a refusal the screen can show, through the caller that already catches', async () => {
    const out = await captureFor('http://127.0.0.1:1', 'token', 'listing', 'photo', 'device');
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.why).toBe('KeysCapture is not on this platform yet.');
  });
});
