/**
 * The design tokens from `DESIGN.md`, and nothing else.
 *
 * No screen defines a colour, a size or a spacing of its own. When one does,
 * the system has two sources of truth and the second one wins wherever nobody
 * is looking.
 */

/*
  Not chosen here. Generated.

  Every value below comes out of `design/palette.json`, which
  `scripts/build-palette.py` derives from five hue ramps and refuses to emit
  unless every pairing the product renders clears its WCAG floor — and unless
  the brand hue stays at least forty degrees clear of every status hue, so a
  primary button never reads as a verdict.

  This file used to hold hand-picked hexes, and the app, the web and the splash
  drifted into three different purples because nothing connected them. `make
  palette` regenerates both surfaces from the one source; `scripts/palette-check.py`
  fails the build when either has drifted from it.

  **Do not edit these values.** Change the ramps and rebuild.
*/
export const palette = {
  light: {
    surface: '#FFFFFF',
    surfaceDim: '#F6F6F8',
    surfaceRaised: '#FFFFFF',
    outline: '#E7E7EC',
    textPrimary: '#0A0A0D',
    textSecondary: '#585872',
    accent: '#2E16B3',
    onAccent: '#FFFFFF',
    accentWash: '#EEECFD',
    clear: '#158156',
    clearWash: '#E7FBF3',
    caution: '#8C5F0B',
    cautionWash: '#FDF2DF',
    offline: '#585872',
    offlineWash: '#F2F2F5',
    alarm: '#81152B',
    alarmWash: '#FBE9EC',
    verifiedTier: '#2E16B3',
    businessTier: '#158156',
    trustedTier: '#8C5F0B',
  },
  dark: {
    surface: '#0A0A0D',
    surfaceDim: '#17171A',
    surfaceRaised: '#1F1F22',
    outline: '#2C2C2F',
    textPrimary: '#F5F5F7',
    textSecondary: '#9C9CB2',
    accent: '#9E90F1',
    onAccent: '#0A0A0D',
    accentWash: '#161230',
    clear: '#68E6B4',
    clearWash: '#122620',
    caution: '#F3BE5B',
    cautionWash: '#2A2113',
    offline: '#9C9CB2',
    offlineWash: '#19191F',
    alarm: '#E66881',
    alarmWash: '#281219',
    verifiedTier: '#9E90F1',
    businessTier: '#68E6B4',
    trustedTier: '#F3BE5B',
  },
} as const;

/** The brand gradient's stops, from the same source. */
export const brandGradient = ["#7762EC", "#573EE7", "#221186"] as const;

/**
 * The one flat colour a native launch screen can use.
 *
 * The gradient's midpoint, so the hand-over from the storyboard to the
 * JavaScript splash does not flash.
 */
export const SPLASH_FIELD = '#573EE7';


/**
 * The shape of a palette, not one particular palette.
 *
 * `as const` pins every value to its own string literal, which makes the dark
 * palette unassignable to the light one — correct about the values and useless
 * as a type. What a component needs to know is that a palette has these keys
 * and they are colours.
 */
export type Colours = Readonly<Record<keyof (typeof palette)['light'], string>>;

/**
 * Inter, bundled.
 *
 * Not the system face. iOS gets SF Pro and Android gets Roboto, so the same
 * screen has different metrics on each platform and neither is the one the
 * spacing was set against — and on the Transsion handsets that dominate the
 * driver segment, "the system face" is whatever the OEM shipped.
 *
 * Bundling one face makes the product look the same everywhere, which is the
 * difference between an app that was designed and an app that was assembled.
 *
 * **Weights are named, not numbered.** React Native maps `fontWeight` onto a
 * family's available faces inconsistently across platforms; naming the exact
 * file removes the guess. `fontWeight` is left off entirely for the same
 * reason — set alongside a named face it produces synthetic bolding on
 * Android, which looks like a rendering fault.
 */
export const family = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const type = {
  display: { fontSize: 36, lineHeight: 42, fontFamily: family.bold, letterSpacing: -0.9 },
  headline: { fontSize: 28, lineHeight: 34, fontFamily: family.bold, letterSpacing: -0.6 },
  title: { fontSize: 19, lineHeight: 25, fontFamily: family.semibold, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontFamily: family.regular, letterSpacing: -0.1 },
  /** The renter face default: read outdoors, at arm's length, on a cheap screen. */
  bodyOutdoor: { fontSize: 19, lineHeight: 28, fontFamily: family.regular, letterSpacing: -0.1 },
  label: { fontSize: 14, lineHeight: 20, fontFamily: family.medium, letterSpacing: 0 },
  /**
   * Section headings inside a card. Small, wide-tracked, upper-case.
   *
   * The scale had `label` doing this job as well as carrying metadata, so a
   * section heading and the text under it were the same weight and nothing led
   * the eye down the screen.
   */
  overline: { fontSize: 12, lineHeight: 16, fontFamily: family.bold, letterSpacing: 0.9 },
} as const;

export type Variant = keyof typeof type;

