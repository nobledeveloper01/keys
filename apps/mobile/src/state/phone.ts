/**
 * Normalises what a person types into what the registry stores.
 *
 * People write 0803, +234 803, 234-803 and 0803 123 4567 for the same number,
 * and a registry that treats those as four numbers answers "nothing found"
 * four times about a number it holds — which on this product is not an empty
 * result, it is a false all-clear.
 *
 * The web surface has the same function, and it is deliberately not shared
 * through `@keys/domain`: this is a fact about how Nigerians write phone
 * numbers into a text field, not a rule about reports, and the domain package
 * is the one place in this codebase that must not fill up with everything.
 */
export function normalise(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+234') && digits.length === 14) return digits;
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (/^[789]\d{9}$/.test(digits)) return `+234${digits}`;
  return null;
}
