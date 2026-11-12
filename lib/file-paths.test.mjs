import assert from "node:assert/strict";
import test from "node:test";

async function loadSubject() {
  const { createJiti } = await import("jiti");
  return createJiti(import.meta.url).import("./file-paths.ts");
}

test("encodeFilePathForApi keeps a UNC root inside the first segment", async () => {
  const { encodeFilePathForApi } = await loadSubject();
  // The catch-all route cannot carry a literal "//" prefix — URL routing
  // normalizes it away — so the root is folded into segment one as %2F%2Fhost.
  assert.equal(
    encodeFilePathForApi("\\\\192.0.2.1\\share\\dir"),
    "%2F%2F192.0.2.1/share/dir",
  );
  assert.equal(
    encodeFilePathForApi("//192.0.2.1/share/dir"),
    "%2F%2F192.0.2.1/share/dir",
  );
  assert.equal(
    encodeFilePathForApi("\\\\192.0.2.1\\share"),
    "%2F%2F192.0.2.1/share",
  );
});

test("encodeFilePathForApi encodes drive and POSIX paths per segment", async () => {
  const { encodeFilePathForApi } = await loadSubject();
  assert.equal(encodeFilePathForApi("D:\\repo\\a file.ts"), "D%3A/repo/a%20file.ts");
  assert.equal(encodeFilePathForApi("/tmp/a file.ts"), "tmp/a%20file.ts");
  assert.equal(encodeFilePathForApi("/tmp/dir/"), "tmp/dir");
});

test("getFileName and getFileDirectory handle UNC paths", async () => {
  const { getFileName, getFileDirectory } = await loadSubject();
  assert.equal(getFileName("\\\\host\\share\\dir\\file.ts"), "file.ts");
  assert.equal(getFileDirectory("\\\\host\\share\\dir\\file.ts"), "//host/share/dir");
  assert.equal(getFileDirectory("//host/share/dir"), "//host/share");
});

test("joinFilePath preserves the UNC root", async () => {
  const { joinFilePath } = await loadSubject();
  assert.equal(joinFilePath("\\\\host\\share\\dir", "child"), "//host/share/dir/child");
});

test("getRelativeFilePath strips a UNC cwd prefix", async () => {
  const { getRelativeFilePath } = await loadSubject();
  assert.equal(
    getRelativeFilePath("\\\\host\\share\\dir\\sub\\file.ts", "\\\\host\\share\\dir"),
    "sub/file.ts",
  );
});

test("isFilePathWithin keeps the picker inside its root", async () => {
  const { isFilePathWithin } = await loadSubject();
  assert.equal(isFilePathWithin("/work/app", "/work/app"), true);
  assert.equal(isFilePathWithin("/work/app/sub", "/work/app/"), true);
  assert.equal(isFilePathWithin("/work/app-other", "/work/app"), false);
  assert.equal(isFilePathWithin("/work", "/work/app"), false);
  assert.equal(isFilePathWithin("/work/application", "/work/app"), false);
  // Windows-style paths compare without case, as the filesystem does.
  assert.equal(isFilePathWithin("C:\\Work\\App\\Sub", "c:\\work\\app"), true);
  assert.equal(isFilePathWithin("C:\\Work\\AppOther", "c:\\work\\app"), false);
  assert.equal(isFilePathWithin("\\\\HOST\\Share\\Dir\\Sub", "//host/share/dir"), true);
});
