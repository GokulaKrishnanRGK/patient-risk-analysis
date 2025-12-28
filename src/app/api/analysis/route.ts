import {NextResponse} from "next/server";
import {loadConfig} from "@/lib/config";
import {promises as fs} from "fs";

export async function GET() {
  const config = await loadConfig();

  try {
    const raw = await fs.readFile(config.cache.analysisFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
        {success: false, message: "No analysis found. Run POST /api/analysis/start first."},
        {status: 404}
    );
  }
}
