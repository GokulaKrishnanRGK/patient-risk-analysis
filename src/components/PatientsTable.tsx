import React, {useMemo} from "react";
import type {AnalysisResponse, Patient, PatientsResponse} from "@/lib/uiTypes";
import {RiskBadges} from "@/components/RiskBadges";

export function PatientsTable({
                                patients,
                                pagination,
                                loading,
                                error,
                                analysis,
                                onPrev,
                                onNext
                              }: Readonly<{
  patients: Patient[];
  pagination: PatientsResponse["pagination"] | null;
  loading: boolean;
  error: string | null;
  analysis: AnalysisResponse | null;
  onPrev: () => void;
  onNext: () => void;
}>) {
  const scoredById = useMemo(() => {
    const map = new Map<
        string,
        { total: number; highRisk: boolean; fever: boolean; dataQuality: boolean }
    >();

    const scored = analysis?.scored ?? [];
    for (const s of scored) {
      if (!s?.patient_id) continue;
      map.set(s.patient_id, {
        total: s.total ?? 0,
        highRisk: !!s.flags?.highRisk,
        fever: !!s.flags?.fever,
        dataQuality: !!s.flags?.dataQualityIssue
      });
    }
    return map;
  }, [analysis]);

  return (
      <section className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900">Patients</div>
            <div className="text-xs text-slate-600">
              Page {pagination?.page ?? "—"}
              {pagination?.totalPages ? ` of ${pagination.totalPages}` : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
                className="rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                disabled={loading || !(pagination?.hasPrevious ?? false)}
                onClick={onPrev}
            >
              Previous
            </button>
            <button
                className="rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                disabled={loading || !(pagination?.hasNext ?? false)}
                onClick={onNext}
            >
              Next
            </button>
          </div>
        </div>

        {error && <div className="mb-3 text-sm text-rose-700">{error}</div>}

        <div className="overflow-auto rounded-lg border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">Patient ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Age</th>
              <th className="px-3 py-2">BP</th>
              <th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">Tags</th>
            </tr>
            </thead>

            <tbody className="divide-y">
            {loading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-600" colSpan={6}>
                    Loading...
                  </td>
                </tr>
            ) : patients.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-600" colSpan={6}>
                    No patients found.
                  </td>
                </tr>
            ) : (
                patients.map((p) => {
                  const s = scoredById.get(p.patient_id) ?? null;
                  const total = s ? s.total : null;

                  const rowCls =
                      s?.dataQuality ? "bg-yellow-50" : s?.highRisk ? "bg-red-50" : s?.fever ? "bg-orange-50" : "";

                  return (
                      <tr key={p.patient_id} className={rowCls}>
                        <td className="px-3 py-2 font-medium text-slate-900">{p.patient_id}</td>
                        <td className="px-3 py-2 text-slate-700">{p.name ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{p.age ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{p.blood_pressure ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{p.temperature ?? "—"}</td>
                        <td className="px-3 py-2">
                          <RiskBadges
                              total={total}
                              isHighRisk={!!s?.highRisk}
                              isFever={!!s?.fever}
                              isDataQuality={!!s?.dataQuality}
                          />
                        </td>
                      </tr>
                  );
                })
            )}
            </tbody>
          </table>
        </div>
      </section>
  );
}
