import InputCard from "./InputCard.jsx";

const options = [
  {
    title: "< 3 years",
    description: "Short-term focus"
  },
  {
    title: "3-7 years",
    description: "Medium-term planning"
  },
  {
    title: "7-15 years",
    description: "Long-term growth"
  },
  {
    title: "15+ years",
    description: "Legacy building"
  }
];

export default function StepHorizon({ value, onSelect, onNext }) {
  const canContinue = Boolean(value);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Step 7</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-900">
          How long do you plan to stay invested?
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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
