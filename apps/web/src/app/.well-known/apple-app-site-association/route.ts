import { NextResponse } from 'next/server';

/**
 * What tells iOS that keys.ng links belong to the Keys app.
 *
 * The one link in the one SMS has to work for everybody. Somebody who has the
 * app should land in it; somebody who does not should land on the web page
 * that does the same job. A `keys://` link would be a dead end for the second
 * group, and the people receiving these have just been told they are accused
 * of something — sending them a link that does nothing is not a small failure.
 *
 * ## Two things that are easy to get wrong and silent when you do
 *
 * **No file extension, and `application/json`.** Apple fetches this path
 * exactly; a `.json` suffix or a `text/plain` content type and the association
 * simply does not happen, with no error anywhere.
 *
 * **Only the paths that are actually deep links.** `*` would claim every URL
 * on the domain, so the home page and the review console would try to open the
 * app too — including for reviewers, who work at a desk and do not have it.
 */
/**
 * The Apple team id, which is not a secret and is not a constant either.
 *
 * It was `TEAMID.ng.keys.app` for about a minute — a placeholder that would
 * have served a syntactically perfect file describing an app that does not
 * exist, and universal links would have silently not worked with nothing
 * anywhere saying why. The same reasoning as `KEYS_API_URL`: refuse to answer
 * rather than answer wrongly.
 */
const TEAM = process.env.KEYS_APPLE_TEAM_ID;

export function GET() {
  if (!TEAM) {
    return NextResponse.json(
      {
        detail:
          'KEYS_APPLE_TEAM_ID is not set. Universal links are off until it is, ' +
          'and this file refuses to describe an app id it does not know.',
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: [`${TEAM}.ng.keys.app`],
            components: [
              // The two links Keys sends by SMS, and nothing else.
              { '/': '/reply', comment: 'Answering a report about your number' },
              { '/': '/authority', comment: 'Confirming or withdrawing an agent' },
            ],
          },
        ],
      },
    },
    {
      headers: {
        'content-type': 'application/json',
        // Apple caches this. A day is short enough that adding a path is not a
        // week-long wait, and long enough that it is not fetched on every open.
        'cache-control': 'public, max-age=86400',
      },
    },
  );
}
