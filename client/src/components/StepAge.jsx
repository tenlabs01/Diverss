export default function StepAge({ age, onChange, onNext }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Step 3</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-900">How old are you?</h2>
      </div>
      <div className="rounded-2xl border border-ink-600/10 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-ink-700">Age</span>
          <span className="text-2xl font-semibold text-ink-900">{age}</span>
        </div>
        <input
          type="range"
          min="18"
          max="80"
          value={age}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-4 w-full accent-mint-500"
        />
      </div>
      <button
        onClick={onNext}
        className="rounded-full bg-ink-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-ink-800"
      >
        Continue
      </button>
    </div>
  );
}
