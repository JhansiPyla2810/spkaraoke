import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable('songs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  movie: text('movie').notNull().default(''),
  hero: text('hero').notNull().default(''),
  language: text('language').notNull().default('Telugu'),
  createdAt: integer('created_at').notNull(),
});

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  driveFolderId: text('drive_folder_id').notNull(),
  // Set when "Lock down videos" last succeeded with zero failures. Cleared
  // whenever a new video is uploaded, so newly-added, still-unlocked
  // content can't slip out under an already-generated link's cover.
  lockedDownAt: integer('locked_down_at'),
  // When true, "Delete" is blocked for this event regardless of who's
  // logged in (there's only one shared admin password, so this protects
  // a folder itself rather than restricting a specific person).
  isProtected: integer('is_protected', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});

export const accessGrants = sqliteTable('access_grants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  eventId: integer('event_id').notNull(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull().default(''),
  startsAt: integer('starts_at').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
  revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false),
  // Drive permission ID granting this client's email viewer access to the
  // event's folder. Cleared once that Drive-level access has been revoked
  // (on manual revoke, on expiry cleanup, or via the daily cron sweep).
  drivePermissionId: text('drive_permission_id'),
  // The one device currently allowed to use this link (a random ID stored
  // in that device's cookie). A different device opening the link can take
  // over, which replaces this value — the previous device then finds its
  // own cookie no longer matches and is locked out. Admin test emails are
  // exempt from this check entirely.
  activeDeviceId: text('active_device_id'),
  createdAt: integer('created_at').notNull(),
});

// One row per /watch/[token] page load, so we can tell if a single link is
// being viewed from many different devices/locations — a real signal that
// it's been forwarded beyond the one client it was generated for.
export const accessViews = sqliteTable('access_views', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  grantId: integer('grant_id').notNull(),
  ip: text('ip').notNull(),
  userAgent: text('user_agent').notNull(),
  viewedAt: integer('viewed_at').notNull(),
});

// Single row holding the admin's Google OAuth refresh token, so the app can
// call the Drive API on their behalf (e.g. to lock down video permissions)
// without asking them to re-authorize every time.
export const googleAuth = sqliteTable('google_auth', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  refreshToken: text('refresh_token').notNull(),
  createdAt: integer('created_at').notNull(),
});
