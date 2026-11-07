import { headers } from "next/headers";
import HomeClient from "@/components/HomeClient";
import { checkAppSession } from "@/lib/appAuth";

export const revalidate = 0;

// The desktop app sets a marker in its requests' User-Agent string (see
// Electron main process) so the one shared homepage can tell "loaded
// inside our own app" apart from "a regular website visitor" - everyone
// else sees byte-identical output, since no real browser sends this.
const APP_USER_AGENT_MARKER = "SPKaraokeApp/";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const h = await headers();
  const isApp = (h.get("user-agent") ?? "").includes(APP_USER_AGENT_MARKER);

  // The app always lands here first - whether signed in or not - and
  // passes its saved session token (if it has one) as a query param so
  // this same homepage can tell "signed in" apart from "needs to sign in"
  // and swap the CTA accordingly, without the gallery ever being the
  // forced landing screen.
  const { token } = await searchParams;
  const session = token ? await checkAppSession(token) : null;
  const signedIn = !!session?.ok;

  return (
    <HomeClient isApp={isApp} signedIn={signedIn} sessionToken={signedIn ? token : undefined} />
  );
}
