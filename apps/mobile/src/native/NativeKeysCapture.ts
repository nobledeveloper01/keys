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
   * Present the camera, take one photograph, and return it with where it was
   * taken. Rejects if the device has no camera, if the agent cancels, or if
   * there is no location — a capture with no location can never satisfy
   * `provesPresence`, so taking it would produce a photograph that silently
   * counts for nothing.
   */
  capture(): Promise<{
    /** `KEYSGREY`, width, height, one byte a pixel — base64. */
    pixels: string;
    latitude: number;
    longitude: number;
    /** What the OS said. Signed, so a modified client cannot flip it. */
    mockLocation: boolean;
    capturedAt: string;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('KeysCapture');
