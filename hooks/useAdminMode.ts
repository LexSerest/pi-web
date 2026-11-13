"use client";

import { useSyncExternalStore } from "react";
import {
  ADMIN_MODE_ALIAS_STORAGE_KEY,
  ADMIN_MODE_STORAGE_KEY,
  isAdminModeEnabled,
} from "@/lib/access-mode";

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ADMIN_MODE_STORAGE_KEY || event.key === ADMIN_MODE_ALIAS_STORAGE_KEY) {
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/**
 * Admin mode as this browser last stored it. The server snapshot is the
 * regular user's view, so the first paint never waits on storage; a storage
 * event from another tab switches the page, while the same tab applies a
 * change on reload.
 */
export function useAdminMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isAdminModeEnabled(),
    () => false,
  );
}
