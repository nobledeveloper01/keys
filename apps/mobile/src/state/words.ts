import type { Phrase } from '@keys/domain';

/**
 * What a refusal says to the person holding the phone.
 *
 * The server answers a refusal with a machine-readable code and a sentence
 * written for a reader. Where the app knows the code it says the thing in the
 * reader's own language; where it does not, it shows the server's English
 * rather than inventing something.
 *
 * The alternative — a generic "something went wrong" — is worse in both
 * directions. It hides the reason from somebody who could act on it, and it
 * hides a new server code from us, because nobody ever reports a message that
 * always says the same thing.
 */
const KNOWN: Readonly<Record<string, Phrase>> = {
  reply_window_open: 'refused_reply_window_open',
  no_evidence: 'refused_no_evidence',
  already_decided: 'refused_already_decided',
};

export function refusalWords(
  code: string | null,
  detail: string,
  t: (phrase: Phrase) => string,
): string {
  const phrase = code ? KNOWN[code] : undefined;
  return phrase ? t(phrase) : detail;
}
