import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { testPostgres } from "./postgres";
const pg = await testPostgres();
try {
  const child = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: pg.url,
        DIRECT_URL: pg.url,
        BETTER_AUTH_URL: "http://127.0.0.1:3100",
        BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
        LEDGERLY_TEST_DIST: ".next-e2e",
        LEDGERLY_BROWSER_DATABASE_URL: pg.url,
      },
    },
  );
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  await pg.close();
}
