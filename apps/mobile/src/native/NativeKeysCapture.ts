import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * The camera, and only the camera.
 *
 * There is no method here that takes a photograph from anywhere else. That is
 * the whole mechanism: the signature proves bytes came out of *this* camera,
 * so an app that would also accept a file from the gallery is an app that has
 * published the way around its own guarantee.
 *
 * What comes back is a greyscale grid rather than a JPEG — it is what the
 * perceptual hash reads and what the signature covers. The photograph a tenant
 * eventually sees is a separate upload; keeping them apart means the hashed
 * thing is small, deterministic, and free of any encoder's choices.
 */
export interface Spec extends TurboModule {
  /**
   * Present the camera and return what it captured, with where it was taken.
   *
   * A walkthrough returns one frame from a second in as its `pixels` — the
   * file's own bytes are megabytes and change completely on every re-encode,
   * so hashing them would say nothing about whether two agents are using the
   * same footage. A frame goes through the same perceptual hash a photograph
   * does, which is what makes a stolen walkthrough findable. Rejects if the device has no camera, if the agent cancels, or if
   * there is no location — a capture with no location can never satisfy
   * `provesPresence`, so taking it would produce a photograph that silently
   * counts for nothing.
   */
  capture(kind: 'photo' | 'video'): Promise<{
    /** `KEYSGREY`, width, height, one byte a pixel — base64. */
    pixels: string;
    latitude: number;
    longitude: number;
    /** What the OS said. Signed, so a modified client cannot flip it. */
    mockLocation: boolean;
    capturedAt: string;
    /**
     * Only for a walkthrough. A photograph has no duration, and the server
     * reads this to decide whether thirty seconds of it exist.
     */
    durationSeconds?: number;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('KeysCapture');
