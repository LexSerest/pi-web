import { buildAtMentionText } from "./file-fuzzy";
import { encodeFilePathForApi, joinFilePath } from "./file-paths";

/** Browser side of `POST /api/files/[...path]?type=upload`; mirrors `lib/file-upload.ts`. */
export type UploadConflictStrategy = "error" | "overwrite" | "skip";

export interface UploadError {
  name: string;
  error: string;
}

export interface UploadResponse {
  uploaded?: string[];
  skipped?: string[];
  errors?: UploadError[];
  conflicts?: string[];
  nonReplaceable?: string[];
  error?: string;
}

/**
 * Uploads files into one directory through the file API.
 * @param targetDirectory The directory the files are written to
 * @param files The files, written under their own names
 * @param strategy What the server does with a name that already exists
 * @param onProgress Upload progress in percent, when the browser reports it
 * @returns The HTTP status and the parsed response body
 */
export function uploadFiles(
  targetDirectory: string,
  files: File[],
  strategy: UploadConflictStrategy,
  onProgress?: (progress: number) => void,
): Promise<{ status: number; data: UploadResponse }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file, file.name));

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/files/${encodeFilePathForApi(targetDirectory)}?type=upload&conflict=${strategy}`,
    );
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading files"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.onload = () => {
      let data: UploadResponse = {};
      try {
        data = JSON.parse(xhr.responseText) as UploadResponse;
      } catch {
        if (xhr.responseText) data.error = xhr.responseText;
      }
      resolve({ status: xhr.status, data });
    };
    xhr.send(formData);
  });
}

/**
 * The operator's chat uploads folder (PI_WEB_UPLOADS_DIR), asked for once per
 * page from `/api/home`. Null means uploads go to the working directory.
 */
let uploadsDirRequest: Promise<string | null> | null = null;

export function loadUploadsDir(): Promise<string | null> {
  uploadsDirRequest ??= fetch("/api/home")
    .then((response) => response.json())
    .then((data: { uploadsDir?: string | null }) => data.uploadsDir ?? null)
    .catch(() => {
      // A failed lookup falls back to the working directory; ask again on the
      // next drop rather than pinning the page to that answer.
      uploadsDirRequest = null;
      return null;
    });
  return uploadsDirRequest;
}

/** One file or folder dropped onto the chat. */
export type DroppedItem = { kind: "file"; file: File } | { kind: "folder"; name: string };

/**
 * Sorts a chat drop: images are attached to the prompt as before, other files
 * are uploaded into the working directory and mentioned, and folders are left
 * out because the upload endpoint takes files only.
 * @param items The dropped items, in drop order
 * @returns The images, the files to upload, and the names of skipped folders
 */
export function splitDroppedItems(items: DroppedItem[]): { images: File[]; files: File[]; folders: string[] } {
  const images: File[] = [];
  const files: File[] = [];
  const folders: string[] = [];
  for (const item of items) {
    if (item.kind === "folder") folders.push(item.name);
    else if (item.file.type.startsWith("image/")) images.push(item.file);
    else files.push(item.file);
  }
  return { images, files, folders };
}

/**
 * The `@` mentions for files the upload reports as written or already there,
 * in drop order. Without `directory` the files are in the working directory and
 * are mentioned by name; with it (PI_WEB_UPLOADS_DIR) the mention carries the
 * absolute path, since the file is not under the session's cwd.
 * @param files The dropped files
 * @param present Names the upload reports as written or already there
 * @param directory Where the upload landed, when it is not the working directory
 * @returns Mentions ready to insert, or an empty string
 */
export function dropMentionText(files: File[], present: string[], directory?: string): string {
  const names = new Set(present);
  return files
    .filter((file) => names.has(file.name))
    .map((file) => buildAtMentionText(directory ? joinFilePath(directory, file.name) : file.name, false))
    .join("");
}
