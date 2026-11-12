import assert from "node:assert/strict";
import test from "node:test";
import { isTerminalDisabledByOperator } from "./terminal-availability.ts";

test("PI_WEB_DISABLE_TERMINAL turns the terminal off for any value but empty, 0, or false", () => {
  assert.equal(isTerminalDisabledByOperator({}), false);
  for (const value of ["", " ", "0", "false", "FALSE"]) {
    assert.equal(isTerminalDisabledByOperator({ PI_WEB_DISABLE_TERMINAL: value }), false, JSON.stringify(value));
  }
  for (const value of ["1", "true", "yes", "on"]) {
    assert.equal(isTerminalDisabledByOperator({ PI_WEB_DISABLE_TERMINAL: value }), true, value);
  }
});
