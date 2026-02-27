export default function StepName({ name, onChange, onNext }) {
  const canContinue = name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Step 2</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-900">What’s your name?</h2>
      </div>
      <input
        value={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter your full name"
        className="w-full rounded-2xl border border-ink-600/20 bg-white px-5 py-4 text-lg text-ink-900 shadow-soft focus:border-mint-500 focus:outline-none"
      />
      <button
        onClick={onNext}
        disabled={!canContinue}
        className="rounded-full bg-ink-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-600"
      >
        Continue
      </button>
    </div>
  );
}
