import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { ListingView } from '@keys/api';

import { keepNewest } from '@keys/domain';

const STORAGE_KEY = 'keys.saved.listings';

/**
 * A listing as it was when somebody saved it.
 *
 * Deliberately the whole thing rather than an id. An id would need the network
 * to be worth anything, which is the one condition under which this exists.
 */
export interface SavedListing {
  readonly id: string;
  readonly savedAt: Date;
  readonly title: string;
  readonly address: string;
  readonly agentName: string;
  readonly moveInKobo: number | null;
  /**
   * What was checked when this was saved.
   *
   * Kept so the page can say *what Keys had checked on the second of
   * September*, which is a true sentence. What it is never used for is the
   * badge: see `mayShowBadgeOffline`, which answers `false` at every age.
   */
  readonly checks: readonly { readonly condition: string; readonly label: string; readonly met: boolean }[];
}

interface Saved {
  readonly ready: boolean;
  readonly listings: readonly SavedListing[];
  readonly save: (listing: SavedListing) => void;
  readonly forget: (id: string) => void;
  readonly has: (id: string) => boolean;
}

const Context = createContext<Saved | null>(null);

/**
 * Listings kept on this phone.
 *
 * `AsyncStorage`, and here that is the right store rather than a compromise:
 * nothing in it is a secret. It is a copy of pages that are public to anybody
 * with the app, which is exactly the opposite of the session token sitting two
 * files away under a release gate for being in the same place.
 *
 * Written on every change rather than on a timer or at unmount. A phone loses
 * an app at the moment it is short of memory, which is the same moment somebody
 * is on an old handset with fifteen tabs of something else open — the case this
 * feature exists for.
 */
export function SavedProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<readonly SavedListing[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (live && stored) setListings(revive(stored));
      } catch {
        /*
          Unreadable storage is an empty shelf, not a crash.

          Whatever is in there was written by a version of this app that may no
          longer exist; refusing to start because a cache from three releases
          ago no longer parses would make a convenience into an outage.
        */
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const save = useCallback(
    (listing: SavedListing) => {
      setListings((was) => {
        const without = was.filter((l) => l.id !== listing.id);
        const kept = keepNewest([listing, ...without]);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kept)).catch(() => {});
        return kept;
      });
    },
    [],
  );

  const forget = useCallback(
    (id: string) => {
      setListings((was) => {
        const kept = was.filter((l) => l.id !== id);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kept)).catch(() => {});
        return kept;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      ready,
      listings,
      save,
      forget,
      has: (id: string) => listings.some((l) => l.id === id),
    }),
    [ready, listings, save, forget],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSaved(): Saved {
  const saved = useContext(Context);
  if (!saved) throw new Error('useSaved outside SavedProvider');
  return saved;
}

/**
 * Read what was written, without trusting it.
 *
 * `JSON.parse` gives back a string where a `Date` was, and every caller of
 * `savedAge` would then be doing arithmetic on a string. Anything that does not
 * survive this is dropped rather than repaired: a half-understood cache entry
 * is how a screen ends up rendering `undefined`.
 */
function revive(stored: string): readonly SavedListing[] {
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((row: unknown): SavedListing[] => {
    if (typeof row !== 'object' || row === null) return [];
    const listing = row as Record<string, unknown>;
    const savedAt = new Date(String(listing.savedAt));
    if (typeof listing.id !== 'string' || Number.isNaN(savedAt.getTime())) return [];

    return [
      {
        id: listing.id,
        savedAt,
        title: typeof listing.title === 'string' ? listing.title : '',
        address: typeof listing.address === 'string' ? listing.address : '',
        agentName: typeof listing.agentName === 'string' ? listing.agentName : '',
        moveInKobo: typeof listing.moveInKobo === 'number' ? listing.moveInKobo : null,
        checks: Array.isArray(listing.checks)
          ? (listing.checks as SavedListing['checks'])
          : [],
      },
    ];
  });
}

/** The shape a live listing page hands over when somebody saves it. */
export function snapshot(
  id: string,
  view: Pick<ListingView, 'title' | 'address' | 'agentName' | 'checks'>,
  moveInKobo: number | null,
  now: Date,
): SavedListing {
  return {
    id,
    savedAt: now,
    title: view.title,
    address: view.address,
    agentName: view.agentName,
    moveInKobo,
    checks: view.checks.map((check) => ({
      condition: check.condition,
      label: check.label,
      met: check.met,
    })),
  };
}
