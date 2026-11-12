import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { "@": process.cwd() },
  interopDefault: true,
  moduleCache: false,
});
const { GET, POST } = await jiti.import("./route.ts");

const previousDisable = process.env.PI_WEB_DISABLE_TERMINAL;
test.after(() => {
  if (previousDisable === undefined) delete process.env.PI_WEB_DISABLE_TERMINAL;
  else process.env.PI_WEB_DISABLE_TERMINAL = previousDisable;
});

test("the operator switch hides the terminal and refuses to create one", async () => {
  process.env.PI_WEB_DISABLE_TERMINAL = "1";
  assert.deepEqual(await (await GET()).json(), { enabled: false });

  // Refused before the body is read or a PTY can be spawned: an unparsable
  // body would otherwise reach the route's error handler as a 500.
  const refused = await POST(new Request("http://localhost/api/terminal", {
    method: "POST",
    headers: { host: "localhost", "Content-Type": "application/json" },
    body: "not json",
  }));
  assert.equal(refused.status, 403);
  assert.match((await refused.json()).error, /PI_WEB_DISABLE_TERMINAL/);
});

test("an unset switch reports the terminal as available", async () => {
  delete process.env.PI_WEB_DISABLE_TERMINAL;
  assert.deepEqual(await (await GET()).json(), { enabled: true });
});
