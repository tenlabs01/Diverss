export default function AllocationSlider({ label, value, percent = 0, onChange }) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  const handleInput = (next) => {
    const numeric = Number(next);
    if (Number.isNaN(numeric)) {
      onChange(0);
      return;
    }
    onChange(Math.max(0, numeric));
  };

  return (
    <div className="rounded-xl border border-ink-600/10 bg-white p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-base font-semibold leading-tight text-ink-700">{label}</span>
          <p className="mt-0.5 text-xs text-ink-600">{percent.toFixed(1)}% of total</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-600">₹</span>
          <input
            type="number"
            min="0"
            step="1000"
            value={safeValue}
            onChange={(event) => handleInput(event.target.value)}
            className="w-24 rounded-lg border border-ink-600/20 px-2 py-1 text-right text-sm text-ink-900 focus:border-mint-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
