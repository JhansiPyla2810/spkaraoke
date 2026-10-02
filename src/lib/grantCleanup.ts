import { eq } from "drizzle-orm";
import { db } from "./db";
import { accessGrants, events } from "./schema";
import { revokeFolderAccess } from "./drive";
import { getAccessTokenFromRefreshToken } from "./googleAuth";

// Revokes the Drive-level permission backing a grant that has expired or
// been revoked, and clears drivePermissionId so we don't try again. Safe to
// call repeatedly — a no-op once drivePermissionId is already null.
export async function cleanupGrantDriveAccess(grant: typeof accessGrants.$inferSelect): Promise<void> {
  if (!grant.drivePermissionId) return;

  const [event] = await db.select().from(events).where(eq(events.id, grant.eventId));
  if (!event) return;

  try {
    const accessToken = await getAccessTokenFromRefreshToken();
    await revokeFolderAccess(event.driveFolderId, grant.drivePermissionId, accessToken);
    await db.update(accessGrants).set({ drivePermissionId: null }).where(eq(accessGrants.id, grant.id));
  } catch (e) {
    console.error(`Failed to clean up Drive access for grant ${grant.id}`, e);
  }
}
