import { BadRequestException } from '@nestjs/common';
import {
  costsAreStated,
  extrasKobo,
  feePercent,
  moveInCostKobo,
  type Costs,
} from '@keys/domain';

import type { CostsBody, CostsResponse } from './agents.dto';

/**
 * Turn an untrusted body into costs, or refuse it.
 *
 * All five figures or none — a half-filled breakdown reads as complete and is
 * not, and that is precisely the failure the whole feature exists to prevent.
 * A client that sends four fields has a bug; accepting it would publish a
 * total that is wrong in the direction that flatters the agent.
 */
export function readCosts(body: Partial<CostsBody> | undefined): Costs {
  const fields = [
    'annualRentKobo',
    'agencyFeeKobo',
    'legalFeeKobo',
    'cautionDepositKobo',
    'serviceChargeKobo',
  ] as const;

  const costs = {} as { -readonly [K in (typeof fields)[number]]: number };
  for (const field of fields) {
    const value = body?.[field];
    /*
      `undefined` is refused rather than defaulted to zero. Zero here means
      "there is nothing to pay" — a claim an agent can be reported for
      breaking — and inventing that claim on their behalf from a missing field
      would put words in their mouth that a tenant may later rely on.
    */
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      throw new BadRequestException(
        `Say what ${field.replace(/Kobo$/, '')} is, in kobo. Put 0 if there is nothing to pay.`,
      );
    }
    costs[field] = value;
  }

  if (!costsAreStated(costs)) {
    throw new BadRequestException('Rent has to be more than nothing, and no figure can be negative.');
  }
  return costs;
}

/**
 * The five figures plus what they come to.
 *
 * Totalled on the server so that a phone, a browser and somebody reading the
 * API all see the same number. This is the figure the product exists to
 * publish; three implementations of it would eventually be three answers.
 */
export function viewCosts(costs: Costs | null): CostsResponse | null {
  if (costs === null) return null;
  return {
    ...costs,
    moveInKobo: moveInCostKobo(costs),
    extrasKobo: extrasKobo(costs),
    agencyFeePercent: feePercent(costs.agencyFeeKobo, costs.annualRentKobo),
    legalFeePercent: feePercent(costs.legalFeeKobo, costs.annualRentKobo),
  };
}
