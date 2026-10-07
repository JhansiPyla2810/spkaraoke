import crypto from 'node:crypto';

export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

// A short PIN the admin hands to the client alongside the link, so that
// claiming or transferring the session (e.g. "Continue here" on a new
// device) needs this too — just having the link isn't enough on its own.
export function generatePin(): string {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0');
}
