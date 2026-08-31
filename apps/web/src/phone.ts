/**
 * Normalises what a person types into what the registry stores.
 *
 * People write 0803, +234 803, 234-803 and 0803 123 4567 for the same number,
 * and a registry that treats those as four numbers answers "nothing found"
 * four times about a number it holds — which on this product is not an empty
 * result, it is a false all-clear.
 *
 * Its own module, not part of `lookup.ts`, because the report form runs in the
 * browser and `lookup.ts` also builds the API client from `KEYS_API_URL`.
 * Importing this from there would pull a server-only module — and a variable
 * Next does not inline for the client — into the browser bundle to get one
 * regular expression.
 *
 * The app has its own copy in `state/phone.ts` for the same reason it is not in
 * `@keys/domain`: this is a fact about how Nigerians write phone numbers into a
 * text field, not a rule about reports.
 */
export function normalise(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+234') && digits.length === 14) return digits;
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (/^[789]\d{9}$/.test(digits)) return `+234${digits}`;
  return null;
}
