import { categoryPhrase, say, type ReportCategory } from '@keys/domain';

/**
 * What a report category is called, in words.
 *
 * Four files each carried their own English map of the same six categories.
 * They had already drifted — the home page said "A property that did not
 * exist" and the report form said "The property did not exist" — which is
 * harmless until the day one of them is missing a category and renders a raw
 * `no_show` at somebody.
 *
 * The domain owns the six sentences, in four languages, because the app needs
 * them translated. The web has no language picker yet, so it asks for English
 * explicitly rather than pretending otherwise; when it grows one, this is the
 * single place that changes.
 */
export function categoryWords(category: string): string {
  return say('en', categoryPhrase(category as ReportCategory));
}
