import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: int({ mode: "boolean" }).notNull().default(false),
	image: text(),
	phoneNumber: text(),
	phoneNumberVerified: int({ mode: "boolean" }).default(false),
	createdAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
	updatedAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const session = sqliteTable("session", {
	id: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => user.id),
	token: text().notNull().unique(),
	expiresAt: int({ mode: "timestamp" }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	createdAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
	updatedAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const account = sqliteTable("account", {
	id: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => user.id),
	accountId: text().notNull(),
	providerId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	accessTokenExpiresAt: int({ mode: "timestamp" }),
	refreshTokenExpiresAt: int({ mode: "timestamp" }),
	scope: text(),
	idToken: text(),
	password: text(),
	createdAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
	updatedAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const verification = sqliteTable("verification", {
	id: text().primaryKey(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: int({ mode: "timestamp" }).notNull(),
	createdAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
	updatedAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
