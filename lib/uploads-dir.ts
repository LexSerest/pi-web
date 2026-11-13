import { mkdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

// Where files dropped onto the chat (or picked with its attach button) are
// written when the operator wants them out of the project folder. The file
// browser's own Upload button keeps writing to the folder it shows.
export const UPLOADS_DIR_VARIABLE = "PI_WEB_UPLOADS_DIR";

/**
 * The configured path with `~` expanded, or null when unset or blank. A
 * relative path resolves against the server's working directory, as
 * PI_WEB_FILES_DIR does.
 */
export function configuredUploadsDir(environment: NodeJS.ProcessEnv = process.env): string | null {
  const value = environment[UPLOADS_DIR_VARIABLE]?.trim();
  if (!value) return null;
  return resolve(value.replace(/^~(?=$|[\\/])/, homedir()));
}

/**
 * Creates the configured uploads directory when it does not exist yet and
 * returns it resolved through symbolic links. Null when the variable is unset
 * or blank. Throws when the path cannot be created or is not a directory.
 */
export async function ensureUploadsDir(environment: NodeJS.ProcessEnv = process.env): Promise<string | null> {
  const dir = configuredUploadsDir(environment);
  if (!dir) return null;
  await mkdir(dir, { recursive: true });
  const resolved = await realpath(dir);
  if (!(await stat(resolved)).isDirectory()) {
    throw new Error(`Uploads directory is not a directory: ${dir}`);
  }
  return resolved;
}
