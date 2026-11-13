import assert from "node:assert/strict";
import { existsSync } from "node:fs";
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
const previousUploadsDir = process.env.PI_WEB_UPLOADS_DIR;
delete process.env.PI_WEB_UPLOADS_DIR;
test.after(() => {
  if (previousFilesDir === undefined) delete process.env.PI_WEB_FILES_DIR;
  else process.env.PI_WEB_FILES_DIR = previousFilesDir;
  if (previousUploadsDir === undefined) delete process.env.PI_WEB_UPLOADS_DIR;
  else process.env.PI_WEB_UPLOADS_DIR = previousUploadsDir;
});

test("reports home and the configured files directory", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-home-route-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const dir = path.join(base, "files");
  await mkdir(dir);
  process.env.PI_WEB_FILES_DIR = dir;

  assert.deepEqual(await (await GET()).json(), {
    home: homedir(),
    defaultFilesDir: await realpath(dir),
    uploadsDir: null,
  });
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

test("reports the configured uploads directory before it exists", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-home-route-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const uploads = path.join(base, "uploads");

  process.env.PI_WEB_UPLOADS_DIR = uploads;
  assert.equal((await (await GET()).json()).uploadsDir, path.resolve(uploads));
  assert.equal(existsSync(uploads), false, "the GET only names the folder; the upload creates it");

  delete process.env.PI_WEB_UPLOADS_DIR;
  assert.equal((await (await GET()).json()).uploadsDir, null);
});
