"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import type { NewSessionContext, NewSessionTarget, ProjectChoice } from "@/lib/new-session-context";
import { focusIfLost } from "@/lib/stacked-dialog";
import { ProjectWorktreePicker, type ProjectWorktreeControl, type ProjectWorktreePickerHandle } from "./ProjectWorktreePicker";

/** The bar's two controls. A move names the one it came from, which takes focus in the bar that replaces this one. */
export type NewSessionContextControl = ProjectWorktreeControl;

interface Props {
  context: NewSessionContext;
  /** A phone: the menus open as bottom sheets. */
  mobile: boolean;
  /** A regular user (no admin mode): with PI_WEB_FILES_DIR set, the folder is fixed and the picker is not switchable. */
  restricted?: boolean;
  /** The control the move that mounted this bar came from: it takes focus once, if focus fell to the page. */
  initialFocus: NewSessionContextControl | null;
  onInitialFocusDone: () => void;
  /** Start the fresh composer over in `target`; the shell ignores a move to where it already is. */
  onPick: (target: NewSessionTarget, from: NewSessionContextControl) => void;
  /** "Use default directory": today's folder, which goes to `onPick`. */
  onUseDefaultDirectory: () => void;
  /** "Open another project…": the folder picker, which hands its folder to `onPick`. */
  onOpenFolder: (opener: HTMLElement | null) => void;
  onRefreshWorktrees: () => void;
  onCreateWorktree: (project: ProjectChoice, branch: string) => Promise<{ path: string } | { error: string }>;
}

// The home folder the paths (the menus', a detached checkout's in the
// worktree button) show as ~, and PI_WEB_FILES_DIR when the operator set one,
// asked for once per page: the bar mounts again with every move of the fresh
// composer. A set PI_WEB_FILES_DIR also hides "Use default directory", whose
// dated folder would sit outside the folder the picker is confined to.
let homeDirCheck: Promise<void> | null = null;
let homeDirFound = "";
let defaultFilesDirFound: string | null = null;
let homeLoaded = false;
function loadHomeDir(): Promise<void> {
  homeDirCheck ??= fetch("/api/home")
    .then((response) => response.json())
    .then((data: { home?: string; defaultFilesDir?: string | null }) => {
      homeDirFound = data.home ?? "";
      defaultFilesDirFound = data.defaultFilesDir ?? null;
      homeLoaded = true;
    })
    .catch(() => {
      homeDirCheck = null;
    });
  return homeDirCheck;
}

/**
 * The project and worktree a fresh composer starts its session in: a row of
 * its own in the empty new-session page's header, under the brand and right
 * above the composer. The files tab's picker
 * (components/ProjectWorktreePicker.tsx) laid out inline: the project's name
 * and the worktree's branch as text, its group named by the label alone (no
 * visible one: the folder icon says it). Every pick starts the composer over
 * in the new folder (the shell remounts it, carrying the draft and its model
 * picks), so this bar only reports what was chosen; the sidebar keeps the cwd.
 */
export function NewSessionContextBar({
  context,
  mobile,
  restricted = false,
  initialFocus,
  onInitialFocusDone,
  onPick,
  onUseDefaultDirectory,
  onOpenFolder,
  onRefreshWorktrees,
  onCreateWorktree,
}: Props) {
  const { t } = useI18n();
  const [homeDir, setHomeDir] = useState(() => homeDirFound);
  const [defaultFilesDir, setDefaultFilesDir] = useState<string | null>(() => defaultFilesDirFound);
  const pickerRef = useRef<ProjectWorktreePickerHandle>(null);
  // The configured folder is fixed for a regular user; admin mode keeps every switch.
  const locked = restricted && defaultFilesDir !== null;
  const initialFocusRef = useRef(initialFocus);
  const onInitialFocusDoneRef = useRef(onInitialFocusDone);
  onInitialFocusDoneRef.current = onInitialFocusDone;

  useEffect(() => {
    if (homeLoaded) return;
    let cancelled = false;
    void loadHomeDir().then(() => {
      if (cancelled) return;
      if (homeDirFound) setHomeDir(homeDirFound);
      setDefaultFilesDir(defaultFilesDirFound);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The control that moved the composer went away with it: its counterpart
  // here takes focus, so a keyboard user goes on from where they were.
  useEffect(() => {
    const from = initialFocusRef.current;
    if (!from) return;
    initialFocusRef.current = null;
    onInitialFocusDoneRef.current();
    const picker = pickerRef.current;
    focusIfLost(document, (from === "worktree" ? picker?.button("worktree") : null) ?? picker?.button("project") ?? null);
  }, []);

  return (
    <div className="new-session-context">
      <ProjectWorktreePicker
        handleRef={pickerRef}
        layout="inline"
        context={context}
        mobile={mobile}
        label={t("workspace.newSessionContext")}
        homeDir={homeDir}
        locked={locked}
        newWorktreeTitle={t("sidebar.newWorktreeForSession")}
        onPick={onPick}
        onUseDefaultDirectory={locked ? undefined : onUseDefaultDirectory}
        onOpenFolder={onOpenFolder}
        onRefreshWorktrees={onRefreshWorktrees}
        onCreateWorktree={onCreateWorktree}
      />
    </div>
  );
}
