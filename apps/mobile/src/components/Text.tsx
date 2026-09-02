import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { MAX_SCALE, mono, type as typeScale } from '../design/tokens';
import { useColours } from '../design/theme';

type Variant = keyof typeof typeScale;
type Tone = 'primary' | 'secondary' | 'accent' | 'clear' | 'caution' | 'offline' | 'alarm';

interface Props extends TextProps {
  readonly variant?: Variant;
  readonly tone?: Tone;
  /** Tabular figures, for anything that changes in place. */
  readonly tabular?: boolean;
  /**
   * A tighter cap than the variant's, for a slot that is tighter than usual.
   *
   * Only for furniture in a fixed space — the tab bar is the one that needed
   * it. It cannot be used to cap *content*: a reader who set 200% text did so
   * to read, and a screen that quietly refuses is worse than one that scrolls.
   *
   * Per call rather than per variant, deliberately. `MAX_SCALE` is empty
   * because a cap on one variant and not another inverts the type scale — a
   * capped `title` renders below an uncapped `body` — and that inversion is
   * what `type-scale-stays-ordered.test.ts` exists to refuse. Five tab labels
   * that all carry the same cap invert nothing against each other, and a tab
   * label is not part of the reading hierarchy of the page behind it.
   */
  readonly maxScale?: number;
}

/**
 * The only text component.
 *
 * Screens pick a variant and a tone; they do not pick a size or a hex. The
 * 200%-text-scaling requirement in the definition of done is only checkable if
 * there is one place that decides how big text is.
 */
export function Text({
  variant = 'body',
  tone = 'primary',
  tabular = false,
  maxScale,
  style,
  ...rest
}: Props) {
  const colours = useColours();

  const toneColour: Record<Tone, string> = {
    primary: colours.textPrimary,
    secondary: colours.textSecondary,
    accent: colours.accent,
    clear: colours.clear,
    caution: colours.caution,
    offline: colours.offline,
    alarm: colours.alarm,
  };

  const base = typeScale[variant] as TextStyle;
  /*
    The tighter of the two, and `undefined` only when both are.

    `Math.min` with an `undefined` is `NaN`, which React Native reads as no cap
    at all — so a variant that is deliberately uncapped would silently swallow
    a caller's tighter one.
  */
  const variantCap = MAX_SCALE[variant];
  const cap =
    maxScale === undefined
      ? variantCap
      : variantCap === undefined
        ? maxScale
        : Math.min(variantCap, maxScale);

  return (
    <RNText
      maxFontSizeMultiplier={cap}
      {...rest}
      style={[
        base,
        { color: toneColour[tone] },
        tabular ? { fontFamily: mono.fontFamily, fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
