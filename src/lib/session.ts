import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
export const requireUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session.user;
});
