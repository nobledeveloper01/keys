import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';

/**
 * Where the actual photographs live.
 *
 * Until this existed there were no photographs. A capture was a 40x32 greyscale
 * grid and nothing else — enough to compute a perceptual hash, and enough for
 * every gate in this codebase to pass, and not enough for a tenant to *look at
 * the flat*. The evidence panel said "Photo at the property, ticked" about an
 * artefact nobody could see.
 *
 * ## Content-addressed, and that is not an optimisation
 *
 * The key is the SHA-256 of the bytes, which is the same hash that is inside
 * the signature. So a stored object cannot be swapped for different bytes
 * without the key changing, and there is no path where the thing served is not
 * the thing signed. A sequential id or a uuid would have needed a column
 * saying which hash it was supposed to be, and a column can be wrong.
 *
 * It also makes an upload idempotent: the same photograph submitted twice
 * writes the same key twice and costs one object.
 *
 * ## Why the filesystem
 *
 * There is no object-storage account. A `MediaStore` with one method each way
 * is the whole surface an S3 implementation needs, and writing that
 * implementation against credentials nobody has would be writing something
 * nobody can run — the shape is here, the bucket is a release gate.
 *
 * The filesystem version is honest about what it is: single-machine, no
 * replication, and `durable` says so out loud the way the reports store does.
 */
@Injectable()
export abstract class MediaStore {
  /** Store bytes under their own hash. Returns the key. */
  abstract put(sha256: string, bytes: Buffer): Promise<string> | string;

  abstract get(sha256: string): Promise<Buffer | null> | Buffer | null;

  /** Whether this survives the machine. `/healthz` says so. */
  abstract readonly durable: boolean;
}

/**
 * Files in a directory, one per capture, named by hash.
 *
 * Two characters of the hash become a subdirectory. Not for speed — for the
 * moment somebody has to look: a hundred thousand files in one directory is a
 * directory nobody can `ls`.
 */
@Injectable()
export class FilesystemMediaStore extends MediaStore {
  readonly durable = true;

  private readonly root: string;

  /*
    No default. A store that falls back to a temporary directory looks like it
    worked until the machine is replaced, which is precisely the failure the
    captures store spent this whole project having. A deployment that has not
    said where media goes gets the in-memory store, which says so.
  */
  constructor(root: string) {
    super();
    this.root = root;
    mkdirSync(this.root, { recursive: true });
  }

  private path(sha256: string): string {
    const fanned = join(this.root, sha256.slice(0, 2));
    mkdirSync(fanned, { recursive: true });
    return join(fanned, sha256);
  }

  put(sha256: string, bytes: Buffer): string {
    const where = this.path(sha256);
    /*
      Written once. The same photograph submitted twice is the same bytes under
      the same key, and rewriting it would be an opportunity for the second
      write to be different from the first.
    */
    if (!existsSync(where)) writeFileSync(where, bytes);
    return sha256;
  }

  get(sha256: string): Buffer | null {
    const where = this.path(sha256);
    return existsSync(where) ? readFileSync(where) : null;
  }
}

/**
 * Media in a process, for tests and for a machine with no disk to spare.
 *
 * `durable: false`, said out loud, for the reason the reports store says it:
 * a store that silently forgets is worse than one that refuses, and the
 * captures store spent this whole project being the first kind.
 */
@Injectable()
export class InMemoryMediaStore extends MediaStore {
  readonly durable = false;

  private readonly objects = new Map<string, Buffer>();

  put(sha256: string, bytes: Buffer): string {
    if (!this.objects.has(sha256)) this.objects.set(sha256, bytes);
    return sha256;
  }

  get(sha256: string): Buffer | null {
    return this.objects.get(sha256) ?? null;
  }
}
