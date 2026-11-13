import { NextResponse } from "next/server";
import { homedir } from "os";
import { existingFilesDir } from "@/lib/default-files-dir";
import { configuredUploadsDir } from "@/lib/uploads-dir";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    home: homedir(),
    defaultFilesDir: await existingFilesDir(),
    // The configured chat uploads folder; the client uploads there instead of
    // the working directory. It may not exist yet: the upload route creates it.
    uploadsDir: configuredUploadsDir(),
  });
}
