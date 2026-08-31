/**
 * Telling one photograph from a copy of it.
 *
 * The scam this exists to stop is the cheapest one in the market: take
 * somebody else's listing photos, resize them, post them as your own flat,
 * collect inspection fees. A cryptographic hash is useless here — one
 * recompressed pixel changes it completely — so the comparison has to be
 * perceptual: two images that *look* the same must produce nearby values.
 *
 * ## Why this is in the domain
 *
 * The hash and the distance are arithmetic over a grid of grey values. No
 * decoding, no files, no platform. The server turns a JPEG into a grid, and
 * everything after that point is here, where the phone, the server and the
 * tests all run the same code — because "these two images match" is a claim
 * that gets somebody's listing blocked, and it must not mean two things.
 */

/** A greyscale image as plain numbers. What a decoder hands to this module. */
export interface Grey {
  readonly width: number;
  readonly height: number;
  /** Row-major, one byte per pixel, `width * height` long. */
  readonly pixels: Uint8Array;
}

/**
 * The hash is 8×8 comparisons of neighbouring columns, so the grid is 9 wide.
 *
 * Deliberately tiny. The point of a perceptual hash is that it throws away
 * almost everything — detail is what recompression and watermarks change, and
 * an algorithm that notices detail is an algorithm that misses the copy.
 */
export const HASH_WIDTH = 9;
export const HASH_HEIGHT = 8;
export const HASH_BITS = (HASH_WIDTH - 1) * HASH_HEIGHT;

/**
 * Average over a box, not a nearest-neighbour sample.
 *
 * A sampler picks one pixel out of every few hundred, so its answer is a
 * lottery over compression noise: recompress the image and a different single
 * pixel decides a whole cell. Averaging the region is stable under exactly the
 * noise that recompression adds, which is what the corpus is mostly testing.
 *
 * **It does not make the hash shift-invariant, and an earlier version of this
 * comment claimed it did.** Nothing here can: a difference hash reads columns
 * of a thumbnail, and moving content across the frame moves it between
 * columns. Measured on the corpus, a shift of one pixel costs about three of
 * sixty-four bits, four pixels costs nine, and eight pixels costs sixteen —
 * past the threshold. Hand-held reshoots of the same wall are matched; a
 * deliberate re-frame is not, and `centre` rather than this is what covers the
 * crop case.
 */
export function resize(image: Grey, width: number, height: number): Grey {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor((y * image.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * image.height) / height));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor((x * image.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * image.width) / width));

      let total = 0;
      let count = 0;
      for (let sy = y0; sy < y1 && sy < image.height; sy += 1) {
        for (let sx = x0; sx < x1 && sx < image.width; sx += 1) {
          total += image.pixels[sy * image.width + sx]!;
          count += 1;
        }
      }
      out[y * width + x] = count === 0 ? 0 : Math.round(total / count);
    }
  }
  return { width, height, pixels: out };
}

/**
 * The difference hash: is each pixel brighter than the one to its right?
 *
 * Relative, not absolute, and that is the whole trick. Brightening or
 * darkening an entire image moves every value and changes no comparison, so a
 * colour-shifted copy hashes identically. Absolute thresholds — "is this pixel
 * above the mean" — do not have that property.
 */
export function dHash(image: Grey): bigint {
  const small = resize(image, HASH_WIDTH, HASH_HEIGHT);
  let hash = 0n;
  for (let y = 0; y < HASH_HEIGHT; y += 1) {
    for (let x = 0; x < HASH_WIDTH - 1; x += 1) {
      const left = small.pixels[y * HASH_WIDTH + x]!;
      const right = small.pixels[y * HASH_WIDTH + x + 1]!;
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }
  return hash;
}

/** How many of the 64 bits differ. */
export function distance(a: bigint, b: bigint): number {
  let differing = a ^ b;
  let count = 0;
  while (differing !== 0n) {
    count += Number(differing & 1n);
    differing >>= 1n;
  }
  return count;
}

/**
 * How close counts as the same picture.
 *
 * Ten of sixty-four bits. The number is a judgement about which mistake is
 * worse, and here they are not symmetric: a false match blocks an honest
 * agent's listing and costs them income, while a missed match lets one stolen
 * photo through to a reviewer who is looking at it anyway. So this sits where
 * an honest reshoot of the same room is comfortably outside it, rather than as
 * tight as the corpus would allow.
 *
 * **Nothing is blocked by this number alone.** A match opens a review; a person
 * decides. See `verdictFor`.
 */
export const MATCH_THRESHOLD = 10;

/**
 * How much of the border a second hash throws away.
 *
 * A difference hash compares neighbouring columns of an 8-row thumbnail, so
 * every column shifts when the frame changes — which makes it strong against
 * recompression and weak against cropping. The adversarial corpus found this
 * immediately: a six per cent crop moved twelve of sixty-four bits, past the
 * threshold, on a third of the images.
 *
 * The fix is not a looser threshold — that buys crop tolerance with false
 * matches on honest listings, which is the expensive mistake. It is a second
 * hash of the middle of the picture. A cropped copy's *full* frame resembles
 * the original's *middle*, so indexing both means one of the four pairings
 * lands close.
 *
 * Eight per cent, because a crop large enough to defeat that has also thrown
 * away enough of the room to be a visibly different photograph.
 */
export const CROP_MARGIN = 0.08;

/** The middle of the picture, with `CROP_MARGIN` of each edge removed. */
export function centre(image: Grey): Grey {
  const inset = Math.max(1, Math.floor(Math.min(image.width, image.height) * CROP_MARGIN));
  const width = Math.max(1, image.width - inset * 2);
  const height = Math.max(1, image.height - inset * 2);
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      pixels[y * width + x] = image.pixels[(y + inset) * image.width + (x + inset)]!;
    }
  }
  return { width, height, pixels };
}

