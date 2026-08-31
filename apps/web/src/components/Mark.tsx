/**
 * The same mark the app draws, as DOM SVG.
 *
 * Two copies on purpose: this one is DOM SVG and the app's is
 * `react-native-svg`. The only thing they could share is the path data, behind
 * an import that would make a package depend on a drawing.
 *
 * `scripts/mark-check.py` compares every path in both files and fails the build
 * when they drift, which is the property that actually matters.
 */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M24 2.6 7.2 8.5v13.4c0 10.9 6.9 20.6 16.8 24.1 9.9-3.5 16.8-13.2 16.8-24.1V8.5L24 2.6Zm0 4.9 12.1 4.25v10.35c0 8.3-4.95 15.75-12.1 19-7.15-3.25-12.1-10.7-12.1-19V11.75L24 7.5Z" />
      <path fill="currentColor" d="M24 11.9a6.6 6.6 0 0 0-2.35 12.77v8.98a1.6 1.6 0 0 0 1.6 1.6h1.5a1.6 1.6 0 0 0 1.6-1.6v-1.6h1.85a1.5 1.5 0 0 0 0-3h-1.85v-1.9h1.85a1.5 1.5 0 0 0 0-3h-1.85v-.48A6.6 6.6 0 0 0 24 11.9Zm0 3.7a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Z" />
    </svg>
  );
}
