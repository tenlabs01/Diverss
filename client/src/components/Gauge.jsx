export default function Gauge({ value }) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 80;
  const circumference = Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="130" viewBox="0 0 220 130">
        <g transform="translate(110,110)">
          <path
            d={`M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0`}
            fill="none"
            stroke="#e5eaf4"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d={`M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </g>
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#24d3b6" />
            <stop offset="100%" stopColor="#2b7fff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="-mt-8 text-center">
        <p className="text-3xl font-semibold text-ink-900">{normalized}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Risk score</p>
      </div>
    </div>
  );
}
