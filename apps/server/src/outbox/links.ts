/**
 * Where a texted link points.
 *
 * One constant, because it was two: `agents.controller.ts` had `PUBLIC_SITE`
 * and `authority.controller.ts` had the same origin typed into a template
 * string. Two places to change when this moves is one place somebody misses,
 * and the failure is a text message full of dead links sent to people who have
 * just been accused of something or asked to confirm an agent.
 *
 * The public site rather than the API, because what is being sent is something
 * a person opens on a phone. An https link rather than `keys://` because it has
 * to work for the majority of recipients who do not have the app — see the
 * app's `deepLink` module and the association file the web serves.
 *
 * Hardcoded rather than read from the environment, deliberately: a link that
 * silently points at somebody's laptop is worse than a link that is wrong in a
 * way anybody can see, and there is exactly one deployment.
 */
export const PUBLIC_SITE = 'https://keys.ng';

/** Where somebody answers a report about their number. */
export function replyLink(token: string): string {
  return `${PUBLIC_SITE}/reply?token=${encodeURIComponent(token)}`;
}

/** Where a landlord confirms or withdraws an agent. */
export function authorityLink(challengeId: string): string {
  return `${PUBLIC_SITE}/authority?c=${encodeURIComponent(challengeId)}`;
}
