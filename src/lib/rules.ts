import { promises as fs } from "fs";

export type RangeRule = {
  minInclusive?: number;
  minExclusive?: number;
  maxInclusive?: number;
  maxExclusive?: number;
};

export type MetricRule = {
  state: string;
  points: number;
  logic?: "AND" | "OR";
  rule: Record<string, RangeRule>;
};

export type MetricConfig = {
  id: string;
  label?: string;
  fields: string[];
  parserId: string;
  scorerId: string;
  rules: MetricRule[];
  invalidPoints: number;
  invalidCountsAsQualityIssue: boolean;
};

export type Rules = {
  version: string;
  thresholds: {
    highRiskTotalScoreMinInclusive: number;
    feverTempMinInclusive: number;
  };
  metrics: MetricConfig[];
};

export async function loadRules(rulesPath: string): Promise<Rules> {
  const raw = await fs.readFile(rulesPath, "utf-8");
  const parsed = JSON.parse(raw) as Rules;

  if (!parsed?.metrics?.length) throw new Error("rules.metrics missing/empty");
  if (!parsed?.thresholds) throw new Error("rules.thresholds missing");
  for (const m of parsed.metrics) {
    if (!m.id) throw new Error("metric.id missing");
    if (!m.parserId) throw new Error(`metric.parserId missing: ${m.id}`);
    if (!m.scorerId) throw new Error(`metric.scorerId missing: ${m.id}`);
    if (!Array.isArray(m.fields) || m.fields.length === 0) throw new Error(`metric.fields missing: ${m.id}`);
    if (!Array.isArray(m.rules)) throw new Error(`metric.rules missing: ${m.id}`);
  }
  return parsed;
}
