"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { AnalysisResponse } from "@/lib/uiTypes";

export function useAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startMsg, setStartMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/analysis");
      const payload: AnalysisResponse = res.data;

      if (!payload.scored && Array.isArray((payload as any).scored_patients)) {
        payload.scored = (payload as any).scored_patients.map((p: any) => ({
          patient_id: p.patient_id,
          total: p?.scores?.total ?? p?.total ?? 0,
          flags: p?.flags ?? { dataQualityIssue: false, fever: false, highRisk: false },
          metrics: p?.metrics ?? null
        }));
      }

      setAnalysis(payload);
    } catch {
      setAnalysis(null);
      setError("No analysis found. Click “Start analysis”.");
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback(async () => {
    setStartLoading(true);
    setStartMsg(null);
    setError(null);
    try {
      await api.post("/api/analysis/start");
      setStartMsg("Analysis generated.");
      await refresh();
    } catch (e: any) {
      setStartMsg(null);
      setError(e?.message ?? "Failed to start analysis");
    } finally {
      setStartLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { analysis, loading, error, start, startLoading, startMsg, refresh };
}
