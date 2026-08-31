/**
 * What a place actually costs to move into.
 *
 * The single most common complaint about Nigerian rentals after the flat not
 * existing: an advert says ₦800,000 a year, and by the time somebody has keys
 * they have paid ₦1,100,000. The difference is not hidden in the sense of being
 * secret — it is agency fee, agreement fee, caution deposit, service charge —
 * it is hidden in the sense that no listing anywhere adds it up.
 *
 * `undisclosed_fees` is already a report category in this product. This is the
 * same problem answered before it happens rather than after: a listing that
 * cannot state its costs cannot be Verified, and one that states them has them
 * totalled for the reader.
 *
 * ## Kobo, not naira
 *
 * Every amount here is an integer number of kobo. Floating-point money is
 * wrong in a way that surfaces months later as a reconciliation nobody can
 * close, and 10% of ₦800,000 is not a number that survives a `double`
 * unscathed. Nothing in this module divides.
 */

export interface Costs {
  /** The rent itself, for the period advertised. Almost always a year here. */
  readonly annualRentKobo: number;
  /**
   * The agent's fee. Customarily ten per cent of the rent, and customarily not
   * mentioned until somebody has seen the flat and wants it.
   */
  readonly agencyFeeKobo: number;
  /** Preparing the tenancy agreement. Another ten per cent, by custom. */
  readonly legalFeeKobo: number;
  /**
   * Refundable at the end, if nothing is deducted — which is a large "if", and
   * the reason it is totalled separately rather than folded in.
   */
  readonly cautionDepositKobo: number;
  /** Service charge, where a building has one. Recurring, not one-off. */
  readonly serviceChargeKobo: number;
}

/*
  There is deliberately no `NO_COSTS` constant here.

  An all-zero `Costs` reads as "costs not stated" and means the opposite —
  "everything is free, rent included". Absence is `null`, and the two must not
  have a shorthand that blurs them, because the entire condition rests on
  silence and zero being different answers.
*/

/**
 * What somebody hands over before they get keys.
 *
 * Everything, deposit included. The deposit is refundable in principle and in
 * cash terms it is money that has to exist on the day — a tenant who budgets
 * for rent plus fees and is asked for a deposit as well does not move in.
 */
export function moveInCostKobo(costs: Costs): number {
  return (
    costs.annualRentKobo +
    costs.agencyFeeKobo +
    costs.legalFeeKobo +
    costs.cautionDepositKobo +
    costs.serviceChargeKobo
  );
}

/**
 * What is on top of the advertised rent.
 *
 * The number that surprises people, on its own, because "₦800,000" and
 * "₦1,100,000 to move in" are both true and only one of them is ever
 * advertised.
 */
export function extrasKobo(costs: Costs): number {
  return moveInCostKobo(costs) - costs.annualRentKobo;
}

/**
 * How much of a fee is unusual, as a percentage of rent.
 *
 * Ten per cent each for agency and agreement is the custom. It is not a law
 * and Keys does not enforce it — an agent may charge what they like, and a
 * tenant may decide. What this does is let a listing say *fifteen per cent* in
 * the place where a reader is looking at the number, rather than leaving them
 * to work out that it is unusual after they have paid it.
 */
export const CUSTOMARY_FEE_PERCENT = 10;

export function feePercent(feeKobo: number, annualRentKobo: number): number | null {
  // Not "0%" — no rent is no answer, and a division nobody can interpret.
  if (annualRentKobo <= 0) return null;
  return Math.round((feeKobo * 100) / annualRentKobo);
}

/**
 * Whether the costs are stated well enough to publish.
 *
 * Rent above zero, and every other field present — including as an explicit
 * zero. That is the whole point: "no agency fee" and "we have not said" are
 * different claims, and a listing that has not said is the listing this
 * product exists to make worse than one that has.
 */
export function costsAreStated(costs: Costs): boolean {
  if (!Number.isSafeInteger(costs.annualRentKobo) || costs.annualRentKobo <= 0) return false;
  return [
    costs.agencyFeeKobo,
    costs.legalFeeKobo,
    costs.cautionDepositKobo,
    costs.serviceChargeKobo,
  ].every((amount) => Number.isSafeInteger(amount) && amount >= 0);
}

/**
 * Naira, the way a Nigerian reader writes it.
 *
 * Whole naira with thousands separators — kobo are not shown, because no
 * rental in this market is priced to the kobo and two trailing zeroes on every
 * figure is noise. Rounded *down*, so a total is never larger than what will
 * actually be asked for.
 */
export function naira(kobo: number): string {
  const whole = Math.floor(kobo / 100);
  return `₦${whole.toLocaleString('en-NG')}`;
}
