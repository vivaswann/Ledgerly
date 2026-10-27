import "dotenv/config";
export { seedUser as seed } from "../src/lib/defaults";
if (process.argv[1]?.endsWith("seed.ts"))
  console.log(
    "Default categories and preferences are created privately for each user at sign-up. No shared or demo records are seeded.",
  );
