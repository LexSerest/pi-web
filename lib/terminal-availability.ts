export const TERMINAL_DISABLE_VARIABLE = "PI_WEB_DISABLE_TERMINAL";

/**
 * Whether the operator hid the workspace terminal for the whole server. Any
 * value other than empty, `0`, or `false` counts, as with
 * `PI_WEB_DISABLE_MCP`: a switch that guards a server should not be undone by
 * spelling `yes` instead of `1`.
 *
 * This is a UI switch, not a security boundary: the agent's shell tools, `!`
 * commands and MCP servers still run commands.
 */
export function isTerminalDisabledByOperator(environment: NodeJS.ProcessEnv = process.env): boolean {
  const value = environment[TERMINAL_DISABLE_VARIABLE]?.trim().toLowerCase();
  return value !== undefined && value !== "" && value !== "0" && value !== "false";
}
