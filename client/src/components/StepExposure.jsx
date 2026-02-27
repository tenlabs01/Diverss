import AllocationSlider from "./AllocationSlider.jsx";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const rows = [
  { key: "stocks", label: "Stocks" },
  { key: "mutualFunds", label: "Mutual Funds" },
  { key: "gold", label: "Gold" },
  { key: "bonds", label: "Fixed Income / Bonds" },
  { key: "cash", label: "Cash" },
  { key: "realEstate", label: "Real Estate (Optional)" }
];

export default function StepExposure({ allocation, total, valid, onChange, onNext }) {
  const palette = ["#24d3b6", "#2b7fff", "#ffb020", "#ff6b6b", "#6b7280", "#845ef7"];
  const breakdown = rows.map((row, index) => {
    const value = Number(allocation[row.key] || 0);
    const percent = total > 0 ? (value / total) * 100 : 0;
    return { ...row, value, percent, color: palette[index % palette.length] };
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Step 5</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink-900">Portfolio exposure</h2>
        <p className="mt-1 text-sm text-ink-600">
          Enter investment amounts in INR. We will calculate the allocation breakdown automatically.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-600/10 bg-white p-3 shadow-soft">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
          <span>Allocation breakup</span>
          <span>{currency.format(total)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand-200">
          <div className="flex h-full w-full">
            {breakdown.map((item) =>
              item.percent > 0 ? (
                <div
                  key={item.key}
                  style={{ width: `${item.percent}%`, background: item.color }}
                />
              ) : null
            )}
            {total === 0 && <div className="h-full w-full bg-sand-200" />}
          </div>
        </div>
        <div className="mt-2 grid gap-x-4 gap-y-1 text-xs text-ink-600 sm:grid-cols-2 lg:grid-cols-3">
          {breakdown.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                {item.label}
              </span>
              <span>{item.percent.toFixed(0)}%</span>
            </div>
          ))}
        </div>
        {!valid && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
            Add amounts to continue
          </p>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {breakdown.map((row) => (
          <AllocationSlider
            key={row.key}
            label={row.label}
            value={row.value}
            percent={row.percent}
            onChange={(value) => onChange(row.key, value)}
          />
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!valid}
        className="rounded-full bg-ink-900 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-600"
      >
        Continue
      </button>
    </div>
  );
}
