import React from "react";

function Badge({label, variant}: Readonly<{
  label: string;
  variant: "yellow" | "red" | "orange" | "slate"
}>) {
  const cls =
      variant === "yellow"
          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
          : variant === "red"
              ? "bg-red-100 text-red-800 border-red-200"
              : variant === "orange"
                  ? "bg-orange-100 text-orange-800 border-orange-200"
                  : "bg-slate-100 text-slate-800 border-slate-200";

  return (
      <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function RiskBadges({
                             total,
                             isHighRisk,
                             isFever,
                             isDataQuality
                           }: Readonly<{
  total: number | null;
  isHighRisk: boolean;
  isFever: boolean;
  isDataQuality: boolean;
}>) {
  if (total === null) return <Badge label="—" variant="slate"/>;

  return (
      <div className="flex flex-wrap gap-1">
        <Badge label={`Total: ${total}`} variant="slate"/>
        {isHighRisk && <Badge label="High risk" variant="red"/>}
        {isFever && <Badge label="Fever" variant="orange"/>}
        {isDataQuality && <Badge label="Data quality" variant="yellow"/>}
      </div>
  );
}
