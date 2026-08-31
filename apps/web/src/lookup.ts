import { client, type Lookup } from '@keys/api';

/**
 * The server's own view of the registry.
 *
 * Built per request rather than at module scope so that the base URL is read
 * from the environment of the process actually serving, not baked in at build
 * time by whichever machine ran `next build`.
 */
export function api(options: { agentToken?: string } = {}) {
  const baseUrl = process.env.KEYS_API_URL;
  if (!baseUrl) {
    throw new Error(
      'KEYS_API_URL is not set. The web surface has no fallback to localhost: ' +
        'a production build silently pointing at a developer machine is worse than one that will not start.',
    );
  }
  // The agent's token arrives from an httpOnly cookie read in a route handler,
  // never from a page. Nothing that runs in a browser can construct this.
  return client({ baseUrl, ...options });
}

export type { Lookup };

// Re-exported so server pages have one import site; the module itself carries
// no server-only code, so a client component can import it directly.
export { normalise } from './phone';

