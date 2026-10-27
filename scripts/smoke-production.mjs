const origin = "http://127.0.0.1:3000";
for (const path of [
  "/",
  "/transactions",
  "/monthly-recap",
  "/investments",
  "/splits",
  "/accounts",
  "/categories",
  "/settings",
]) {
  const response = await fetch(origin + path, { redirect: "manual" });
  const body = await response.text();
  const redirect =
    response.status === 307 && response.headers.get("location") === "/login";
  const streamed =
    response.status === 200 &&
    /<meta[^>]*id="__next-page-redirect"[^>]*content="\d+;url=\/login"/.test(
      body,
    );
  if (!redirect && !streamed)
    throw Error(`Unprotected or broken route: ${path} (${response.status})`);
  console.log(`${path}: redirects to sign-in`);
}
for (const path of ["/login", "/signup"]) {
  const response = await fetch(origin + path);
  if (response.status !== 200) throw Error(`Auth page failed: ${path}`);
  console.log(`${path}: 200`);
}
const csv = await fetch(origin + "/api/export");
if (csv.status !== 401) throw Error("Unauthenticated export was not rejected");
const mutation = await fetch(origin + "/api/account", {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({ name: "Must not be created" }),
});
if (mutation.status !== 401)
  throw Error("Unauthenticated write was not rejected");
console.log("Export and writes reject unauthenticated requests (401).");
