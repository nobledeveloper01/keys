import { Module } from '@nestjs/common';

import { FilesystemMediaStore, InMemoryMediaStore, MediaStore } from './media.store';

/**
 * The media store on its own, so it can be shared without a cycle.
 *
 * The fourth module of this shape. It provides one thing and imports nothing,
 * which is what makes it unable to take part in a cycle — the property that
 * mattered for captures, for the market, and for the agents store.
 */
@Module({
  providers: [
    {
      provide: MediaStore,
      useFactory: (): MediaStore => {
        /*
          A directory, or a process.

          `KEYS_MEDIA_DIR` is what a deployment sets. Without it this is
          in-memory and says `durable: false` out loud, rather than writing to
          a temporary directory that looks like it worked until the machine is
          replaced — which is the failure the captures store spent this whole
          project having.
        */
        const dir = process.env.KEYS_MEDIA_DIR;
        return dir ? new FilesystemMediaStore(dir) : new InMemoryMediaStore();
      },
    },
  ],
  exports: [MediaStore],
})
export class MediaModule {}
