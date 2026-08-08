import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';

export type StoredPasskey = Readonly<{
  id: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
}>;

export const passkeyRegistrationOptions = (input: {
  rpId: string;
  userId: string;
  email: string;
  existing: readonly StoredPasskey[];
}) =>
  generateRegistrationOptions({
    rpName: 'TomorrowReady',
    rpID: input.rpId,
    userID: Buffer.from(input.userId, 'utf8'),
    userName: input.email,
    attestationType: 'none',
    excludeCredentials: input.existing.map((credential) => ({
      id: credential.id,
      ...(credential.transports ? { transports: credential.transports } : {}),
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    supportedAlgorithmIDs: [-7, -257],
  });

export async function verifyPasskeyRegistration(input: {
  response: RegistrationResponseJSON;
  challenge: string;
  origin: string;
  rpId: string;
}): Promise<StoredPasskey> {
  const result = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: input.challenge,
    expectedOrigin: input.origin,
    expectedRPID: input.rpId,
    requireUserVerification: true,
    supportedAlgorithmIDs: [-7, -257],
  });
  if (!result.verified || !result.registrationInfo) throw new Error('PASSKEY_REGISTRATION_INVALID');
  return {
    id: result.registrationInfo.credential.id,
    publicKey: Buffer.from(result.registrationInfo.credential.publicKey).toString('base64url'),
    counter: result.registrationInfo.credential.counter,
    ...(result.registrationInfo.credential.transports
      ? { transports: result.registrationInfo.credential.transports }
      : {}),
    deviceType: result.registrationInfo.credentialDeviceType,
    backedUp: result.registrationInfo.credentialBackedUp,
  };
}

export const passkeyAuthenticationOptions = (input: {
  rpId: string;
  credentials: readonly StoredPasskey[];
}) =>
  generateAuthenticationOptions({
    rpID: input.rpId,
    allowCredentials: input.credentials.map((credential) => ({
      id: credential.id,
      ...(credential.transports ? { transports: credential.transports } : {}),
    })),
    userVerification: 'required',
  });

export async function verifyPasskeyAuthentication(input: {
  response: AuthenticationResponseJSON;
  challenge: string;
  origin: string;
  rpId: string;
  credential: StoredPasskey;
}): Promise<number> {
  const result = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: input.challenge,
    expectedOrigin: input.origin,
    expectedRPID: input.rpId,
    requireUserVerification: true,
    credential: {
      id: input.credential.id,
      publicKey: Buffer.from(input.credential.publicKey, 'base64url'),
      counter: input.credential.counter,
      ...(input.credential.transports ? { transports: input.credential.transports } : {}),
    },
  });
  if (!result.verified || !result.authenticationInfo.userVerified)
    throw new Error('PASSKEY_AUTHENTICATION_INVALID');
  return result.authenticationInfo.newCounter;
}
