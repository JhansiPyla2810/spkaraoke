import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const COOKIE_NAME = 'spk_admin_session';

function getSecret() {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('ADMIN_PASSWORD env var is not set');
  return secret;
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

export async function createSession() {
  const issuedAt = Date.now().toString();
  const token = `${issuedAt}.${sign(issuedAt)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function isAuthed() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [issuedAt, sig] = token.split('.');
  if (!issuedAt || !sig) return false;
  return sign(issuedAt) === sig;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function checkPassword(input: string) {
  return input === getSecret();
}
