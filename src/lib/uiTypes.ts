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

export type PatientsResponse = {
  data: Patient[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
  metadata?: Record<string, unknown>;
};

export type AnalysisResponse = {
  metadata?: Record<string, unknown>;
  alerts?: {
    high_risk_patients: string[];
    fever_patients: string[];
    data_quality_issues: string[];
  };
  scored?: Array<{
    patient_id: string;
    total: number;
    flags: {
      dataQualityIssue: boolean;
      fever: boolean;
      highRisk: boolean;
    };
    assignedList?: "data_quality_issues" | "high_risk_patients" | "fever_patients" | "none";
    metrics?: Record<string, any>;
  }>;
  scored_patients?: any[];
};
