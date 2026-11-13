import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { dropMentionText, loadUploadsDir, splitDroppedItems } = await jiti.import("./file-upload-client.ts");

const file = (name, type = "") => new File(["x"], name, { type });

test("a chat drop attaches images, uploads other files, and leaves folders out", () => {
  const photo = file("photo.png", "image/png");
  const notes = file("notes.md", "text/markdown");
  const data = file("data.bin");
  const result = splitDroppedItems([
    { kind: "file", file: photo },
    { kind: "file", file: notes },
    { kind: "folder", name: "src" },
    { kind: "file", file: data },
  ]);
  assert.deepEqual(result.images, [photo]);
  assert.deepEqual(result.files, [notes, data]);
  assert.deepEqual(result.folders, ["src"]);
});

test("mentions follow the drop order and only name files now in the working directory", () => {
  const files = [file("b.txt"), file("my notes.md"), file("failed.log"), file("a.txt")];
  assert.equal(
    dropMentionText(files, ["a.txt", "my notes.md", "b.txt"]),
    '@b.txt @"my notes.md" @a.txt ',
  );
  assert.equal(dropMentionText(files, []), "");
});

test("files uploaded outside the working directory are mentioned by absolute path", () => {
  const files = [file("b.txt"), file("my notes.md"), file("failed.log")];
  assert.equal(
    dropMentionText(files, ["b.txt", "my notes.md"], "/tmp/pi uploads"),
    '@"/tmp/pi uploads/b.txt" @"/tmp/pi uploads/my notes.md" ',
  );
});

test("the uploads folder is asked for once per page", async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return { json: async () => ({ uploadsDir: "/tmp/pi-uploads" }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  assert.equal(await loadUploadsDir(), "/tmp/pi-uploads");
  assert.equal(await loadUploadsDir(), "/tmp/pi-uploads");
  assert.equal(calls, 1);
});
