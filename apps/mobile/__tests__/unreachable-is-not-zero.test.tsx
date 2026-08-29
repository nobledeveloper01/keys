import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LookupScreen } from '../src/screens/LookupScreen';
import { LanguageProvider } from '../src/state/language';
import { ThemeProvider } from '../src/design/theme';

/**
 * The one mistake this screen must never make.
 *
 * A lookup that could not reach the server has told the reader nothing. If
 * that renders as `0`, the app has said "no upheld reports against this
 * number" about a number it never asked about — a false all-clear, to somebody
 * deciding whether to hand over an inspection fee.
 *
 * This is the screen-level half of what `Query` exists for. The type makes the
 * distinction available; only a test makes it true.
 */

// The same three providers `App` mounts, and a fixed inset frame, because the
// library has no window to measure in a test and throws rather than guessing.
const FRAME = { x: 0, y: 0, width: 390, height: 844 };
const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };

function show() {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: FRAME, insets: INSETS }}>
      <ThemeProvider>
        <LanguageProvider>
          <LookupScreen baseUrl="http://127.0.0.1:1" />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('a lookup that could not be made', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('does not render as zero upheld reports', async () => {
    // The network is down, not the registry empty.
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    const { getByLabelText } = show();
    // `fireEvent` rather than calling the prop: typing is a state update, and
    // React warns — correctly — that an update outside `act` may be asserted
    // against before it has been applied.
    await act(async () => {
      fireEvent.changeText(getByLabelText('Check a number'), '08012345678');
    });

    await waitFor(() => {
      expect(screen.queryByText('We cannot reach Keys')).not.toBeNull();
    });

    // The number that must not be on screen.
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByText('No upheld reports against this number.')).toBeNull();
  });

  it('renders zero only when the server actually said zero', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            checked: true,
            upheldReports: 0,
            categories: [],
            mostRecent: null,
            everyReportHadRightOfReply: true,
            meaning: 'Nothing upheld against this number.',
          }),
        ),
    });

    const { getByLabelText } = show();
    await act(async () => {
      fireEvent.changeText(getByLabelText('Check a number'), '08012345678');
    });

    await waitFor(() => {
      expect(screen.queryByText('No upheld reports against this number.')).not.toBeNull();
    });
    expect(screen.queryByText('We cannot reach Keys')).toBeNull();
  });
});
