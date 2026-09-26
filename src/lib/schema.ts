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
  createdAt: integer('created_at').notNull(),
});

export const accessGrants = sqliteTable('access_grants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  eventId: integer('event_id').notNull(),
  clientName: text('client_name').notNull(),
  expiresAt: integer('expires_at').notNull(),
  revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});

// Single row holding the admin's Google OAuth refresh token, so the app can
// call the Drive API on their behalf (e.g. to lock down video permissions)
// without asking them to re-authorize every time.
export const googleAuth = sqliteTable('google_auth', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  refreshToken: text('refresh_token').notNull(),
  createdAt: integer('created_at').notNull(),
});
