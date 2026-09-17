import AsyncStorage from '@react-native-async-storage/async-storage';

import { attempt, client } from '@keys/api';

import KeysSigning from '../native/NativeKeysSigning';
import { deviceIdFor } from './capture';

/**
 * Signing for the tenancy (ADR-0011, ADR-0012): the same phone key that
 * signs a capture. An agent signs with a registered device and says which;
 * a tenant registers the key once and signs with it. Either way the server
 * verifies over the bytes it handed out, and a phone with no key says so.
 */
export type Signed = { readonly signature: string; readonly deviceId?: string } | { readonly why: string };

export async function signAsTenant(baseUrl: string, token: string, message: string): Promise<Signed> {
  const registered = await AsyncStorage.getItem('keys.tenant.key.registered').catch(() => null);
  if (!registered) {
    let publicKey: string;
    try {
      publicKey = await KeysSigning.publicKey();
    } catch {
      return { why: 'This phone has no key Keys can use.' };
    }
    const r = await attempt(() => client({ baseUrl, tenantToken: token }).tenancy.registerKey(publicKey));
    if (!r.ok) return { why: r.failure.kind === 'refused' ? r.failure.detail : 'Keys could not be reached.' };
    await AsyncStorage.setItem('keys.tenant.key.registered', 'yes').catch(() => {});
  }
  try {
    return { signature: await KeysSigning.sign(message) };
  } catch {
    return { why: 'This phone could not sign.' };
  }
}

export async function signAsLetting(baseUrl: string, token: string, message: string): Promise<Signed> {
  const remembered = await AsyncStorage.getItem('keys.device.id').catch(() => null);
  const answer = await deviceIdFor(baseUrl, token, remembered);
  if ('why' in answer) return answer;
  if (!remembered) await AsyncStorage.setItem('keys.device.id', answer.deviceId).catch(() => {});
  try {
    return { signature: await KeysSigning.sign(message), deviceId: answer.deviceId };
  } catch {
    return { why: 'This phone could not sign.' };
  }
}
