import fs from "node:fs";
import crypto from "node:crypto";
if (fs.existsSync(".env")) {
  console.log(".env already exists; it was not overwritten.");
  process.exit(0);
}
const env = fs
  .readFileSync(".env.example", "utf8")
  .replace(
    'BETTER_AUTH_SECRET=""',
    `BETTER_AUTH_SECRET="${crypto.randomBytes(48).toString("base64url")}"`,
  );
fs.writeFileSync(".env", env, { flag: "wx" });
console.log("Created local .env with a random auth secret. Keep it private.");
