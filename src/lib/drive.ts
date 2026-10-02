export type DriveVideoFile = {
  id: string;
  name: string;
  mimeType: string;
};

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


// Lists videos using an OAuth access token (rather than the read-only API
// key) — this is what lets us see/list files in a folder that is NOT
// link-shared (restricted to specific people), since an API key alone has
// no identity and can only read publicly-shared content.
export async function listVideosWithAccessToken(
  folderId: string,
  accessToken: string
): Promise<(DriveVideoFile & { copyRequiresWriterPermission?: boolean })[]> {
  const files: (DriveVideoFile & { copyRequiresWriterPermission?: boolean })[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType,copyRequiresWriterPermission)',
      orderBy: 'name_natural',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive API error (${res.status}): ${body}`);
    }
    const data = (await res.json()) as {
      files?: (DriveVideoFile & { copyRequiresWriterPermission?: boolean })[];
      nextPageToken?: string;
    };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

export type DriveFileDetails = DriveVideoFile & { size?: string };

// Lists every file (not just videos) in a folder, for the admin file-manager.
export async function listFolderFiles(folderId: string, accessToken: string): Promise<DriveFileDetails[]> {
  const files: DriveFileDetails[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType,size)',
      orderBy: 'name_natural',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive API error (${res.status}): ${body}`);
    }
    const data = (await res.json()) as { files?: DriveFileDetails[]; nextPageToken?: string };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

// Starts a resumable upload session and returns the session URL. The actual
// file bytes are then PUT directly from the browser to that URL, bypassing
// our own server so large video uploads don't hit serverless body-size limits.
export async function createResumableUploadSession(
  folderId: string,
  fileName: string,
  mimeType: string,
  accessToken: string
): Promise<string> {
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
      },
      body: JSON.stringify({ name: fileName, parents: [folderId] }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive upload session error (${res.status}): ${body}`);
  }
  const location = res.headers.get('Location');
  if (!location) throw new Error('Drive did not return an upload session URL');
  return location;
}

export async function deleteFile(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Drive delete error (${res.status}): ${body}`);
  }
}

export async function renameFile(fileId: string, newName: string, accessToken: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive rename error (${res.status}): ${body}`);
  }
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

// Grants a specific person viewer access to the event folder, by email —
// restricted Drive sharing, not "anyone with the link". Returns the
// permission ID so it can be revoked later (on manual revoke or expiry).
export async function grantFolderAccess(
  folderId: string,
  email: string,
  accessToken: string
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?supportsAllDrives=true&sendNotificationEmail=false&fields=id`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: email }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive permission grant error (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function revokeFolderAccess(
  folderId: string,
  permissionId: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions/${permissionId}?supportsAllDrives=true`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Drive permission revoke error (${res.status}): ${body}`);
  }
}

// Creates a new subfolder inside the designated parent "Events" folder, so
// an admin can set up an event entirely from our UI without ever touching
// Drive directly or needing their own access to the parent folder.
export async function createEventFolder(name: string, accessToken: string): Promise<string> {
  const parentId = process.env.DRIVE_PARENT_FOLDER_ID;
  if (!parentId) throw new Error('DRIVE_PARENT_FOLDER_ID env var is not set');

  const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive folder create error (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}
