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
const { configuredFilesDir, existingFilesDir, FILES_DIR_VARIABLE } = await jiti.import("./default-files-dir.ts");

test("PI_WEB_FILES_DIR expands ~ and ignores blank values", () => {
  assert.equal(FILES_DIR_VARIABLE, "PI_WEB_FILES_DIR");
  assert.equal(configuredFilesDir({}), null);
  assert.equal(configuredFilesDir({ PI_WEB_FILES_DIR: "  " }), null);
  assert.equal(
    configuredFilesDir({ PI_WEB_FILES_DIR: "~/projects" }),
    path.resolve(homedir(), "projects"),
  );
  assert.equal(
    configuredFilesDir({ PI_WEB_FILES_DIR: path.join("~", "a", "b") }),
    path.resolve(homedir(), "a", "b"),
  );
  assert.equal(
    configuredFilesDir({ PI_WEB_FILES_DIR: path.join(path.sep, "work", "shared") }),
    path.resolve(path.sep, "work", "shared"),
  );
});

test("only an existing directory is offered to the browser", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-files-dir-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const dir = path.join(base, "files");
  const file = path.join(base, "file.txt");
  await mkdir(dir);
  await writeFile(file, "x");

  assert.equal(await existingFilesDir({ PI_WEB_FILES_DIR: dir }), await realpath(dir));
  assert.equal(await existingFilesDir({ PI_WEB_FILES_DIR: file }), null);
  assert.equal(await existingFilesDir({ PI_WEB_FILES_DIR: path.join(base, "missing") }), null);
  assert.equal(await existingFilesDir({}), null);
});

test("the configured directory is allowed before any session exists", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "pi-web-files-root-test-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const agentDir = path.join(base, "agent");
  const filesDir = path.join(base, "files");
  await mkdir(agentDir);
  await mkdir(filesDir);
  const realFilesDir = await realpath(filesDir);

  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  const previousFilesDir = process.env.PI_WEB_FILES_DIR;
  process.env.PI_CODING_AGENT_DIR = agentDir;
  process.env.PI_WEB_FILES_DIR = filesDir;
  t.after(() => {
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    if (previousFilesDir === undefined) delete process.env.PI_WEB_FILES_DIR;
    else process.env.PI_WEB_FILES_DIR = previousFilesDir;
  });

  const { getAllowedFileRoots } = await jiti.import("./file-access.ts");
  const { samePath } = await jiti.import("./paths.ts");
  const roots = await getAllowedFileRoots();
  assert.ok([...roots].some((root) => samePath(root, realFilesDir)), "the configured folder is an allowed root");
});
