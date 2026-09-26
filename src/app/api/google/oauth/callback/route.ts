import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { exchangeCodeForTokens, saveRefreshToken } from "@/lib/googleAuth";

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) redirect("/admin");

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/admin/events?google_error=1", req.url));
  }

  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/google/oauth/callback`;

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      // Google only returns a refresh_token on the *first* consent, or when
      // prompt=consent forces re-consent (which we always request), so this
      // should be rare — but handle it clearly if it happens.
      return NextResponse.redirect(new URL("/admin/events?google_error=no_refresh_token", req.url));
    }
    await saveRefreshToken(tokens.refresh_token);
    return NextResponse.redirect(new URL("/admin/events?google_connected=1", req.url));
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(new URL("/admin/events?google_error=1", req.url));
  }
}
