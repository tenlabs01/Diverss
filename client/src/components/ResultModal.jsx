import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from "recharts";
import Gauge from "./Gauge.jsx";

const COLORS = ["#24d3b6", "#2b7fff", "#ffb020", "#ff6b6b", "#6b7280", "#845ef7"];

export default function ResultModal({ open, analysis, form, onRestart, onClose }) {
  if (!open || !analysis) return null;

  const currentData = toPercentData(form.allocation);
  const suggestedData = toChartData(analysis.suggestedAllocation);

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-hidden px-4 py-6">
      <div className="no-print w-full max-w-5xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl bg-white shadow-card">
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-ink-600/10 bg-white/95 px-6 py-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Portfolio Analysis</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">{form.name || "Your"} results</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="rounded-full border border-ink-600/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-900 transition hover:-translate-y-0.5"
              title="Opens print dialog. Choose Save as PDF."
            >
              Download Report (PDF)
            </button>
            <button
              onClick={() => {
                onClose();
                onRestart();
              }}
              className="rounded-full bg-ink-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5"
            >
              Restart Analysis
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 sm:px-8">
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-ink-600/10 bg-sand-100 p-4 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Risk score</h3>
            <Gauge value={analysis.riskScore} />
          </div>
          <div className="rounded-2xl border border-ink-600/10 bg-white p-4 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Diversification</h3>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
                <span>Score</span>
                <span>{analysis.diversificationScore}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sand-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mint-500 to-ocean-500 transition-all duration-500"
                  style={{ width: `${analysis.diversificationScore}%` }}
                />
              </div>
              <p className="mt-4 text-sm text-ink-600">
                {analysis.diversificationScore > 70
                  ? "Well diversified across asset classes."
                  : "There is room to spread risk further."}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-600/10 bg-white p-4 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Allocation shift</h3>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buildDelta(currentData, suggestedData)}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Bar dataKey="delta" fill="#2b7fff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-600/10 bg-white p-4 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Current allocation</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {currentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-600/10 bg-white p-4 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Suggested allocation</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={suggestedData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {suggestedData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <SummaryList title="Strengths" items={analysis.summary.strengths} accent="text-mint-600" />
          <SummaryList title="Weaknesses" items={analysis.summary.weaknesses} accent="text-red-500" />
          <SummaryList title="Recommended adjustments" items={analysis.summary.adjustments} accent="text-ocean-600" />
          </div>
        </div>
      </div>

      <div className="print-only mx-auto w-full max-w-4xl rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-semibold text-ink-900">Portfolio Analyzer Report</h2>
        <p className="mt-2 text-sm text-ink-600">
          Generated for {form.name || "Investor"} on {new Date().toLocaleDateString()}.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink-600/10 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Risk score</h3>
            <p className="mt-2 text-3xl font-semibold text-ink-900">{analysis.riskScore}</p>
          </div>
          <div className="rounded-2xl border border-ink-600/10 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Diversification</h3>
            <p className="mt-2 text-3xl font-semibold text-ink-900">{analysis.diversificationScore}</p>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">Summary</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-700">
            {[...analysis.summary.strengths, ...analysis.summary.weaknesses, ...analysis.summary.adjustments].map(
              (item, index) => (
                <li key={`summary-${index}`}>{item}</li>
              )
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SummaryList({ title, items, accent }) {
  return (
    <div className="rounded-2xl border border-ink-600/10 bg-white p-4 shadow-soft">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-600">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-ink-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex items-start gap-2 text-ink-700">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${accent}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function toChartData(allocation) {
  return Object.entries(allocation).map(([key, value]) => ({
    name: labelize(key),
    value: Number(value)
  }));
}

function toPercentData(allocation) {
  const entries = Object.entries(allocation || {});
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (total <= 0) {
    return entries.map(([key]) => ({ name: labelize(key), value: 0 }));
  }
  return entries.map(([key, value]) => ({
    name: labelize(key),
    value: Number(((Number(value || 0) / total) * 100).toFixed(2))
  }));
}

function labelize(key) {
  const map = {
    mutualFunds: "Mutual Funds",
    realEstate: "Real Estate",
    bonds: "Bonds"
  };
  if (map[key]) return map[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function buildDelta(current, suggested) {
  return current.map((entry) => {
    const match = suggested.find((item) => item.name === entry.name);
    const delta = match ? Math.round(match.value - entry.value) : 0;
    return { name: entry.name, delta };
  });
}
