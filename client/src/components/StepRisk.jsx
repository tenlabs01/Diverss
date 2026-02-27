import InputCard from "./InputCard.jsx";

const options = [
  {
    title: "Conservative",
    description: "Prioritize capital preservation."
  },
  {
    title: "Moderate",
    description: "Balance growth with stability."
  },
  {
    title: "Aggressive",
    description: "Seek higher growth and volatility."
  }
];

export default function StepRisk({ value, onSelect, onNext }) {
  const canContinue = Boolean(value);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Step 6</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-900">
          How would you describe your risk appetite?
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {options.map((option) => (
          <InputCard
            key={option.title}
            title={option.title}
            description={option.description}
            selected={value === option.title}
            onClick={() => onSelect(option.title)}
          />
        ))}
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
