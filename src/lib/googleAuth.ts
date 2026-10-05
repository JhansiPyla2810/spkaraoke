import { db } from "./db";
import { googleAuth } from "./schema";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export function getOAuthClientId() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_OAUTH_CLIENT_ID env var is not set");
  return id;
}

function getOAuthClientSecret() {
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_OAUTH_CLIENT_SECRET env var is not set");
  return secret;
}

export function buildAuthUrl(redirectUri: string) {
  const params = new URLSearchParams({
    client_id: getOAuthClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive",
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getOAuthClientId(),
      client_secret: getOAuthClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}

export async function saveRefreshToken(refreshToken: string) {
  await db.delete(googleAuth);
  await db.insert(googleAuth).values({ refreshToken, createdAt: Date.now() });
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const rows = await db.select().from(googleAuth).limit(1);
  return rows[0]?.refreshToken ?? null;
}

export async function isGoogleConnected(): Promise<boolean> {
  return (await getStoredRefreshToken()) !== null;
}

export type DriveConnectionStatus = "none" | "ok" | "expired";

// Unlike isGoogleConnected (which only checks a token is saved),  this
// actually tries to use it — so a revoked/expired refresh token (the
// "invalid_grant" failure mode we've hit before) shows up as "expired"
// here instead of silently looking fine until some action fails later.
export async function getDriveConnectionStatus(): Promise<DriveConnectionStatus> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return "none";

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getOAuthClientId(),
      client_secret: getOAuthClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.ok ? "ok" : "expired";
}

export async function getAccessTokenFromRefreshToken(): Promise<string> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) throw new Error("Google Drive isn't connected yet");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getOAuthClientId(),
      client_secret: getOAuthClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Access token refresh failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
