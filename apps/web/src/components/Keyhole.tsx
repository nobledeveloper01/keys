/**
 * The same mark the app draws, as one path.
 *
 * Duplicated rather than shared through a package, deliberately: the app's
 * copy is `react-native-svg` and this one is DOM SVG, and the only thing they
 * would share is the path data — thirty characters behind an import that would
 * make `packages/domain` depend on a drawing.
 *
 * `scripts/mark-check.py` compares the two path strings and fails the build if
 * they drift, which is the property that actually matters.
 */
export function Keyhole({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24 6a11 11 0 0 0-5.6 20.46l-3.2 12.02A2 2 0 0 0 17.13 41h13.74a2 2 0 0 0 1.93-2.52l-3.2-12.02A11 11 0 0 0 24 6Z"
        fill="currentColor"
      />
    </svg>
  );
}
