import {RangeRule, MetricRule} from "@/lib/rules";

export type ScoreResult = {
  points: number;
  state: string | null;
  matchedRuleIndex: number | null;
};

function matchesRange(value: number, rr: RangeRule): boolean {
  if (typeof rr.minInclusive === "number" && value < rr.minInclusive) return false;
  if (typeof rr.minExclusive === "number" && value <= rr.minExclusive) return false;
  if (typeof rr.maxInclusive === "number" && value > rr.maxInclusive) return false;
  if (typeof rr.maxExclusive === "number" && value >= rr.maxExclusive) return false;
  return true;
}

export type ScorerFn = (metricRules: MetricRule[], parsedValues: Record<string, number>) => ScoreResult;

export const scorers: Record<string, ScorerFn> = {
  singleFieldRangeFirstMatch: (metricRules, parsedValues) => {
    const field = Object.keys(parsedValues)[0];
    const value = parsedValues[field];

    for (let i = 0; i < metricRules.length; i++) {
      const r = metricRules[i];
      const rr = r.rule?.[field];
      if (!rr) continue;
      if (matchesRange(value, rr)) return {points: r.points, state: r.state, matchedRuleIndex: i};
    }

    return {points: 0, state: null, matchedRuleIndex: null};
  },

  bpCategoryMaxScorer: (metricRules, parsedValues) => {
    const systolic = parsedValues["systolic"];
    const diastolic = parsedValues["diastolic"];

    let best: ScoreResult = {points: 0, state: null, matchedRuleIndex: null};

    for (let i = 0; i < metricRules.length; i++) {
      const r = metricRules[i];
      const sysRule = r.rule?.["systolic"];
      const diaRule = r.rule?.["diastolic"];
      if (!sysRule || !diaRule) continue;

      const sysOk = matchesRange(systolic, sysRule);
      const diaOk = matchesRange(diastolic, diaRule);

      const logic = r.logic ?? "OR";
      const matched = logic === "AND" ? (sysOk && diaOk) : (sysOk || diaOk);

      if (matched && r.points > best.points) {
        best = {points: r.points, state: r.state, matchedRuleIndex: i};
      }
    }

    return best;
  }
};
