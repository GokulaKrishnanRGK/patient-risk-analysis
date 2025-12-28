import {NextRequest, NextResponse} from "next/server";
import {promises as fs} from "fs";
import {loadConfig} from "@/lib/config";
import {createHttpClient, requestWithRetry} from "@/lib/http";

type SubmitBody = {
  confirmText?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validateAlertsShape(alerts: any): alerts is {
  high_risk_patients: string[];
  fever_patients: string[];
  data_quality_issues: string[];
} {
  if (!alerts || typeof alerts !== "object") return false;

  const hr = alerts.high_risk_patients;
  const fv = alerts.fever_patients;
  const dq = alerts.data_quality_issues;

  const isStringArray = (x: any) => Array.isArray(x) && x.every((i) => typeof i === "string");

  return isStringArray(hr) && isStringArray(fv) && isStringArray(dq);
}

function hasDuplicates(arr: string[]): boolean {
  return new Set(arr).size !== arr.length;
}

export async function POST(req: NextRequest) {
  const config = await loadConfig();

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({success: false, message: "Invalid JSON body"}, {status: 400});
  }

  const confirmText = isNonEmptyString(body.confirmText) ? body.confirmText.trim().toUpperCase() : "";
  if (confirmText !== "SUBMIT") {
    return NextResponse.json(
        {success: false, message: 'Confirmation required. Type "SUBMIT".'},
        {status: 400}
    );
  }

  let analysisRaw: string;
  try {
    analysisRaw = await fs.readFile(config.cache.analysisFilePath, "utf-8");
  } catch {
    return NextResponse.json(
        {success: false, message: "No analysis found. Run /api/analysis/start first."},
        {status: 409}
    );
  }

  let analysis: any;
  try {
    analysis = JSON.parse(analysisRaw);
  } catch {
    return NextResponse.json(
        {success: false, message: "analysis.json not structured. Re-run /api/analysis/start."},
        {status: 500}
    );
  }

  const alerts = analysis?.alerts;
  if (!validateAlertsShape(alerts)) {
    return NextResponse.json(
        {success: false, message: "Analysis alerts missing. Re-run /api/analysis/start."},
        {status: 500}
    );
  }

  if (hasDuplicates(alerts.high_risk_patients) || hasDuplicates(alerts.fever_patients) || hasDuplicates(alerts.data_quality_issues)) {
    return NextResponse.json(
        {success: false, message: "Analysis contains duplicate patient IDs."},
        {status: 500}
    );
  }

  if (hasDuplicates(alerts.high_risk_patients) || hasDuplicates(alerts.fever_patients) || hasDuplicates(alerts.data_quality_issues)) {
    return NextResponse.json(
        {success: false, message: "Duplicate patient IDs. Re-run analysis."},
        {status: 500}
    );
  }

  const client = createHttpClient(config);

  try {
    const upstreamResponse = await requestWithRetry(client, config, async () => {
      const res = await client.post("/submit-assessment", alerts, {
        headers: {"Content-Type": "application/json"}
      });
      return res.data;
    });

    return NextResponse.json({
      success: true,
      submitted: {
        high_risk_patients: alerts.high_risk_patients.length,
        fever_patients: alerts.fever_patients.length,
        data_quality_issues: alerts.data_quality_issues.length
      },
      upstream: upstreamResponse
    });
  } catch (err: any) {
    const status = err?.response?.status ?? 502;
    return NextResponse.json(
        {
          success: false,
          message: "Upstream submit failed.",
          upstreamStatus: status,
          upstreamBody: err?.response?.data ?? null
        },
        {status: 502}
    );
  }
}
