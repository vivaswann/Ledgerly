export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin"),
    host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    const configured = process.env.BETTER_AUTH_URL;
    const allowed = configured
      ? [new URL(configured).origin]
      : process.env.NODE_ENV === "production"
        ? []
        : ["http://127.0.0.1:3000", "http://localhost:3000"];
    return url.host === host && allowed.includes(url.origin);
  } catch {
    return false;
  }
}
