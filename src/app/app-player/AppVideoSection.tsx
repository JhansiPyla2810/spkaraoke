import { listVideosWithAccessToken } from "@/lib/drive";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";
import AppVideoGallery from "./AppVideoGallery";

// Same reasoning as the website's VideoSection: listing a large folder can
// take a few seconds, kept behind its own Suspense boundary so the rest of
// the page (header, sign-in state) renders immediately.
export default async function AppVideoSection({
  driveFolderId,
  subscriberLabel,
  expiresAt,
  sessionToken,
  backendUrl,
}: {
  driveFolderId: string;
  subscriberLabel: string;
  expiresAt: number;
  sessionToken: string;
  backendUrl: string;
}) {
  let videos: { id: string; name: string }[] = [];
  let loadError = false;
  try {
    const accessToken = await getAccessTokenFromRefreshToken();
    videos = await listVideosWithAccessToken(driveFolderId, accessToken);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <p style={{ color: "var(--muted)" }}>
        Couldn&apos;t load the videos right now. Please restart the app, or contact us if this keeps happening.
      </p>
    );
  }

  if (videos.length === 0) {
    return <p style={{ color: "var(--muted)" }}>No videos are available yet.</p>;
  }

  return (
    <AppVideoGallery
      videos={videos}
      subscriberLabel={subscriberLabel}
      expiresAt={expiresAt}
      sessionToken={sessionToken}
      backendUrl={backendUrl}
    />
  );
}
