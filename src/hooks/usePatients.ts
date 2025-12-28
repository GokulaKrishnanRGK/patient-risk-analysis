"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { PatientsResponse, Patient } from "@/lib/uiTypes";

export function usePatients(limit: number) {
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<PatientsResponse["pagination"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PatientsResponse>("/api/patients", { params: { page: p, limit } });
      setPatients(res.data.data);
      setPagination(res.data.pagination);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPatients(page);
  }, [page, fetchPatients]);

  const prev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const next = useCallback(() => setPage((p) => p + 1), []);

  return { page, setPage, patients, pagination, loading, error, fetchPatients, prev, next };
}
