import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

// Keep the machine's git configuration out of the answer: a global excludes
// file could hide the dotfiles these tests expect to see.
const root = mkdtempSync(path.join(tmpdir(), "pi-web-file-index-route-"));
const agentDir = path.join(root, "agent");
mkdirSync(agentDir);
writeFileSync(path.join(root, "gitconfig"), "");
process.env.GIT_CONFIG_NOSYSTEM = "1";
process.env.GIT_CONFIG_GLOBAL = path.join(root, "gitconfig");
process.env.XDG_CONFIG_HOME = path.join(root, "xdg");
process.env.GIT_CEILING_DIRECTORIES = root;

const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
const previousHideDotfiles = process.env.PI_WEB_HIDE_DOTFILES;
process.env.PI_CODING_AGENT_DIR = agentDir;
delete process.env.PI_WEB_HIDE_DOTFILES;
test.after(() => {
  if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
  if (previousHideDotfiles === undefined) delete process.env.PI_WEB_HIDE_DOTFILES;
  else process.env.PI_WEB_HIDE_DOTFILES = previousHideDotfiles;
  rmSync(root, { recursive: true, force: true });
});

const jiti = createJiti(import.meta.url, {
  alias: { "@": process.cwd() },
  interopDefault: true,
  moduleCache: false,
});
const { GET } = await jiti.import("./route.ts");
const { allowFileRoot } = await jiti.import("@/lib/file-access.ts");
const { NextRequest } = await jiti.import("next/server");

let fixtureCount = 0;
function repo() {
  const directory = path.join(root, `repo-${++fixtureCount}`);
  mkdirSync(path.join(directory, ".github", "workflows"), { recursive: true });
  mkdirSync(path.join(directory, "src"), { recursive: true });
  writeFileSync(path.join(directory, ".env"), "SECRET=1\n");
  writeFileSync(path.join(directory, ".github", "workflows", "ci.yml"), "name: ci\n");
  writeFileSync(path.join(directory, "src", "index.ts"), "export {};\n");
  execFileSync("git", ["-C", directory, "init", "-q"]);
  allowFileRoot(directory);
  return directory;
}

async function files(directory) {
  const response = await GET(new NextRequest(
    `http://localhost/api/file-index?cwd=${encodeURIComponent(directory)}`,
  ));
  assert.equal(response.status, 200);
  return (await response.json()).files.sort();
}

test("PI_WEB_HIDE_DOTFILES removes dot-named paths from the file index", async () => {
  const plain = repo();
  assert.deepEqual(await files(plain), [".env", ".github/workflows/ci.yml", "src/index.ts"]);

  const hidden = repo();
  process.env.PI_WEB_HIDE_DOTFILES = "1";
  assert.deepEqual(await files(hidden), ["src/index.ts"]);
  delete process.env.PI_WEB_HIDE_DOTFILES;
});
