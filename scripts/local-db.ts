import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
mkdirSync(resolve(".data"), { recursive: true });
const db = await PGlite.create(resolve(".data/postgres"));
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 5433,
  maxConnections: 20,
});
await server.start();
console.log(
  "Local development PostgreSQL-compatible database is listening on 127.0.0.1:5433. Production uses your hosted PostgreSQL provider.",
);
async function stop() {
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
