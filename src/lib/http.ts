import axios, {AxiosError, AxiosInstance} from "axios";
import {AppConfig} from "./config";

export function createHttpClient(config: AppConfig): AxiosInstance {
  return axios.create({
    baseURL: config.api.baseUrl,
    timeout: config.api.timeoutsMs,
    headers: {
      "x-api-key": config.api.apiKey
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function withJitter(ms: number, jitterRatio: number): number {
  const jitter = ms * jitterRatio;
  const offset = (Math.random() * 2 - 1) * jitter;
  return Math.max(0, Math.floor(ms + offset));
}

function getRetryAfterMs(err: AxiosError): number | null {
  const ra = err.response?.headers?.["retry-after"];
  if (ra) {
    const seconds = Number(ra);
    if (!Number.isNaN(seconds) && seconds >= 0) return seconds * 1000;

    const dt = Date.parse(String(ra));
    if (!Number.isNaN(dt)) {
      const diff = dt - Date.now();
      return diff > 0 ? diff : 0;
    }
  }
  const data: any = err.response?.data;
  const bodyRetryAfter = data?.retry_after;

  const seconds = typeof bodyRetryAfter === "number"
      ? bodyRetryAfter
      : typeof bodyRetryAfter === "string"
          ? Number(bodyRetryAfter)
          : NaN;

  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  return null;
}


function isRetryableStatus(status?: number): boolean {
  if (!status) return false;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}


export async function requestWithRetry<T>(
    client: AxiosInstance,
    config: AppConfig,
    fn: () => Promise<T>
): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= config.retry.maxRetries) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const err = e as AxiosError;
      const status = err.response?.status;
      const retryable = err.code === "ECONNABORTED" || err.code === "ETIMEDOUT" || isRetryableStatus(status);

      if (!retryable) throw e;

      if (attempt === config.retry.maxRetries) break;

      const retryAfter = err.response ? getRetryAfterMs(err) : null;
      const exponential = config.retry.baseDelayMs * Math.pow(2, attempt);
      const delay = retryAfter ?? clamp(exponential, config.retry.baseDelayMs, config.retry.maxDelayMs);
      console.warn(`[retry] status=${status ?? "n/a"} attempt=${attempt + 1}/${config.retry.maxRetries}`);
      await sleep(withJitter(delay, config.retry.jitterRatio));

      attempt += 1;
    }
  }

  throw lastErr;
}
