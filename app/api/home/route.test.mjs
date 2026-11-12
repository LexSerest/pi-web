import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { "@": process.cwd() },
  interopDefault: true,
  moduleCache: false,
});
const { GET } = await jiti.import("./route.ts");

const previousFilesDir = process.env.PI_WEB_FILES_DIR;
test.after(() => {
  if (previousFilesDir === undefined) delete process.env.PI_WEB_FILES_DIR;
  else process.env.PI_WEB_FILES_DIR = previousFilesDir;
});

test("reports home and the configured files directory", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-home-route-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const dir = path.join(base, "files");
  await mkdir(dir);
  process.env.PI_WEB_FILES_DIR = dir;

  assert.deepEqual(await (await GET()).json(), { home: homedir(), defaultFilesDir: await realpath(dir) });
});

test("a missing directory, a file or no value leaves the fallback unset", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-home-route-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const file = path.join(base, "file.txt");
  await writeFile(file, "x");

  process.env.PI_WEB_FILES_DIR = path.join(base, "missing");
  assert.equal((await (await GET()).json()).defaultFilesDir, null);

  process.env.PI_WEB_FILES_DIR = file;
  assert.equal((await (await GET()).json()).defaultFilesDir, null);

  delete process.env.PI_WEB_FILES_DIR;
  assert.equal((await (await GET()).json()).defaultFilesDir, null);
});