/**
 * How far each variant is allowed to grow.
 *
 * Body text is what a low-vision user actually needs scaled, so it has no cap.
 * A 36pt hero at 310% is 112pt and eats a whole screen — at maximum text size
 * the words "Loads going your way" filled the display and pushed every load
 * off it. Capping display type is not a refusal to scale; it is scaling the
 * thing that carries the meaning rather than the thing that carries the
 * emphasis.
 *
 * Checked on a device at the largest size, not assumed. It was broken the
 * first time anybody looked, on this project as on the last one.
 *
 * It lives beside the scale rather than inside `Text` because it is a property
 * of the scale: an icon deciding where to sit beside a line has to know how
 * tall that line actually got, and there is one answer to that.
 */
/*
  Nothing is capped. The reader's text size is the reader's decision.

  This started as `display: 1.5, headline: 1.6, title: 1.8` with `body`
  uncapped, to stop a 36pt hero becoming 112pt at the largest accessibility
  setting and filling a screen with one word.

  It does not work, and the test that now guards this found why: caps have to
  be monotonic with the sizes they cap, or the order inverts. Uncapped 19pt
  `title` passes capped 28pt `headline` at 2.5×. Uncapped 16pt `body` passes
  it too. Every fix inside the scheme just moves which pair inverts, because
  the two goals — bound the heroes, do not bound the body — are the same
  statement with opposite signs.

  So the goal that loses is bounding the heroes. Somebody who has set their
  phone to 310% has told us what they need, an unread headline is worth
  nothing however neatly it fits, and every screen here scrolls. What we keep
  is the ordering, which is what a type scale is actually for.

  The record stays, and every entry is `undefined`, so that adding a cap is a
  deliberate act with a failing test in front of it rather than a plausible
  one-line edit.
*/
export const MAX_SCALE: Record<Variant, number | undefined> = {
  display: undefined,
  headline: undefined,
  title: undefined,
  body: undefined,
  bodyOutdoor: undefined,
  label: undefined,
  overline: undefined,
};

/** How tall one line of a variant actually is, at the reader's own setting. */
export function lineHeightAt(variant: Variant, fontScale: number): number {
  const cap = MAX_SCALE[variant];
  return type[variant].lineHeight * (cap === undefined ? fontScale : Math.min(fontScale, cap));
}

/**
 * Tabular figures, for anything that changes in place.
 *
 * A rate that shifts horizontally as its digits change is a rate that looks
 * like it is being edited while you read it.
 */
export const mono = {
  fontFamily: 'Menlo',
  fontVariant: ['tabular-nums'] as const,
};

/** 4pt scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 20, pill: 999 } as const;

/**
 * Elevation.
 *
 * Two scales, because a shadow does nothing on a near-black background. In
 * light the card lifts with a shadow; in dark it lifts by being a lighter
 * surface with a slightly stronger border. The same token name in both, so no
 * screen has to know which theme it is in.
 *
 * Everything was one flat `surfaceDim` rectangle with a hairline border before
 * this, and nothing on any screen led the eye anywhere.
 */
/**
 * The shape of an elevation scale, not one particular scale.
 *
 * Same reason as `Colours`: `as const` pins the dark scale's empty objects to
 * their own types, and the two stop being interchangeable.
 */
export type Elevation = Readonly<Record<'flat' | 'raised' | 'lifted', object>>;

export const elevation: Readonly<Record<'light' | 'dark', Elevation>> = {
  light: {
    flat: {},
    raised: {
      shadowColor: '#0C1119',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    lifted: {
      shadowColor: '#0C1119',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  },
  dark: {
    flat: {},
    raised: {},
    lifted: {},
  },
};

/**
 * Minimum touch targets.
 *
 * The driver number is not a rounding-up of the shipper one. A driver may be
 * wearing gloves, the phone may be mounted, and the cab is clear.
 */
export const target = { standard: 48, driver: 64 } as const;

/**
 * Motion.
 *
 * One set of durations and one easing family, so everything in the product
 * moves at the same rhythm. Mixed timings are the same tell as mixed stroke
 * widths: they read as an interface assembled from parts rather than designed.
 *
 * Exits are shorter than entrances — around 70% — because a thing leaving
 * should get out of the way, and a slow exit feels like the app hesitating.
 */
export const motion = {
  /** A press, a tint, a chip appearing. */
  fast: 140,
  /** The default: a card expanding, a sheet arriving. */
  base: 220,
  /** A screen transition, and nothing longer. */
  slow: 320,
  /** Per-item delay when a list arrives. Beyond ~50ms it reads as slow. */
  stagger: 40,
  /**
   * How far a pressable shrinks.
   *
   * Applied only to things with room around them. A list row uses opacity
   * instead: a scaling row nudges its neighbours and the whole list twitches
   * under the thumb.
   */
  pressScale: 0.97,

  /**
   * The two curves, as bezier control points.
   *
   * `enter` decelerates into place — fast at first, settling. `exit` does the
   * opposite. Written as points rather than `Easing.out(Easing.quad)` because
   * that passes an unbound method reference around, and because naming the
   * curve is the point: everything in the product should move on these two and
   * nothing else.
   */
  enter: [0.2, 0, 0, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
} as const;
