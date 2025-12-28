import React from "react";

export function SubmitPanel({
                              confirmText,
                              onConfirmTextChange,
                              onSubmit,
                              disabled,
                              loading,
                              error,
                              result,
                              isConfirmed
                            }: Readonly<{
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  onSubmit: () => Promise<void> | void;
  disabled: boolean;
  loading: boolean;
  error: string | null;
  result: any;
  isConfirmed: boolean;
}>) {
  return (
      <section className="rounded-xl border bg-white p-4">
        <div className="mb-2">
          <div className="text-sm font-medium text-slate-900">Submit assessment</div>
          <div className="text-xs text-slate-600">
            Type <span className="font-mono">SUBMIT</span> to confirm.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
              value={confirmText}
              onChange={(e) => onConfirmTextChange(e.target.value)}
              placeholder='Type "SUBMIT"'
              className={`w-48 rounded-lg border px-3 py-2 text-sm
                          ${isConfirmed ? "border-emerald-500 bg-emerald-50" : "bg-white"}
                          text-slate-900 placeholder-slate-400
                          outline-none focus:ring-2 focus:ring-slate-300`}/>
          <button
              onClick={onSubmit}
              disabled={disabled}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>

        {error && <div className="mt-3 text-sm text-rose-700">{error}</div>}

        {result && (
            <div className="mt-3">
              <div className="mb-2 text-xs font-semibold text-slate-700">Submit response</div>
              <pre
                  className="max-h-80 overflow-auto rounded-lg border bg-slate-50 p-3 text-xs text-slate-800">
            {JSON.stringify(result, null, 2)}
          </pre>
            </div>
        )}
      </section>
  );
}
