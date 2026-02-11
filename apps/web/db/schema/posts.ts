import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
	id: int().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	content: text(),
	createdAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
	updatedAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
