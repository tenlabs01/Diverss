export default function InputCard({ title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col rounded-2xl border px-5 py-4 text-left transition hover:-translate-y-0.5 ${
        selected
          ? "border-mint-500 bg-mint-500/10 shadow-soft"
          : "border-ink-600/10 bg-white"
      }`}
    >
      <span className="text-lg font-semibold text-ink-900">{title}</span>
      {description && <span className="mt-1 text-sm text-ink-600">{description}</span>}
    </button>
  );
}
