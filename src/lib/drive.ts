// Extracts a Drive folder ID from a pasted share link, or returns the input
// as-is if it already looks like a bare ID.
export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

export type DriveVideoFile = {
  id: string;
  name: string;
  mimeType: string;
};

export async function listVideosInFolder(folderId: string): Promise<DriveVideoFile[]> {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_DRIVE_API_KEY env var is not set');

  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
    fields: 'files(id,name,mimeType)',
    key: apiKey,
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API error (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { files?: DriveVideoFile[] };
  return data.files ?? [];
}

// Lists videos using an OAuth access token (rather than the read-only API
// key) — needed so we can see files even if the folder's public sharing
// hasn't been fully set up yet, and as a shared code path with lockdown.
async function listVideosWithAccessToken(folderId: string, accessToken: string): Promise<DriveVideoFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
    fields: 'files(id,name,mimeType,copyRequiresWriterPermission)',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API error (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { files?: (DriveVideoFile & { copyRequiresWriterPermission?: boolean })[] };
  return data.files ?? [];
}

export type LockdownResult = {
  total: number;
  alreadyLocked: number;
  newlyLocked: number;
  failed: number;
};

// Applies Drive's "viewers/commenters can't download, print, or copy"
// restriction to every video in a folder — the API equivalent of unchecking
// that box by hand on each file, done in bulk.
export async function lockdownFolderVideos(folderId: string, accessToken: string): Promise<LockdownResult> {
  const files = (await listVideosWithAccessToken(folderId, accessToken)) as (DriveVideoFile & {
    copyRequiresWriterPermission?: boolean;
  })[];

  const result: LockdownResult = { total: files.length, alreadyLocked: 0, newlyLocked: 0, failed: 0 };

  for (const file of files) {
    if (file.copyRequiresWriterPermission) {
      result.alreadyLocked++;
      continue;
    }
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?supportsAllDrives=true`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ copyRequiresWriterPermission: true }),
    });
    if (res.ok) {
      result.newlyLocked++;
    } else {
      result.failed++;
    }
  }

  return result;
}
