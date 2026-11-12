import { NextResponse } from "next/server";
import { homedir } from "os";
import { existingFilesDir } from "@/lib/default-files-dir";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    home: homedir(),
    defaultFilesDir: await existingFilesDir(),
  });
}
