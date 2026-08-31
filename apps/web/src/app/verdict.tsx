import { api } from '../lookup';

import { categoryWords } from '../categories';

/**
 * The answer, and what it does not mean.
 *
 * Two failure modes are worse than being unhelpful here. Reading a clean result
 * as a guarantee is the first, and it is the one people will do by default, so
 * the page says otherwise in the same breath as the number. The second is
 * treating a report as a conviction, so the wording says who decided and what
 * the other person got to do about it.
 */
export async function Verdict({ phone }: { phone: string }) {
  let result;
  try {
    result = await api().lookup(phone);
  } catch {
    return (
      <div className="verdict">
        <p>
          <strong>We could not check that just now.</strong>
        </p>
        <p className="quiet small">
          Try again in a moment. Do not read this as a clean result — it is not one.
        </p>
      </div>
    );
  }

  const clean = result.upheldReports === 0;

  return (
    <div className={`verdict ${clean ? 'clear' : 'alarm'}`}>
      {/*
        The page's own light takes the verdict's colour.

        A style element rather than a class on `<body>`, because this is a
        server component inside a streamed page — there is no client to reach up
        and set an attribute, and inlining the custom property is one rule the
        browser applies as the markup arrives, with no flash of the wrong
        colour in between.
      */}
      <style>{`body{--wash:var(${clean ? '--clear' : '--alarm'})}`}</style>
      <p className="count">{result.upheldReports}</p>
      <p>
        <strong>
          {clean
            ? 'No upheld reports against this number.'
            : result.upheldReports === 1
              ? 'One upheld report against this number.'
              : `${result.upheldReports} upheld reports against this number.`}
        </strong>
      </p>

      {clean ? (
        <p className="small">
          That is not a clean bill of health. Most scams are never reported, and a
          number used for the first time today has nothing against it either. Pay
          nothing before you have seen the property and met the person.
        </p>
      ) : (
        <>
          <p className="small">
            Each of these was reviewed by a person, and whoever holds this number was
            given seven days to answer before it was published.
          </p>
          <ul className="categories">
            {result.categories.map((c: string) => (
              <li key={c}>{categoryWords(c)}</li>
            ))}
          </ul>
          {!result.everyReportHadRightOfReply && (
            <p className="small quiet">
              At least one of these went unanswered within its seven days.
            </p>
          )}
        </>
      )}
    </div>
  );
}
