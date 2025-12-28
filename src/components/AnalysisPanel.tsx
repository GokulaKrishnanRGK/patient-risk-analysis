import React, {useMemo} from "react";
import type {AnalysisResponse} from "@/lib/uiTypes";

export function AnalysisPanel({
                                analysis,
                                loading,
                                error,
                                onStart,
                                onRefresh,
                                startLoading,
                                startMsg
                              }: Readonly<{
  analysis: AnalysisResponse | null;
  loading: boolean;
  error: string | null;
  onStart: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  startLoading: boolean;
  startMsg: string | null;
}>) {
  const alertsJson = useMemo(() => {
    return analysis?.alerts ? JSON.stringify(analysis.alerts, null, 2) : "";
  }, [analysis]);

  const dq = analysis?.alerts?.data_quality_issues?.length ?? 0;
  const hr = analysis?.alerts?.high_risk_patients?.length ?? 0;
  const fv = analysis?.alerts?.fever_patients?.length ?? 0;

  return (
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-900">Analysis</div>
          </div>

          <div className="flex items-center gap-2">
            <button
                onClick={onStart}
                disabled={startLoading}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {startLoading ? "Running..." : "Start analysis"}
            </button>

            <button
                onClick={onRefresh}
                disabled={loading}
                className="rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh analysis"}
            </button>
          </div>
        </div>

        {startMsg && <div className="mt-3 text-sm text-emerald-700">{startMsg}</div>}
        {error && <div className="mt-3 text-sm text-rose-700">{error}</div>}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-slate-700">Data quality</div>
            <div className="text-2xl font-semibold text-slate-900">{dq}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-slate-700">High risk</div>
            <div className="text-2xl font-semibold text-slate-900">{hr}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-slate-700">Fever</div>
            <div className="text-2xl font-semibold text-slate-900">{fv}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-slate-700">Raw alerts JSON</div>
          <pre
              className="max-h-80 overflow-auto rounded-lg border bg-slate-50 p-3 text-xs text-slate-800">
          {alertsJson || "—"}
        </pre>
        </div>
      </section>
  );
}
