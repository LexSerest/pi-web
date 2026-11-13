import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_MODE_ALIAS_STORAGE_KEY,
  ADMIN_MODE_STORAGE_KEY,
  isAdminModeEnabled,
  isPathInsideDirectory,
  parseAdminModeValue,
} from "./access-mode.ts";

function storage(values) {
  return { getItem: (key) => values[key] ?? null };
}

test("admin mode is off unless the browser stored a truthy value", () => {
  assert.equal(ADMIN_MODE_STORAGE_KEY, "pi-web:admin-mode");
  assert.equal(ADMIN_MODE_ALIAS_STORAGE_KEY, "admin-mode");
  for (const value of [null, undefined, "", " ", "0", " false ", "FALSE"]) {
    assert.equal(parseAdminModeValue(value), false, JSON.stringify(value));
  }
  for (const value of ["1", "true", "yes", "on", " TRUE "]) {
    assert.equal(parseAdminModeValue(value), true, JSON.stringify(value));
  }
  assert.equal(isAdminModeEnabled(null), false);
  assert.equal(isAdminModeEnabled(storage({})), false);
  assert.equal(isAdminModeEnabled(storage({ [ADMIN_MODE_STORAGE_KEY]: "1" })), true);
  // The short key the switch was described with works too.
  assert.equal(isAdminModeEnabled(storage({ [ADMIN_MODE_ALIAS_STORAGE_KEY]: "true" })), true);
  assert.equal(isAdminModeEnabled(storage({ [ADMIN_MODE_STORAGE_KEY]: "0", [ADMIN_MODE_ALIAS_STORAGE_KEY]: "1" })), true);
});

test("a storage that throws counts as a regular user", () => {
  assert.equal(isAdminModeEnabled({ getItem: () => { throw new Error("blocked"); } }), false);
});

test("the fixed folder holds itself and its descendants, never a name that merely starts the same", () => {
  assert.equal(isPathInsideDirectory("/work/app", "/work/app"), true);
  assert.equal(isPathInsideDirectory("/work/app/sub/file.ts", "/work/app"), true);
  assert.equal(isPathInsideDirectory("/work/app/", "/work/app"), true);
  assert.equal(isPathInsideDirectory("/work/app/sub", "/work/app/"), true);
  assert.equal(isPathInsideDirectory("/work/application", "/work/app"), false);
  assert.equal(isPathInsideDirectory("/work", "/work/app"), false);
  assert.equal(isPathInsideDirectory("/work/app", "/work"), true);
  assert.equal(isPathInsideDirectory("/any", "/"), true);
  // Windows paths compare with either separator and ignore case.
  assert.equal(isPathInsideDirectory("C:\\Work\\App\\sub", "c:/work/app"), true);
  assert.equal(isPathInsideDirectory("C:\\Work\\Application", "c:/work/app"), false);
  assert.equal(isPathInsideDirectory("\\\\server\\share\\dir", "\\\\server\\share"), true);
  assert.equal(isPathInsideDirectory("/work/app", ""), false);
});
