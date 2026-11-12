import { realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

// The directory the sidebar's files browser falls back to when no project or
// session has picked one. It is a browsing default, not a project: the recent
// project still wins once the session list has one.
export const FILES_DIR_VARIABLE = "PI_WEB_FILES_DIR";

/**
 * The configured path with `~` expanded, or null when unset or blank. A
 * relative path resolves against the server's working directory.
 */
export function configuredFilesDir(environment: NodeJS.ProcessEnv = process.env): string | null {
  const value = environment[FILES_DIR_VARIABLE]?.trim();
  if (!value) return null;
  return resolve(value.replace(/^~(?=$|[\\/])/, homedir()));
}

/**
 * The configured directory if it exists and is a directory, resolved through
 * symbolic links so it matches what the directory browser lists; null
 * otherwise, so a typo leaves the files browser empty instead of showing a
 * broken tree.
 */
export async function existingFilesDir(environment: NodeJS.ProcessEnv = process.env): Promise<string | null> {
  const dir = configuredFilesDir(environment);
  if (!dir) return null;
  try {
    const resolved = await realpath(dir);
    return (await stat(resolved)).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}
