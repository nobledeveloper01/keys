import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { mono, radius, space } from '../design/tokens';
import { CUSTOMARY_FEE_PERCENT as CUSTOMARY_PERCENT, naira } from '@keys/domain';
import { useColours } from '../design/theme';
import { useLanguage } from '../state/language';

/**
 * The shape the server sends. Kobo throughout; nothing here divides by a
 * hundred except `naira`, at the moment of printing.
 */
export interface CostFigures {
  readonly annualRentKobo: number;
  readonly agencyFeeKobo: number;
  readonly legalFeeKobo: number;
  readonly cautionDepositKobo: number;
  readonly serviceChargeKobo: number;
  readonly moveInKobo: number;
  readonly extrasKobo: number;
  readonly agencyFeePercent: number | null;
  readonly legalFeePercent: number | null;
}

/**
 * What it costs to move in.
 *
 * The advert says ₦800,000 and the tenant pays ₦1,100,000. The gap is not
 * secret — agency fee, agreement fee, deposit, service charge — it is simply
 * never added up anywhere before the day somebody is asked for it.
 *
 * So the total is the largest figure on the card and the working is shown
 * above it rather than hidden behind a disclosure. A total nobody can check is
 * exactly as trustworthy as the advert that said ₦800,000.
 */
export function Costs({ costs }: { costs: CostFigures | null }) {
  const { t: say } = useLanguage();
  const colours = useColours();

  if (costs === null) {
    return (
      <View style={[styles.card, { backgroundColor: colours.surfaceDim }]}>
        <Text variant="body" tone="secondary">
          {say('costs_not_stated')}
        </Text>
      </View>
    );
  }

  /*
    Only fees that exist get a row.

    A zero agency fee is a claim worth making — and it survives in the total,
    which is what a ₦0 row would have been evidence for anyway. Five rows of
    ₦0 would bury the two figures somebody is actually reading.
  */
  const rows = [
    { label: say('costs_rent'), amount: costs.annualRentKobo, percent: null },
    { label: say('costs_agency_fee'), amount: costs.agencyFeeKobo, percent: costs.agencyFeePercent },
    { label: say('costs_legal_fee'), amount: costs.legalFeeKobo, percent: costs.legalFeePercent },
    { label: say('costs_caution_deposit'), amount: costs.cautionDepositKobo, percent: null },
    { label: say('costs_service_charge'), amount: costs.serviceChargeKobo, percent: null },
  ].filter((row, index) => index === 0 || row.amount > 0);

  return (
    <View style={[styles.card, { backgroundColor: colours.surfaceDim }]}>
      <Text variant="label" tone="secondary">
        {say('costs_heading')}
      </Text>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.labels}>
            <Text variant="body" tone="secondary">
              {row.label}
            </Text>
            {/*
              Keys does not forbid a fifteen per cent fee. It says so where the
              reader is already looking, instead of leaving them to work it out
              after they have paid it.
            */}
            {row.percent !== null && row.percent > CUSTOMARY_PERCENT ? (
              <Text variant="label" style={{ color: colours.caution }}>
                {say('costs_above_custom')}
              </Text>
            ) : null}
          </View>
          <Text variant="body" style={styles.figure}>
            {naira(row.amount)}
          </Text>
        </View>
      ))}

      <View style={[styles.total, { borderTopColor: colours.outline }]}>
        <View style={styles.labels}>
          <Text variant="title">{say('costs_move_in_total')}</Text>
          {/*
            Lowercase in every language, because this phrase is only ever the
            back half of a sentence that starts with a figure. "₦1,305,000 On
            top of the rent" reads as two fragments; the capital was a phrase
            written as a standalone label and then used as something else.
          */}
          <Text variant="label" tone="secondary">
            {`${naira(costs.extrasKobo)} ${say('costs_extras_note')}`}
          </Text>
        </View>
        <Text variant="title" style={styles.figure}>
          {naira(costs.moveInKobo)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  labels: { flexShrink: 1, gap: 2 },
  // Tabular figures, so the naira column lines up and a bigger number reads as
  // bigger rather than merely wider.
  figure: { ...mono, fontVariant: [...mono.fontVariant] },
  total: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
    marginTop: space.xs,
  },
});