/**
 * Both hashes of one image: the whole frame, and its middle.
 *
 * Everything that indexes or queries uses this rather than `dHash` directly,
 * so the crop defence cannot be present on one path and missing on the other.
 */
export function hashesFor(image: Grey): readonly bigint[] {
  return [dHash(image), dHash(centre(image))];
}

/**
 * The closest any pairing of two images' hashes comes.
 *
 * Exported for the corpus, which compares two images directly without an index
 * in between — the gate has to be able to state a distance, not only whether
 * the tree found something.
 */
export function bestDistance(a: readonly bigint[], b: readonly bigint[]): number {
  let best = HASH_BITS;
  for (const one of a) {
    for (const other of b) best = Math.min(best, distance(one, other));
  }
  return best;
}

/**
 * A node in the index.
 *
 * A BK-tree, because the alternative at any real size is comparing every new
 * upload against every hash Keys holds. It works on the triangle inequality:
 * if `d(query, node)` is `k`, anything within `t` of the query is within
 * `k - t` to `k + t` of the node, so every other branch is skipped without
 * being read.
 */
interface Node {
  readonly hash: bigint;
  readonly id: string;
  readonly children: Map<number, Node>;
}

export interface Match {
  readonly id: string;
  readonly distance: number;
}

export class HashIndex {
  private root: Node | null = null;

  private size = 0;

  /** Index every hash an image produces, all pointing at the same listing. */
  addImage(id: string, image: Grey): void {
    for (const hash of hashesFor(image)) this.add(id, hash);
  }

  add(id: string, hash: bigint): void {
    this.size += 1;
    if (this.root === null) {
      this.root = { hash, id, children: new Map() };
      return;
    }

    let node = this.root;
    for (;;) {
      const d = distance(hash, node.hash);
      // An exact duplicate of something already indexed. Keeping the first is
      // right: the index answers "what does this look like", and a second copy
      // of one image adds nothing but a node.
      if (d === 0) return;

      const next = node.children.get(d);
      if (!next) {
        node.children.set(d, { hash, id, children: new Map() });
        return;
      }
      node = next;
    }
  }

  get count(): number {
    return this.size;
  }

  /**
   * What an image looks like, by every hash it produces.
   *
   * Deduplicated by listing, keeping the closest — a listing indexed under two
   * hashes must not be reported twice for one query, and the number a reviewer
   * sees should be the strongest match rather than whichever hash was popped
   * off the stack last.
   */
  nearImage(image: Grey, threshold: number = MATCH_THRESHOLD): readonly Match[] {
    const best = new Map<string, number>();
    for (const hash of hashesFor(image)) {
      for (const match of this.near(hash, threshold)) {
        const seen = best.get(match.id);
        if (seen === undefined || match.distance < seen) best.set(match.id, match.distance);
      }
    }
    // `bestDistance` says the same thing for two images with no index between
    // them; this says it for one image against everything stored.
    return [...best]
      .map(([id, d]) => ({ id, distance: d }))
      .sort((a, b) => a.distance - b.distance);
  }

  /** Everything within `threshold`, nearest first. */
  near(hash: bigint, threshold: number = MATCH_THRESHOLD): readonly Match[] {
    const found: Match[] = [];
    if (this.root === null) return found;

    const stack: Node[] = [this.root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      const d = distance(hash, node.hash);
      if (d <= threshold) found.push({ id: node.id, distance: d });

      /*
        The triangle inequality is what makes this a tree rather than a list.

        Only children whose stored distance lies within `[d - t, d + t]` can
        hold anything within `t` of the query. Widening this range would still
        be correct and would cost the whole point of the structure; narrowing
        it would silently miss matches, which is the failure nobody notices.
      */
      for (const [childDistance, child] of node.children) {
        if (childDistance >= d - threshold && childDistance <= d + threshold) {
          stack.push(child);
        }
      }
    }
    return found.sort((a, b) => a.distance - b.distance);
  }
}

export const DUPLICATE_DECISIONS = ['blocked', 'allowed', 'pending'] as const;
export type DuplicateDecision = (typeof DUPLICATE_DECISIONS)[number];

/**
 * What a match means before a person has looked at it.
 *
 * `pending`, always. Never `blocked`.
 *
 * This is the load-bearing decision in the whole module and it is a product
 * one, not a technical one. The same photograph legitimately appears on two
 * listings all the time: an agency changes hands, a landlord lists through two
 * agents, the same flat is re-let a year later. Auto-blocking on distance
 * would take an honest agent's listing down on arithmetic, with no person
 * involved and nobody to appeal to.
 *
 * So a match is a reason to look, and only `unmetConditions` reads the
 * *reviewed* decision. An image nobody has judged yet blocks nothing.
 */
export function verdictFor(matches: readonly Match[]): DuplicateDecision {
  return matches.length === 0 ? 'allowed' : 'pending';
}
