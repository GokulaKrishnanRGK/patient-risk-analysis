import {NextResponse} from "next/server";
import {loadConfig} from "@/lib/config";
import {createHttpClient, requestWithRetry} from "@/lib/http";
import {normalizePatientsPayload, Patient} from "@/lib/normalize";
import {cacheExists, readPatientsCache, writePatientsCache} from "@/lib/patientStore";
import {loadRules} from "@/lib/rules";
import {runEngine} from "@/lib/engine";
import {promises as fs} from "fs";
import path from "path";

type UpstreamPatientsResponse = {
  data: unknown;
  pagination?: unknown;
  metadata?: unknown;
};

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), {recursive: true});
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}


export async function POST() {
  const config = await loadConfig();
  const cacheFile = config.cache.patientsFilePath;

  let patients: Patient[] = [];
  let source: "api" | "cache" = "cache";

  const hasCache = await cacheExists(cacheFile);

  if (config.cache.useLocalCache && hasCache) {
    const cache = await readPatientsCache(cacheFile);
    patients = cache.patients;
    source = "cache";
  } else {
    source = "api";
    const client = createHttpClient(config);

    const all: Patient[] = [];
    let page = 1;
    const limit = config.api.pageLimit;

    let expectedTotal: number | null = null;
    let totalPages: number | null = null;
    let emptyPagesInARow = 0;

    while (true) {
      let payload: UpstreamPatientsResponse;

      try {
        payload = await requestWithRetry(client, config, async () => {
          const res = await client.get<UpstreamPatientsResponse>("/patients", {
            params: {
              page,
              limit
            }
          });
          return res.data;
        });
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 429) {
          return NextResponse.json(
              {
                success: false,
                message: "Upstream API rate limit exceeded. Try again later. (429)",
                pageFailed: page
              },
              {status: 429}
          );
        }
        throw err;
      }

      const normalized = normalizePatientsPayload(payload);
      console.log(`[fetch-all] page=${page} extracted=${normalized.debug.extractedRawCount} normalized=${normalized.debug.normalizedCount} dropped=${normalized.debug.droppedCount}`);

      const pagePatients = normalized.patients;

      if (normalized.pagination?.totalPages && Number.isFinite(normalized.pagination.totalPages)) {
        totalPages = normalized.pagination.totalPages;
      }
      if (typeof normalized.pagination?.total === "number" && Number.isFinite(normalized.pagination.total)) {
        expectedTotal = normalized.pagination.total;
      }

      if (pagePatients.length === 0) emptyPagesInARow += 1;
      else emptyPagesInARow = 0;

      for (const p of pagePatients) all.push(p);

      if (totalPages !== null) {
        if (page >= totalPages) break;
      } else if (expectedTotal !== null) {
        const uniqueCount = new Set(all.map((x) => x.patient_id)).size;
        if (uniqueCount >= expectedTotal) break;
        if (emptyPagesInARow >= 2) break;
      } else {
        if (emptyPagesInARow >= 2) break;
      }
      page += 1;
      await sleep(400);
    }

    const map = new Map<string, Patient>();
    for (const p of all) map.set(p.patient_id, p);
    patients = Array.from(map.values());

    await writePatientsCache(cacheFile, patients, "api");
  }

  const rules = await loadRules(config.cache.rulesFilePath);
  const {scored, alerts} = runEngine(patients, rules);

  await ensureDir(config.cache.analysisFilePath);

  const analysisPayload = {
    metadata: {
      generated_at: new Date().toISOString(),
      source,
      rules_version: rules.version,
      patient_count: patients.length
    },
    alerts,
    scored_patients: scored
  };

  await fs.writeFile(config.cache.analysisFilePath, JSON.stringify(analysisPayload, null, 2), "utf-8");

  return NextResponse.json({
    success: true,
    metadata: analysisPayload.metadata,
    alerts
  });
}
