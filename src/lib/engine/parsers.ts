import { Patient } from "@/lib/normalize";

export type ParseResult =
    | { ok: true; values: Record<string, number>; raw?: unknown }
    | { ok: false; reason: string; raw?: unknown };

export type ParserFn = (patient: Patient, fields: string[]) => ParseResult;

export const parsers: Record<string, ParserFn> = {
  numberLenient: (patient, fields) => {
    const field = fields[0];
    const raw = (patient as any)[field];

    if (raw === null || raw === undefined) return { ok: false, reason: "missing", raw };

    if (typeof raw === "number" && Number.isFinite(raw)) return { ok: true, values: { [field]: raw }, raw };

    if (typeof raw === "string") {
      const t = raw.trim();
      if (!t) return { ok: false, reason: "empty", raw };
      const n = Number(t);
      if (Number.isFinite(n)) return { ok: true, values: { [field]: n }, raw };
    }

    return { ok: false, reason: "non-numeric", raw };
  },

  bpSlashParser: (patient, fields) => {
    const field = fields[0];
    const raw = (patient as any)[field];

    if (typeof raw !== "string") return { ok: false, reason: "missing-or-not-string", raw };
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, reason: "empty", raw };

    const m = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!m) return { ok: false, reason: "bad-format", raw };

    const systolic = Number(m[1]);
    const diastolic = Number(m[2]);
    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return { ok: false, reason: "nan", raw };

    return { ok: true, values: { systolic, diastolic }, raw };
  }
};
