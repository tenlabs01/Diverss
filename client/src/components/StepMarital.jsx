import InputCard from "./InputCard.jsx";

export default function StepMarital({ value, onSelect, onNext }) {
  const canContinue = Boolean(value);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Step 4</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-900">What’s your marital status?</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputCard
          title="Single"
          description="Solo financial planning"
          selected={value === "Single"}
          onClick={() => onSelect("Single")}
        />
        <InputCard
          title="Married"
          description="Shared financial planning"
          selected={value === "Married"}
          onClick={() => onSelect("Married")}
        />
      </div>
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
