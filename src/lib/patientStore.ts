import { promises as fs } from "fs";
import path from "path";
import { Patient, Pagination } from "./normalize";

export type PatientsCacheFile = {
  metadata: {
    generated_at: string;
    source: "api" | "cache";
    note?: string;
  };
  patients: Patient[];
};

async function ensureDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function cacheExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readPatientsCache(filePath: string): Promise<PatientsCacheFile> {
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as PatientsCacheFile;
  if (!Array.isArray(parsed?.patients)) throw new Error("patients cache file invalid");
  return parsed;
}

export async function writePatientsCache(filePath: string, patients: Patient[], source: "api" | "cache"): Promise<void> {
  await ensureDir(filePath);
  const payload: PatientsCacheFile = {
    metadata: {
      generated_at: new Date().toISOString(),
      source
    },
    patients
  };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}
