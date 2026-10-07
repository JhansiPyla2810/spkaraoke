import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);

// Verifies a Google Identity Services credential (ID token) came from Google
// and was issued for our own OAuth client, then returns the signed-in
// email — or null if the token is invalid/expired/forged.
export async function verifyGoogleIdToken(credential: string): Promise<string | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) return null;
    return payload.email.toLowerCase();
  } catch {
    return null;
  }
}
