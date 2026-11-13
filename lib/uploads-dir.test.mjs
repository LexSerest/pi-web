import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { "@": process.cwd() },
  interopDefault: true,
  moduleCache: false,
});
const { configuredUploadsDir, ensureUploadsDir, UPLOADS_DIR_VARIABLE } = await jiti.import("./uploads-dir.ts");

test("PI_WEB_UPLOADS_DIR expands ~ and ignores blank values", () => {
  assert.equal(UPLOADS_DIR_VARIABLE, "PI_WEB_UPLOADS_DIR");
  assert.equal(configuredUploadsDir({}), null);
  assert.equal(configuredUploadsDir({ PI_WEB_UPLOADS_DIR: "  " }), null);
  assert.equal(
    configuredUploadsDir({ PI_WEB_UPLOADS_DIR: "~/pi-uploads" }),
    path.resolve(homedir(), "pi-uploads"),
  );
  assert.equal(
    configuredUploadsDir({ PI_WEB_UPLOADS_DIR: path.join("~", "a", "b") }),
    path.resolve(homedir(), "a", "b"),
  );
  assert.equal(
    configuredUploadsDir({ PI_WEB_UPLOADS_DIR: path.join("relative", "uploads") }),
    path.resolve("relative", "uploads"),
  );
});

test("ensureUploadsDir creates a missing folder and returns it through links", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-uploads-dir-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const uploads = path.join(base, "nested", "uploads");

  assert.equal(await ensureUploadsDir({}), null);
  assert.equal(await ensureUploadsDir({ PI_WEB_UPLOADS_DIR: "  " }), null);
  assert.equal(await ensureUploadsDir({ PI_WEB_UPLOADS_DIR: uploads }), await realpath(uploads));
  assert.equal((await stat(uploads)).isDirectory(), true);
});

test("a file at the configured path is refused instead of replaced", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-uploads-dir-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const file = path.join(base, "uploads");
  await writeFile(file, "x");

  await assert.rejects(ensureUploadsDir({ PI_WEB_UPLOADS_DIR: file }));
});

test("the uploads folder is an allowed file root before it exists", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-uploads-root-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const agentDir = path.join(base, "agent");
  const uploads = path.join(base, "uploads");
  await mkdir(agentDir);

  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  const previousUploadsDir = process.env.PI_WEB_UPLOADS_DIR;
  const previousFilesDir = process.env.PI_WEB_FILES_DIR;
  const previousRoots = globalThis.__piAllowedRootsCache;
  process.env.PI_CODING_AGENT_DIR = agentDir;
  process.env.PI_WEB_UPLOADS_DIR = uploads;
  delete globalThis.__piAllowedRootsCache;
  t.after(() => {
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    if (previousUploadsDir === undefined) delete process.env.PI_WEB_UPLOADS_DIR;
    else process.env.PI_WEB_UPLOADS_DIR = previousUploadsDir;
    if (previousFilesDir === undefined) delete process.env.PI_WEB_FILES_DIR;
    else process.env.PI_WEB_FILES_DIR = previousFilesDir;
    globalThis.__piAllowedRootsCache = previousRoots;
  });

  const { getAllowedFileRoots } = await jiti.import("./file-access.ts");
  const { samePath } = await jiti.import("./paths.ts");
  const roots = await getAllowedFileRoots();
  assert.ok([...roots].some((root) => samePath(root, uploads)), "the configured folder is an allowed root");
});
