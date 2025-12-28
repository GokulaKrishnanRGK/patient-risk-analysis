export type RawPatient = Record<string, unknown>;

export type Patient = {
  patient_id: string;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  blood_pressure?: string | null;
  temperature?: number | null;
  visit_date?: string | null;
  diagnosis?: string | null;
  medications?: string | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
};

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function asNumberLenient(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractPatientId(raw: RawPatient): string | null {
  const direct = asString(raw["patient_id"]);
  if (direct) return direct;

  const alt1 = asString(raw["patientId"]);
  if (alt1) return alt1;

  const alt2 = asString(raw["id"]);
  if (alt2) return alt2;

  const patientObj = raw["patient"];
  if (patientObj && typeof patientObj === "object") {
    const nested = asString((patientObj as any)["patient_id"]) ?? asString((patientObj as any)["id"]);
    if (nested) return nested;
  }

  return null;
}

export function normalizePatient(raw: RawPatient): Patient | null {
  const patientId = extractPatientId(raw);
  if (!patientId) return null;

  const base: any = raw["patient"] && typeof raw["patient"] === "object" ? (raw["patient"] as any) : raw;

  return {
    patient_id: patientId,
    name: asString(base["name"]),
    age: asNumberLenient(base["age"]),
    gender: asString(base["gender"]),
    blood_pressure: asString(base["blood_pressure"]),
    temperature: asNumberLenient(base["temperature"]),
    visit_date: asString(base["visit_date"]),
    diagnosis: asString(base["diagnosis"]),
    medications: asString(base["medications"])
  };
}

function extractRawPatients(payload: unknown): RawPatient[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.filter((x) => x && typeof x === "object") as RawPatient[];
  }

  if (typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;

  const data = obj["data"];
  if (Array.isArray(data)) {
    return data.filter((x) => x && typeof x === "object") as RawPatient[];
  }
  if (data && typeof data === "object") {
    return [data as RawPatient];
  }

  const patients = obj["patients"];
  if (Array.isArray(patients)) {
    return patients.filter((x) => x && typeof x === "object") as RawPatient[];
  }


  const result = obj["result"];
  if (Array.isArray(result)) {
    return result.filter((x) => x && typeof x === "object") as RawPatient[];
  }
  if (result && typeof result === "object") {
    const nestedData = (result as any)["data"];
    if (Array.isArray(nestedData)) {
      return nestedData.filter((x: any) => x && typeof x === "object") as RawPatient[];
    }
  }

  return [];
}

export function normalizePatientsPayload(payload: unknown): {
  patients: Patient[];
  pagination: Pagination | null;
  debug: { extractedRawCount: number; normalizedCount: number; droppedCount: number };
} {
  const rawPatients = extractRawPatients(payload);

  const patients: Patient[] = [];
  let dropped = 0;

  for (const item of rawPatients) {
    const p = normalizePatient(item);
    if (p) patients.push(p);
    else dropped += 1;
  }

  let pagination: Pagination | null = null;

  if (payload && typeof payload === "object") {
    const obj = payload as any;

    const pr =
        obj.pagination ??
        obj.pageInfo ??
        obj.meta?.pagination ??
        obj.metadata?.pagination ??
        obj;

    if (pr && typeof pr === "object") {
      const pageRaw = pr.page ?? pr.currentPage ?? pr.current_page ?? pr.current_page_index ?? pr.current_page_number;
      const limitRaw = pr.limit ?? pr.pageSize ?? pr.page_size ?? pr.per_page ?? pr.perPage;

      const totalRaw = pr.total ?? pr.totalCount ?? pr.total_count ?? pr.total_records ?? pr.totalRecords;
      const totalPagesRaw = pr.totalPages ?? pr.total_pages;

      const page = Number(pageRaw);
      const limit = Number(limitRaw);

      const totalNum = typeof totalRaw === "number" ? totalRaw : Number(totalRaw);
      const total = Number.isFinite(totalNum) ? totalNum : undefined;

      let totalPages: number | undefined =
          typeof totalPagesRaw === "number" ? totalPagesRaw : Number(totalPagesRaw);

      if (!Number.isFinite(totalPages as number)) totalPages = undefined;
      if (!totalPages && total !== undefined && Number.isFinite(limit) && limit > 0) {
        totalPages = Math.max(1, Math.ceil(total / limit));
      }

      let hasNext: boolean | undefined = typeof pr.hasNext === "boolean" ? pr.hasNext : undefined;
      let hasPrevious: boolean | undefined = typeof pr.hasPrevious === "boolean" ? pr.hasPrevious : undefined;

      const safePage = Number.isFinite(page) ? page : 1;
      const safeLimit = Number.isFinite(limit) ? limit : patients.length;

      if (hasNext === undefined && totalPages !== undefined) hasNext = safePage < totalPages;
      if (hasPrevious === undefined && totalPages !== undefined) hasPrevious = safePage > 1;

      pagination = {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext,
        hasPrevious
      };
    }
  }


  return {
    patients,
    pagination,
    debug: {
      extractedRawCount: rawPatients.length,
      normalizedCount: patients.length,
      droppedCount: dropped
    }
  };
}
