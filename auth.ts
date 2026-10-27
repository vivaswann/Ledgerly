import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { initializeUser } from "./defaults";
export const auth = betterAuth({
  appName: "Ledgerly",
  database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
  account: { modelName: "AuthAccount" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 10 },
    },
  },
  advanced: { database: { generateId: () => crypto.randomUUID() } },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await initializeUser(db, user.id);
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await initializeUser(db, session.userId);
        },
      },
    },
  },
});
