import { Patient } from "@/lib/normalize";
import { Rules } from "@/lib/rules";
import { parsers } from "./parsers";
import { scorers } from "./scorers";

export type EngineMetricOutput = {
  metricId: string;
  points: number;
  state: string | null;
  invalid: boolean;
  invalidReason?: string;
};

export type EnginePatientOutput = {
  patient_id: string;
  total: number;
  metrics: Record<string, EngineMetricOutput>;
  flags: {
    dataQualityIssue: boolean;
    fever: boolean;
    highRisk: boolean;
  };
  assignedList: "data_quality_issues" | "high_risk_patients" | "fever_patients" | "none";
};

export function runEngine(patients: Patient[], rules: Rules) {
  const alerts = {
    high_risk_patients: [] as string[],
    fever_patients: [] as string[],
    data_quality_issues: [] as string[]
  };

  const scored: EnginePatientOutput[] = [];

  for (const p of patients) {
    let total = 0;
    let anyQualityIssue = false;

    const metricOutputs: Record<string, EngineMetricOutput> = {};

    for (const metric of rules.metrics) {
      const parser = parsers[metric.parserId];
      if (!parser) throw new Error(`Unknown parserId: ${metric.parserId} (metric ${metric.id})`);

      const scorer = scorers[metric.scorerId];
      if (!scorer) throw new Error(`Unknown scorerId: ${metric.scorerId} (metric ${metric.id})`);

      const parsed = parser(p, metric.fields);

      if (!parsed.ok) {
        metricOutputs[metric.id] = {
          metricId: metric.id,
          points: metric.invalidPoints,
          state: null,
          invalid: true,
          invalidReason: parsed.reason
        };

        if (metric.invalidCountsAsQualityIssue) anyQualityIssue = true;
        total += metric.invalidPoints;
        continue;
      }

      const score = scorer(metric.rules, parsed.values);

      metricOutputs[metric.id] = {
        metricId: metric.id,
        points: score.points,
        state: score.state,
        invalid: false
      };

      total += score.points;
    }

    const temp = p.temperature;
    const fever =
        typeof temp === "number" &&
        Number.isFinite(temp) &&
        temp >= rules.thresholds.feverTempMinInclusive;

    const highRisk = total >= rules.thresholds.highRiskTotalScoreMinInclusive;

    if (highRisk) alerts.high_risk_patients.push(p.patient_id);
    if (fever) alerts.fever_patients.push(p.patient_id);
    if (anyQualityIssue) alerts.data_quality_issues.push(p.patient_id);

    let assignedList: EnginePatientOutput["assignedList"] = "none";
    if (anyQualityIssue) assignedList = "data_quality_issues";
    else if (highRisk) assignedList = "high_risk_patients";
    else if (fever) assignedList = "fever_patients";


    scored.push({
      patient_id: p.patient_id,
      total,
      metrics: metricOutputs,
      flags: {
        dataQualityIssue: anyQualityIssue,
        fever,
        highRisk
      },
      assignedList
    });
  }

  return { scored, alerts };
}
