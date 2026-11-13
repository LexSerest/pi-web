/**
 * The browser's own "admin mode" switch. Without it the page is a regular
 * user's view: no workspace terminal, a fixed `PI_WEB_FILES_DIR` folder, and
 * the General settings section alone. With it, every feature and directory is
 * available as before.
 *
 * This is a UI convenience, never a security boundary: the server routes
 * still answer whoever calls them. It lives in localStorage because it
 * belongs to this browser, not to the server's operator.
 */
export const ADMIN_MODE_STORAGE_KEY = "pi-web:admin-mode";

/**
 * The short key the switch was first described with, accepted as well so
 * `localStorage.setItem("admin-mode", "1")` works. Reading either key is
 * enough; after changing one, reload the page.
 */
export const ADMIN_MODE_ALIAS_STORAGE_KEY = "admin-mode";

interface StorageLike {
  getItem(key: string): string | null;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Any value but empty, `0` or `false` turns it on, as the server's environment
 * switches do, so `1`, `true` and `yes` all work.
 */
export function parseAdminModeValue(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized !== undefined && normalized !== "" && normalized !== "0" && normalized !== "false";
}

/** Whether this browser turned admin mode on; storage failures mean no. */
export function isAdminModeEnabled(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    return parseAdminModeValue(storage.getItem(ADMIN_MODE_STORAGE_KEY))
      || parseAdminModeValue(storage.getItem(ADMIN_MODE_ALIAS_STORAGE_KEY));
  } catch {
    return false;
  }
}

/**
 * Whether `path` is `directory` itself or below it. The two come from the
 * server, so separators may be Windows' or POSIX ones; Windows paths compare
 * case-insensitively, POSIX ones do not. A trailing separator is ignored.
 */
export function isPathInsideDirectory(path: string, directory: string): boolean {
  const normalize = (value: string) => {
    const slashed = value.replace(/\\/g, "/");
    return slashed.length > 1 ? slashed.replace(/\/+$/, "") : slashed;
  };
  let target = normalize(path);
  let root = normalize(directory);
  if (!root) return false;
  if (/^[a-zA-Z]:\//.test(root) || root.startsWith("//")) {
    target = target.toLowerCase();
    root = root.toLowerCase();
  }
  return target === root || target.startsWith(root.endsWith("/") ? root : `${root}/`);
}
