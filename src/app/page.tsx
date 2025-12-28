"use client";

import React, {useMemo, useState} from "react";
import {PageHeader} from "@/components/PageHeader";
import {PatientsTable} from "@/components/PatientsTable";
import {AnalysisPanel} from "@/components/AnalysisPanel";
import {SubmitPanel} from "@/components/SubmitPanel";
import {usePatients} from "@/hooks/usePatients";
import {useAnalysis} from "@/hooks/useAnalysis";
import {api} from "@/lib/client";

export default function HomePage() {
  const limit = 5;

  const {
    patients,
    pagination,
    loading: patientsLoading,
    error: patientsError,
    prev,
    next,
    fetchPatients,
    page
  } =
      usePatients(limit);

  const {
    analysis,
    loading: analysisLoading,
    error: analysisError,
    start,
    startLoading,
    startMsg,
    refresh
  } =
      useAnalysis();

  const [confirmText, setConfirmText] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isConfirmed = confirmText.trim().toUpperCase() === "SUBMIT";

  const submitDisabled = useMemo(() => {
    return submitLoading || !analysis?.alerts || confirmText.trim().toUpperCase() !== "SUBMIT";
  }, [submitLoading, analysis, confirmText]);

  async function onStartAnalysis() {
    await start();
    await fetchPatients(page);
  }

  async function onSubmit() {
    setSubmitError(null);
    setSubmitResult(null);

    if (!analysis?.alerts) {
      setSubmitError("No analysis available. Run analysis first.");
      return;
    }
    if (confirmText.trim().toUpperCase() !== "SUBMIT") {
      setSubmitError('Type "SUBMIT" to confirm.');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await api.post("/api/submit", {confirmText});
      setSubmitResult(res.data);
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message ?? e?.message ?? "Submit failed");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader/>

          <PatientsTable
              patients={patients}
              pagination={pagination}
              loading={patientsLoading}
              error={patientsError}
              analysis={analysis}
              onPrev={prev}
              onNext={next}
          />

          <AnalysisPanel
              analysis={analysis}
              loading={analysisLoading}
              error={analysisError}
              onStart={onStartAnalysis}
              onRefresh={refresh}
              startLoading={startLoading}
              startMsg={startMsg}
          />

          <SubmitPanel
              confirmText={confirmText}
              onConfirmTextChange={setConfirmText}
              onSubmit={onSubmit}
              disabled={submitDisabled}
              loading={submitLoading}
              error={submitError}
              result={submitResult}
              isConfirmed={isConfirmed}
          />
        </div>
      </main>
  );
}
