import { test } from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../src/lib/services/request-security";
import { schemas } from "../src/lib/validations";
test("origin validation uses browser host, independent of framework internal URL", () => {
  const previous = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = "http://127.0.0.1:3100";
  assert.equal(
    sameOrigin(
      new Request("http://localhost:3100/api/account", {
        headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
      }),
    ),
    true,
  );
  for (const origin of ["https://evil.test", "http://127.0.0.1:3000", "null"])
    assert.equal(
      sameOrigin(
        new Request("http://localhost:3100/api/account", {
          headers: { host: "127.0.0.1:3100", origin },
        }),
      ),
      false,
    );
  if (previous === undefined) delete process.env.BETTER_AUTH_URL;
  else process.env.BETTER_AUTH_URL = previous;
});
test("dates reject invalid calendar days and parse local input in India timezone", () => {
  const base = {
    type: "Expense",
    amount: "1",
    accountId: "a",
    description: "Test",
    categoryId: "c",
    paymentMethod: "Other",
  };
  assert.equal(
    schemas.transaction
      .parse({ ...base, date: "2026-10-01T00:10" })
      .date.toISOString(),
    "2026-09-30T18:40:00.000Z",
  );
  assert.equal(
    schemas.transaction.safeParse({ ...base, date: "2026-02-30" }).success,
    false,
  );
});
