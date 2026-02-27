export default function ProgressBar({ step, total }) {
  const progress = Math.round((step / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-mint-500 to-ocean-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
