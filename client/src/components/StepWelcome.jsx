export default function StepWelcome({ onNext }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 h-20 w-20 rounded-3xl bg-gradient-to-br from-mint-500 to-ocean-500 p-1 shadow-soft">
        <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-white">
          <span className="text-2xl font-bold text-ink-900">PA</span>
        </div>
      </div>
      <h2 className="text-3xl font-semibold text-ink-900 sm:text-4xl">Let’s Analyze Your Portfolio</h2>
      <p className="mx-auto mt-4 max-w-xl text-base text-ink-600">
        Walk through a guided, step-by-step checkup to understand your current allocation and get a clear,
        actionable rebalancing plan.
      </p>
      <button
        onClick={onNext}
        className="mt-8 rounded-full bg-ink-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-ink-800"
      >
        Start Analysis
      </button>
    </div>
  );
}
