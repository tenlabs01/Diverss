const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export default function StepSubmit({
  form,
  allocationTotal,
  allocationValid,
  isSubmitting,
  submitProgress,
  error,
  onSubmit
}) {
  const ready =
    form.name.trim() &&
    form.age &&
    form.maritalStatus &&
    form.riskAppetite &&
    form.horizon &&
    allocationValid;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Step 8</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-900">Ready to analyze?</h2>
        <p className="mt-2 text-sm text-ink-600">
          Review your details and generate the analysis.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Name" value={form.name || "-"} />
        <SummaryCard label="Age" value={form.age} />
        <SummaryCard label="Marital status" value={form.maritalStatus || "-"} />
        <SummaryCard label="Risk appetite" value={form.riskAppetite || "-"} />
        <SummaryCard label="Horizon" value={form.horizon || "-"} />
        <SummaryCard
          label="Allocation total"
          value={currency.format(Math.round(allocationTotal))}
          highlight={allocationValid}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative h-28 w-28">
                <div className="absolute inset-0 rounded-full border-4 border-sand-200" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-r-mint-500 border-t-ocean-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-ink-900">{submitProgress}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">
                  Analyzing portfolio
                </p>
                <p className="mt-2 text-sm text-ink-600">
                  Evaluating risk alignment, diversification, and exposure balance.
                </p>
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
                  <span>Progress</span>
                  <span>{submitProgress}%</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sand-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-mint-500 to-ocean-500 transition-all duration-200"
                    style={{ width: `${submitProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!ready || isSubmitting}
        className="rounded-full bg-ink-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-600"
      >
        {isSubmitting ? "Analyzing..." : "Analyze Portfolio"}
      </button>
    </div>
  );
}

function SummaryCard({ label, value, highlight = true }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-soft ${
        highlight ? "border-ink-600/10 bg-white" : "border-red-200 bg-red-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}
