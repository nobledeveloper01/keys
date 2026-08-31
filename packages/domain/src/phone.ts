/**
 * Normalises what a person types into the one form everything stores.
 *
 * People write 0803, +234 803, 234-803 and 0803 123 4567 for the same number,
 * and a registry that treats those as four numbers answers "nothing found"
 * four times about a number it holds — which on this product is not an empty
 * result, it is a false all-clear.
 *
 * ## Why this is in the domain now
 *
 * It was not. There were two byte-identical copies, one in the app and one in
 * the web surface, and both docstrings carried the same justification: *this
 * is a fact about how Nigerians write phone numbers into a text field, not a
 * rule about reports.* That was a reasonable line to hold while only the two
 * clients used it.
 *
 * It stopped being reasonable the moment the server began hashing phone
 * numbers of its own. Agent sign-up stored whatever string was typed, tenant
 * lookup normalised first, and the same number produced two different hashes —
 * so an agent who signed up as `08099887766` was invisible to a tenant
 * searching for `+2348099887766`. The tier was right, the evidence was right,
 * and the panel simply did not appear.
 *
 * Nothing in this product may depend on every caller remembering to normalise.
 * `hashPhone` calls this, so a number cannot be stored in a second form.
 */
export function normalise(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+234') && digits.length === 14) return digits;
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (/^[789]\d{9}$/.test(digits)) return `+234${digits}`;
  return null;
}

/**
 * The form a number is stored and compared in.
 *
 * Anything that normalises becomes E.164. Anything that does not — a number
 * from outside Nigeria, or a typo — is trimmed and kept as it was rather than
 * rejected here: refusing it is a decision for the route that took it, and a
 * hashing function that throws would turn a bad input into a 500.
 */
export function canonicalPhone(input: string): string {
  return normalise(input) ?? input.trim();
}
