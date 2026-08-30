import { Console } from './console';

export const metadata = {
  title: 'Review — Keys',
  robots: { index: false, follow: false },
};

/**
 * The review console.
 *
 * Not internal tooling. Keys enters a city at the pace this queue can sustain,
 * so its throughput is a company constraint and this page is designed like
 * something a person sits in front of for six hours — one report at a time,
 * everything needed to decide in one view, and no way to decide without saying
 * why.
 */
export default function Review() {
  return <Console />;
}
