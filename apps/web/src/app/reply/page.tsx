import { api } from '../../lookup';
import { ReplyForm } from './form';

import { categoryWords } from '../../categories';

export const dynamic = 'force-dynamic';

export const metadata = {
  /*
    Its own title, and not indexed.

    Every page inherited the home page's "check a number before you pay", so
    somebody answering an accusation about themselves had that in their tab and
    their history. The URL carries a capability, too — it has no business in a
    search index.
  */
  title: 'Answer a report — Keys',
  robots: { index: false, follow: false },
};

/**
 * The page the reported party lands on, from a link in an SMS.
 *
 * Everything about it assumes the reader is angry and in a hurry, and that
 * this is the first they have heard of any of it. No sign-in, no navigation to
 * get lost in, and the most important sentence — that nothing has been
 * published — sits above the accusation rather than below it.
 */
export default async function Reply({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main>
        <h1>Answering a report</h1>
        <p>
          If a number of yours was reported, we sent a link by SMS to that number.
          Open the link from the message — it is the only way we can tell it is you,
          and we would rather that than ask you to create an account.
        </p>
      </main>
    );
  }

  let report;
  try {
    report = await api().reportAboutMe(token);
  } catch {
    return (
      <main>
        <h1>That link is not valid</h1>
        <p>
          It may have been mistyped. Open it directly from the SMS rather than copying
          part of it.
        </p>
      </main>
    );
  }

  const deadline = new Date(report.replyBy);

  return (
    <main>
      <h1>Someone reported this number</h1>

      {/* First, before the accusation itself. */}
      <div className="verdict">
        <p>
          <strong>Nothing has been published.</strong>
        </p>
        <p className="small">
          No one can see this but you and the person who will review it. It cannot be
          published before{' '}
          <strong>
            {deadline.toLocaleDateString('en-NG', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </strong>
          , and it will not be published at all unless a reviewer upholds it.
        </p>
      </div>

      <p>
        <strong>What was reported:</strong>{' '}
        {categoryWords(report.category)}.
      </p>
      <p className="quiet">{report.description}</p>

      {report.alreadyReplied ? (
        <div className="verdict clear">
          <p>
            <strong>You have already answered this.</strong>
          </p>
          <p className="small">
            Your answer is read alongside the report. There is nothing else you need to
            do.
          </p>
        </div>
      ) : (
        <ReplyForm token={token} />
      )}

      <p className="small quiet">
        We will never tell the person who reported this who you are, and we will never
        tell you who they are.
      </p>
    </main>
  );
}
