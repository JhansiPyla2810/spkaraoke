import { listVideosWithAccessToken } from "@/lib/drive";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";
import VideoGallery from "./VideoGallery";

// Fetching a large folder's video list (thousands of paginated Drive API
// calls for something like "All Songs") can take a few seconds — kept in
// its own async component behind a Suspense boundary so the sign-in gate
// above it can render immediately instead of waiting on this.
export default async function VideoSection({
  driveFolderId,
  clientName,
  expiresAt,
  grantToken,
}: {
  driveFolderId: string;
  clientName: string;
  expiresAt: number;
  grantToken: string;
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
        Couldn&apos;t load the videos right now. Please refresh, or contact us if this keeps happening.
      </p>
    );
  }

  if (videos.length === 0) {
    return <p style={{ color: "var(--muted)" }}>No videos have been added to this event yet.</p>;
  }

  return (
    <VideoGallery videos={videos} clientName={clientName} expiresAt={expiresAt} grantToken={grantToken} />
  );
}
