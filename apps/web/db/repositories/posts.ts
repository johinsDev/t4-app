import { eq } from "drizzle-orm";
import { db } from "../index";
import { posts } from "../schema";

export const postsRepository = {
	findAll() {
		return db.select().from(posts);
	},

	findById(id: number) {
		return db.select().from(posts).where(eq(posts.id, id)).get();
	},

	create(data: { title: string; content?: string | null }) {
		return db.insert(posts).values(data).returning().get();
	},

	update(id: number, data: { title?: string; content?: string | null }) {
		return db.update(posts).set(data).where(eq(posts.id, id)).returning().get();
	},

	delete(id: number) {
		return db.delete(posts).where(eq(posts.id, id)).returning().get();
	},
};
