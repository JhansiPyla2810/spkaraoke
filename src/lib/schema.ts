import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable('songs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  movie: text('movie').notNull().default(''),
  hero: text('hero').notNull().default(''),
  language: text('language').notNull().default('Telugu'),
  createdAt: integer('created_at').notNull(),
});
