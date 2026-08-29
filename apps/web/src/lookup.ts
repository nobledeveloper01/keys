import { client, type Lookup } from '@keys/api';

/**
 * The server's own view of the registry.
 *
 * Built per request rather than at module scope so that the base URL is read
 * from the environment of the process actually serving, not baked in at build
 * time by whichever machine ran `next build`.
 */
export function api() {
  const baseUrl = process.env.KEYS_API_URL;
  if (!baseUrl) {
    throw new Error(
      'KEYS_API_URL is not set. The web surface has no fallback to localhost: ' +
        'a production build silently pointing at a developer machine is worse than one that will not start.',
    );
  }
  return client({ baseUrl });
}

export type { Lookup };

/**
 * Normalises what a person types into what the registry stores.
 *
 * People write 0803, +234 803, 234-803 and 0803 123 4567 for the same number,
 * and a registry that treats those as four numbers answers "nothing found"
 * four times about a number it holds.
 */
export function normalise(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+234') && digits.length === 14) return digits;
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (/^[789]\d{9}$/.test(digits)) return `+234${digits}`;
  return null;
}
