import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
export async function testPostgres() {
  const pg = await PGlite.create();
  for (const dir of readdirSync("prisma/migrations")
    .filter((f) => f !== "migration_lock.toml")
    .sort())
    await pg.exec(
      readFileSync(resolve("prisma/migrations", dir, "migration.sql"), "utf8"),
    );
  const server = new PGLiteSocketServer({
    db: pg,
    host: "127.0.0.1",
    port: 0,
    maxConnections: 20,
  });
  await server.start();
  const url =
    "postgresql://postgres:postgres@" +
    server.getServerConn() +
    "/postgres?connection_limit=1&pgbouncer=true&statement_cache_size=0";
  const db = new PrismaClient({ datasourceUrl: url });
  return {
    db,
    url,
    pg,
    async close() {
      await db.$disconnect();
      await server.stop();
      await pg.close();
    },
  };
}
