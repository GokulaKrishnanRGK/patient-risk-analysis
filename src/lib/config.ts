import {promises as fs} from "fs";
import path from "path";

export type AppConfig = {
  api: {
    baseUrl: string;
    apiKey: string;
    pageLimit: number;
    timeoutsMs: number;
  };
  cache: {
    useLocalCache: boolean;
    patientsFilePath: string;
    analysisFilePath: string;
    rulesFilePath: string;
  };
  retry: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    jitterRatio: number;
  };
};

function resolveProjectPath(p: string): string {
  if (path.isAbsolute(p)) return p;

  return path.join(process.cwd(), "src", p.replace(/^\.?\//, ""));
}

export async function loadConfig(): Promise<AppConfig> {
  const configPath = resolveProjectPath("./data/config.json");
  const raw = await fs.readFile(configPath, "utf-8");
  const parsed = JSON.parse(raw) as AppConfig;

  const baseUrl = process.env.API_BASE_URL;
  const apiKey = process.env.API_KEY;

  if (!baseUrl) throw new Error("Missing env API_BASE_URL");
  if (!apiKey) throw new Error("Missing env API_KEY");
  if (!parsed?.cache?.patientsFilePath) throw new Error("config.cache.patientsFilePath missing");
  if (!parsed?.cache?.analysisFilePath) throw new Error("config.cache.analysisFilePath missing");
  if (!parsed?.cache?.rulesFilePath) throw new Error("config.cache.rulesFilePath missing");
  if (!parsed?.retry) throw new Error("config.retry missing");

  parsed.cache.patientsFilePath = resolveProjectPath(parsed.cache.patientsFilePath);
  parsed.cache.analysisFilePath = resolveProjectPath(parsed.cache.analysisFilePath);
  parsed.cache.rulesFilePath = resolveProjectPath(parsed.cache.rulesFilePath);

  return {
    ...parsed,
    api: {
      ...parsed.api,
      baseUrl,
      apiKey
    }
  };
}
