import crypto from 'node:crypto';

export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}
