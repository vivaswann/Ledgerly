import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "@/lib/security-headers";
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(18)),
  ).toString("base64");
  const csp = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
    process.env.BETTER_AUTH_URL?.startsWith("https://") === true,
  );
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
