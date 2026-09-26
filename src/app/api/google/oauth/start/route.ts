import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isAuthed } from "@/lib/auth";
import { buildAuthUrl } from "@/lib/googleAuth";

export async function GET() {
  if (!(await isAuthed())) redirect("/admin");

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/google/oauth/callback`;

  redirect(buildAuthUrl(redirectUri));
}
