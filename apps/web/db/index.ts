import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { dbEnv } from "./env";
import * as schema from "./schema";

export const client = createClient({
	url: dbEnv.DATABASE_URL,
	authToken: dbEnv.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
