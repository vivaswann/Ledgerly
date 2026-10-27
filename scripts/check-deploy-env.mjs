const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
];
for (const key of required)
  if (!process.env[key])
    throw Error(
      `Missing ${key}. Configure it in Vercel environment variables before deployment.`,
    );
if (process.env.BETTER_AUTH_SECRET.length < 32)
  throw Error(
    "BETTER_AUTH_SECRET must have at least 32 high-entropy characters.",
  );
for (const key of ["DATABASE_URL", "DIRECT_URL"])
  if (
    !["postgresql:", "postgres:"].includes(new URL(process.env[key]).protocol)
  )
    throw Error(`${key} must point to PostgreSQL.`);
const url = new URL(process.env.BETTER_AUTH_URL);
if (url.protocol !== "https:")
  throw Error(
    "BETTER_AUTH_URL must be the exact HTTPS URL of your deployed application.",
  );
if (
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  url.username ||
  url.password
)
  throw Error("BETTER_AUTH_URL must contain only the application origin.");
console.log("Deployment environment requirements are present.");
