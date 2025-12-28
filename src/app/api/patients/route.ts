import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { createHttpClient, requestWithRetry } from "@/lib/http";
import { normalizePatientsPayload, Patient } from "@/lib/normalize";
import { cacheExists, readPatientsCache, writePatientsCache } from "@/lib/patientStore";

type UpstreamPatientsResponse = {
  data: unknown;
  pagination?: unknown;
  metadata?: unknown;
};

function getQueryInt(req: NextRequest, key: string, fallback: number): number {
  const v = req.nextUrl.searchParams.get(key);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  const config = await loadConfig();
  const page = getQueryInt(req, "page", 1);
  const limit = getQueryInt(req, "limit", config.api.pageLimit);

  const useCache = config.cache.useLocalCache && (await cacheExists(config.cache.patientsFilePath));

  if (useCache) {
    const cache = await readPatientsCache(config.cache.patientsFilePath);
    const total = cache.patients.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const end = start + limit;

    const sliced = cache.patients.slice(start, end);
    return NextResponse.json({
      data: sliced,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      },
      metadata: {
        source: "cache",
        generated_at: cache.metadata.generated_at
      }
    });
  }

  const client = createHttpClient(config);

  const result = await requestWithRetry(client, config, async () => {
    const res = await client.get<UpstreamPatientsResponse>("/patients", { params: { page, limit } });
    return res.data;
  });

  const { patients, pagination } = normalizePatientsPayload(result);

  const cacheFile = config.cache.patientsFilePath;
  let merged: Patient[] = [];
  if (await cacheExists(cacheFile)) {
    const existing = await readPatientsCache(cacheFile);
    const map = new Map<string, Patient>();
    for (const p of existing.patients) map.set(p.patient_id, p);
    for (const p of patients) map.set(p.patient_id, p);
    merged = Array.from(map.values());
  } else {
    merged = patients;
  }
  await writePatientsCache(cacheFile, merged, "api");

  return NextResponse.json({
    data: patients,
    pagination: pagination ?? {
      page,
      limit,
      total: undefined,
      totalPages: undefined,
      hasNext: undefined,
      hasPrevious: undefined
    },
    metadata: {
      source: "api",
      cached_count: merged.length
    }
  });
}
