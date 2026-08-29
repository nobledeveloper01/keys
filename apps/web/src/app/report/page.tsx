import { ReportForm } from './form';

export const metadata = {
  title: 'Report a number — Keys',
  description: 'Report a rental scam in Nigeria. Reviewed by a person before anything is published.',
};

/**
 * Reporting, with the consequences stated before the form rather than after it.
 *
 * A person filling this in is angry and out of pocket, and the thing they are
 * about to do can end someone's livelihood if it is wrong. The page says what
 * happens next, in full, before it asks for anything.
 */
export default function Report() {
  return (
    <main>
      <h1>Report a number</h1>

      <div className="verdict">
        <p>
          <strong>What happens after you send this</strong>
        </p>
        <ol className="small" style={{ paddingLeft: '1.2rem', margin: '0.5rem 0 0' }}>
          <li>A person reads it. Nothing is automatic and nothing appears straight away.</li>
          <li>
            Whoever holds that number is told what was said, and has seven days to
            answer.
          </li>
          <li>
            It is published only if a reviewer upholds it, and only for two years.
          </li>
          <li>
            We never tell them who reported it.
          </li>
        </ol>
      </div>

      <p className="small quiet">
        Report what happened to you. A report made to damage a competitor is the thing
        this registry exists to be worth nothing to.
      </p>

      <ReportForm />
    </main>
  );
}
