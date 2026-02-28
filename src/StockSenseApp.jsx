import { useEffect, useRef, useState } from "react";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const STOCKSENSE_API = API_BASE
  ? `${API_BASE}/api/stocksense/analyze`
  : "/api/stocksense/analyze";

// ✅ Smart batch size based on portfolio size
const getBatchSize = (total) => {
  if (total <= 10) return total;   // 1-10:  single batch
  if (total <= 30) return 8;       // 11-30: batches of 8
  if (total <= 60) return 7;       // 31-60: batches of 7
  return 6;                        // 60+:   batches of 6 (more batches, safer rate limits)
};

// ✅ Delay between batches based on portfolio size
const getBatchDelay = (total) => {
  if (total <= 10) return 0;       // no delay for small
  if (total <= 30) return 1000;    // 1s for medium
  if (total <= 60) return 2000;    // 2s for large
  return 3000;                     // 3s for very large (100+)
};

const VERDICT_STYLES = {
  "Strong Hold/Add": { bg: "#102a25", border: "#2dd4bf", text: "#2dd4bf", dot: "#2dd4bf" },
  "Hold": { bg: "#1a2a1a", border: "#84cc16", text: "#bef264", dot: "#84cc16" },
  "Hold with Caution": { bg: "#302611", border: "#f59e0b", text: "#fcd34d", dot: "#f59e0b" },
  "Reduce": { bg: "#301d13", border: "#fb923c", text: "#fdba74", dot: "#fb923c" },
  "Exit": { bg: "#2f1117", border: "#f87171", text: "#f87171", dot: "#f87171" },
  "Speculative": { bg: "#102538", border: "#38bdf8", text: "#38bdf8", dot: "#38bdf8" },
};

const HOPE_EMOJI = {
  "Very High": "🔥🔥🔥", "High": "🔥🔥", "Moderate": "🔆",
  "Low": "🔅", "Speculative": "⚡", "Very Low": "❌"
};

const FACTORS = [
  { key: "roceToPe", label: "ROCE/PE", weight: "25%" },
  { key: "revenueGrowth", label: "Revenue", weight: "15%" },
  { key: "rsi", label: "RSI", weight: "15%" },
  { key: "marketCap", label: "Mkt Cap", weight: "10%" },
  { key: "priceToBook", label: "P/B", weight: "10%" },
  { key: "institutionalHolding", label: "FII/DII", weight: "10%" },
  { key: "liquidity", label: "Liquidity", weight: "10%" },
  { key: "eventSensitivity", label: "Events", weight: "5%" },
];

const CSV_HEADER = "Symbol,Quantity,AvgPrice,LTP";
const CSV_STARTER = `${CSV_HEADER}\n`;

function ScoreBar({ value }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? "#2dd4bf" : value >= 3 ? "#f59e0b" : value >= 2 ? "#fb923c" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: "#24324d", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 1s ease" }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 20 }}>{value}</span>
    </div>
  );
}

function StockCard({ stock, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const style = VERDICT_STYLES[stock.verdict] || VERDICT_STYLES["Hold"];
  const isPositive = stock.pnl >= 0;
  return (
    <div onClick={() => setExpanded(!expanded)} style={{
      background: "#111a2e",
      border: `1px solid ${expanded ? style.border : isNew ? style.border : "#24324d"}`,
      borderRadius: 12, padding: "16px 20px", cursor: "pointer",
      transition: "all 0.3s ease", animation: `fadeSlideIn 0.5s ease both`,
      boxShadow: isNew ? `0 0 16px ${style.border}44` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#eef4ff" }}>{stock.symbol}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>{stock.verdict}</span>
          </div>
          <div style={{ fontSize: 12, color: "#9fb0d1", marginTop: 2 }}>{stock.companyName}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#eef4ff" }}>₹{stock.ltp?.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: 12, color: isPositive ? "#2dd4bf" : "#f87171", fontWeight: 600 }}>
            {isPositive ? "+" : ""}₹{Math.abs(stock.pnl)?.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({isPositive ? "+" : ""}{stock.pnlPercent?.toFixed(1)}%)
          </div>
        </div>
        <div style={{ textAlign: "center", minWidth: 70 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `conic-gradient(${style.border} ${(stock.weightedScore / 5) * 360}deg, #24324d 0deg)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#111a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: style.text }}>{stock.weightedScore?.toFixed(1)}</div>
          </div>
          <div style={{ fontSize: 10, color: "#9fb0d1", marginTop: 4 }}>Score</div>
        </div>
        <div style={{ fontSize: 20 }}>{HOPE_EMOJI[stock.hopeLevel] || "🔅"}</div>
        <div style={{ color: "#9fb0d1", fontSize: 18, transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "none" }}>▾</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: "1px solid #24324d", paddingTop: 16, animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#9fb0d1", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Factor Scores</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {FACTORS.map(f => (
                  <div key={f.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: "#93a7cc" }}>{f.label} <span style={{ color: "#6f7fa3" }}>({f.weight})</span></span>
                    </div>
                    <ScoreBar value={stock.scores?.[f.key] || 0} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#9fb0d1", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Analysis</div>
                <p style={{ fontSize: 13, color: "#93a7cc", lineHeight: 1.6, margin: 0 }}>{stock.reasoning}</p>
              </div>
              <div style={{ background: `${style.bg}99`, border: `1px solid ${style.border}33`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: style.text, fontWeight: 700, marginBottom: 4 }}>{HOPE_EMOJI[stock.hopeLevel]} Hope Factor</div>
                <p style={{ fontSize: 12, color: "#93a7cc", lineHeight: 1.5, margin: 0 }}>{stock.hopeFactor}</p>
              </div>
              <div style={{ background: "#0b1427", border: "1px solid #24324d", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#9fb0d1", fontWeight: 700, marginBottom: 4 }}>📰 Latest News</div>
                <p style={{ fontSize: 12, color: "#93a7cc", lineHeight: 1.5, margin: 0 }}>{stock.latestNews}</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid #24324d" }}>
            {[["Qty", stock.quantity], ["Avg", `₹${stock.avgPrice?.toFixed(2)}`], ["LTP", `₹${stock.ltp?.toLocaleString("en-IN")}`], ["Invested", `₹${(stock.quantity * stock.avgPrice)?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`]].map(([label, val]) => (
              <div key={label} style={{ background: "#0b1427", borderRadius: 8, padding: "8px 12px", minWidth: 90 }}>
                <div style={{ fontSize: 10, color: "#6f7fa3", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#eef4ff" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Smart progress bar with ETA
function ProgressBar({ done, total, currentBatch, totalBatches, waitingMsg }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = total - done;
  return (
    <div style={{ background: "#111a2e", border: "1px solid #24324d", borderRadius: 12, padding: "16px 20px", marginBottom: 20, animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {waitingMsg ? (
            <span style={{ fontSize: 16 }}>⏳</span>
          ) : (
            <div style={{ width: 16, height: 16, border: "2px solid #24324d", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 13, color: "#eef4ff", fontWeight: 600 }}>
            {waitingMsg || `Analyzing batch ${currentBatch} of ${totalBatches}...`}
          </span>
        </div>
        <span style={{ fontSize: 13, color: "#38bdf8", fontWeight: 700 }}>{done} / {total} stocks</span>
      </div>
      <div style={{ height: 6, background: "#24324d", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #38bdf8, #3b82f6)", transition: "width 0.6s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "#6f7fa3" }}>{remaining > 0 ? `${remaining} stocks remaining` : "Finalizing..."}</span>
        <span style={{ fontSize: 11, color: "#6f7fa3" }}>{pct}% complete</span>
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState("upload");
  const [userDetails, setUserDetails] = useState({ name: "", email: "", phone: "" });
  const [portfolioText, setPortfolioText] = useState(CSV_STARTER);
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isEmbedded, setIsEmbedded] = useState(false);

  // Progressive state
  const [streamedStocks, setStreamedStocks] = useState([]);
  const [newStockSymbols, setNewStockSymbols] = useState([]);
  const [summary, setSummary] = useState(null);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [waitingMsg, setWaitingMsg] = useState("");  // ✅ rate limit wait message

  const fileRef = useRef();
  const shellRef = useRef(null);
  const abortRef = useRef(false); // ✅ to cancel mid-analysis

  const SAMPLE = `${CSV_HEADER}\nBAJAJHFL,2216,126.83,87.57\nIREDA,920,204.66,124.75\nTATATECH,165,912.61,583.00\nOLAELEC,2270,51.09,25.15\nJIOFIN,530,355.21,256.25`;

  const trimmedName = userDetails.name.trim();
  const trimmedEmail = userDetails.email.trim();
  const cleanedPhone = userDetails.phone.replace(/\D/g, "");
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isPhoneValid = cleanedPhone.length >= 10 && cleanedPhone.length <= 15;
  const isDetailsValid = Boolean(trimmedName) && isEmailValid && isPhoneValid;

  const normalizePortfolioCsv = (text) => {
    const input = (text || "").replace(/\r\n?/g, "\n");
    const lines = input.split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    if (!lines.length) return CSV_STARTER;
    const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, "");
    if (norm(lines[0]) === norm(CSV_HEADER)) { lines[0] = CSV_HEADER; return lines.join("\n"); }
    return [CSV_HEADER, ...lines].join("\n");
  };

  const parsePortfolio = (text) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return null;
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const row = {};
      headers.forEach((h, i) => row[h] = vals[i]);
      return row;
    });
  };

  const parsedPortfolio = parsePortfolio(portfolioText);
  const hasPortfolioRows = Array.isArray(parsedPortfolio) && parsedPortfolio.length > 0;

  const downloadSampleCsv = () => {
    const blob = new Blob([`${SAMPLE}\n`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "stocksense-sample.csv";
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const buildRowDesc = (r) =>
    `${r.symbol || r.stock}: Qty=${r.quantity || r.qty}, AvgPrice=₹${r.avgprice || r["avg price"] || r.avgcost}, LTP=₹${r.ltp || r["last price"] || r.cmp || "unknown"}`;

  // ✅ Analyze one batch with automatic retry on rate limit
  const analyzeBatch = async (rows, batchIndex, retryCount = 0) => {
    const portfolioDesc = rows.map(buildRowDesc).join("\n");
    const resp = await fetch(STOCKSENSE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portfolioDescription: portfolioDesc,
        batchIndex,
        userDetails: { name: trimmedName, email: trimmedEmail, phone: cleanedPhone },
      }),
    });

    // ✅ Rate limit hit — wait and retry automatically
    if (resp.status === 429 && retryCount < 3) {
      const waitSecs = (retryCount + 1) * 20; // 20s, 40s, 60s
      setWaitingMsg(`Rate limit reached — retrying in ${waitSecs}s...`);
      await new Promise(r => setTimeout(r, waitSecs * 1000));
      setWaitingMsg("");
      return analyzeBatch(rows, batchIndex, retryCount + 1);
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || "StockSense API request failed.");
    if (!data?.result?.stocks || !Array.isArray(data.result.stocks)) {
      throw new Error("Unexpected analysis response format.");
    }
    return data.result;
  };

  const analyze = async () => {
    if (!isDetailsValid) { setError("Please enter valid name, email, and phone number."); return; }
    if (!parsedPortfolio || parsedPortfolio.length === 0) { setError("Could not parse portfolio."); return; }

    // Reset everything
    setStreamedStocks([]);
    setNewStockSymbols([]);
    setSummary(null);
    setError("");
    setProgressDone(0);
    setWaitingMsg("");
    abortRef.current = false;

    const total = parsedPortfolio.length;
    const batchSize = getBatchSize(total);   // ✅ smart batch size
    const batchDelay = getBatchDelay(total); // ✅ smart delay

    const batches = [];
    for (let i = 0; i < parsedPortfolio.length; i += batchSize) {
      batches.push(parsedPortfolio.slice(i, i + batchSize));
    }

    setProgressTotal(total);
    setTotalBatches(batches.length);
    setCurrentBatch(1);
    setIsStreaming(true);
    setStep("streaming");

    try {
      let allStocks = [];

      for (let i = 0; i < batches.length; i++) {
        if (abortRef.current) break; // ✅ user clicked New Analysis mid-stream

        setCurrentBatch(i + 1);
        const batchResult = await analyzeBatch(batches[i], i);
        const newStocks = batchResult.stocks || [];
        const newSymbols = newStocks.map(s => s.symbol);

        allStocks = [...allStocks, ...newStocks];
        setStreamedStocks(prev => [...prev, ...newStocks]);
        setNewStockSymbols(newSymbols);
        setProgressDone(allStocks.length);

        // Clear glow after 3s
        setTimeout(() => setNewStockSymbols([]), 3000);

        // ✅ Smart delay between batches
        if (i < batches.length - 1 && batchDelay > 0) {
          await new Promise(r => setTimeout(r, batchDelay));
        }
      }

      if (!abortRef.current) {
        // Compute final summary
        const totalInvested = allStocks.reduce((s, x) => s + x.avgPrice * x.quantity, 0);
        const currentValue = allStocks.reduce((s, x) => s + x.ltp * x.quantity, 0);
        const totalPnL = currentValue - totalInvested;
        const portfolioScore = allStocks.reduce((s, x) => s + (x.weightedScore || 0), 0) / allStocks.length;

        setSummary({
          totalInvested: +totalInvested.toFixed(2),
          currentValue: +currentValue.toFixed(2),
          totalPnL: +totalPnL.toFixed(2),
          portfolioScore: +portfolioScore.toFixed(2),
        });
        setStep("results");
      }

    } catch (e) {
      setError("Analysis failed: " + e.message);
      if (streamedStocks.length === 0) setStep("upload");
    } finally {
      setIsStreaming(false);
      setWaitingMsg("");
    }
  };

  const verdictCounts = streamedStocks.reduce((acc, s) => {
    acc[s.verdict] = (acc[s.verdict] || 0) + 1;
    return acc;
  }, {});

  const handleNewAnalysis = () => {
    abortRef.current = true;
    setStep("upload");
    setStreamedStocks([]);
    setSummary(null);
    setPortfolioText(CSV_STARTER);
    setError("");
    setIsStreaming(false);
    setWaitingMsg("");
  };

  useEffect(() => {
    try { setIsEmbedded(window.self !== window.top); } catch { setIsEmbedded(true); }
  }, []);

  useEffect(() => {
    if (!isEmbedded) return;
    const node = shellRef.current; if (!node) return;
    let rafId;
    const postHeight = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(() => { const h = Math.ceil(node.scrollHeight); if (h > 0) window.parent.postMessage({ type: "stocksense:height", height: h }, "*"); }); };
    const onMessage = (e) => { if (e?.data?.type === "stocksense:measure") postHeight(); };
    const observer = new ResizeObserver(postHeight);
    observer.observe(node); window.addEventListener("message", onMessage); window.addEventListener("resize", postHeight); postHeight();
    return () => { observer.disconnect(); window.removeEventListener("message", onMessage); window.removeEventListener("resize", postHeight); cancelAnimationFrame(rafId); };
  }, [isEmbedded]);

  const showResults = step === "streaming" || step === "results";

  return (
    <div ref={shellRef} style={{ minHeight: isEmbedded ? "auto" : "100vh", background: "#070c19", fontFamily: "'Gothic A1', sans-serif", color: "#eef4ff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gothic+A1:wght@300;400;500;600;700&display=swap');
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes gradientShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0b1427; } ::-webkit-scrollbar-thumb { background: #24324d; border-radius: 3px; }
        textarea { resize: vertical; } textarea:focus, button:focus { outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #24324d", padding: isEmbedded ? "14px 20px" : "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #070c19 0%, #111a2e 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #38bdf8, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📊</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>StockSense <span style={{ color: "#38bdf8" }}>by Diverss</span></div>
            <div style={{ fontSize: 11, color: "#6f7fa3" }}>AI Powered Portfolio Intelligence</div>
          </div>
        </div>
        {showResults && (
          <button onClick={handleNewAnalysis} style={{ background: "transparent", border: "1px solid #24324d", color: "#93a7cc", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}
            onMouseEnter={e => { e.target.style.borderColor = "#38bdf8"; e.target.style.color = "#eef4ff"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#24324d"; e.target.style.color = "#93a7cc"; }}>
            ← New Analysis
          </button>
        )}
      </div>

      <div style={{ maxWidth: isEmbedded ? 860 : 900, margin: "0 auto", padding: isEmbedded ? "20px 14px 24px" : "32px 20px" }}>

        {/* UPLOAD STEP */}
        {step === "upload" && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <div style={{ textAlign: "center", marginBottom: isEmbedded ? 28 : 40 }}>
              <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #eef4ff 0%, #38bdf8 50%, #3b82f6 100%)", backgroundSize: "200% 200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradientShift 4s ease infinite" }}>AI Portfolio Analyzer</h1>
              <p style={{ color: "#9fb0d1", marginTop: 10, fontSize: 15 }}>Upload your holdings. Get deep analysis powered by AI.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: isEmbedded ? 20 : 32 }}>
              {[{ label: "ROCE/PE", weight: "25%", icon: "📈" }, { label: "Revenue Growth", weight: "15%", icon: "💹" }, { label: "RSI Signal", weight: "15%", icon: "📉" }, { label: "Market Cap", weight: "10%", icon: "🏢" }, { label: "Price/Book", weight: "10%", icon: "📚" }, { label: "FII/DII Trend", weight: "10%", icon: "🏛️" }, { label: "Liquidity", weight: "10%", icon: "💧" }, { label: "Event Catalyst", weight: "5%", icon: "⚡" }].map(r => (
                <div key={r.label} style={{ background: "#111a2e", border: "1px solid #24324d", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 18 }}>{r.icon}</div>
                  <div style={{ fontSize: 11, color: "#93a7cc", marginTop: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>{r.weight}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#111a2e", border: "1px solid #24324d", borderRadius: 16, padding: isEmbedded ? 18 : 24, marginBottom: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: "#93a7cc", display: "block", marginBottom: 10 }}>Your Details (required)</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
                  {[{ type: "text", placeholder: "Full name", key: "name" }, { type: "email", placeholder: "Email", key: "email" }, { type: "tel", placeholder: "Phone number", key: "phone" }].map(f => (
                    <input key={f.key} type={f.type} placeholder={f.placeholder} value={userDetails[f.key]}
                      onChange={e => { setUserDetails(prev => ({ ...prev, [f.key]: e.target.value })); setError(""); }}
                      style={{ width: "100%", background: "#0b1427", border: "1px solid #24324d", borderRadius: 8, color: "#eef4ff", fontSize: 13, padding: "10px 12px", fontFamily: "'Gothic A1', sans-serif" }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: "#93a7cc" }}>Paste or Upload Portfolio CSV</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={downloadSampleCsv} style={{ background: "#182740", border: "1px solid #2d4265", color: "#38bdf8", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Download Sample CSV</button>
                  <button onClick={() => fileRef.current?.click()} style={{ background: "#182740", border: "1px solid #2d4265", color: "#38bdf8", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Upload CSV</button>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    try { const text = await file.text(); setPortfolioText(normalizePortfolioCsv(text)); setUploadedFileName(file.name); setError(""); }
                    catch { setError("Unable to read CSV file."); } finally { e.target.value = ""; }
                  }} style={{ display: "none" }} />
                </div>
              </div>

              {uploadedFileName && <div style={{ fontSize: 12, color: "#9fb0d1", marginBottom: 10 }}>Loaded file: <span style={{ color: "#38bdf8", fontWeight: 600 }}>{uploadedFileName}</span></div>}
              <textarea value={portfolioText} onChange={e => { setPortfolioText(normalizePortfolioCsv(e.target.value)); setError(""); }}
                style={{ width: "100%", height: 160, background: "#0b1427", border: "1px solid #24324d", borderRadius: 8, color: "#eef4ff", fontSize: 13, padding: 12, fontFamily: "'Gothic A1', sans-serif", lineHeight: 1.7 }} />
              <div style={{ fontSize: 12, color: "#6f7fa3", marginTop: 8 }}>Required columns: Symbol, Quantity, AvgPrice, LTP (or CMP/Last Price)</div>
            </div>

            {error && <div style={{ background: "#2f1117", border: "1px solid #f87171", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>{error}</div>}

            <button onClick={analyze} disabled={!hasPortfolioRows || !isDetailsValid}
              style={{ width: "100%", padding: "14px 24px", background: hasPortfolioRows && isDetailsValid ? "linear-gradient(135deg, #38bdf8, #3b82f6)" : "#24324d", border: "none", borderRadius: 10, color: hasPortfolioRows && isDetailsValid ? "#fff" : "#6f7fa3", fontSize: 15, fontWeight: 700, cursor: hasPortfolioRows && isDetailsValid ? "pointer" : "not-allowed", transition: "all 0.3s", letterSpacing: 0.5 }}>
              🔍 Analyze Portfolio with AI
            </button>
          </div>
        )}

        {/* STREAMING + RESULTS */}
        {showResults && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>

            {isStreaming && (
              <ProgressBar
                done={progressDone} total={progressTotal}
                currentBatch={currentBatch} totalBatches={totalBatches}
                waitingMsg={waitingMsg}
              />
            )}

            {summary && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20, animation: "fadeSlideIn 0.5s ease" }}>
                {[
                  { label: "Invested", value: `₹${(summary.totalInvested / 100000).toFixed(2)}L`, color: "#93a7cc" },
                  { label: "Current Value", value: `₹${(summary.currentValue / 100000).toFixed(2)}L`, color: "#93a7cc" },
                  { label: "Total P&L", value: `${summary.totalPnL >= 0 ? "+" : ""}₹${Math.abs(summary.totalPnL / 100000).toFixed(2)}L`, color: summary.totalPnL >= 0 ? "#2dd4bf" : "#f87171" },
                  { label: "Portfolio Score", value: `${summary.portfolioScore?.toFixed(1)}/5`, color: "#38bdf8" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#111a2e", border: "1px solid #24324d", borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#6f7fa3", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {streamedStocks.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {Object.entries(verdictCounts).map(([v, c]) => {
                  const s = VERDICT_STYLES[v] || {};
                  return (
                    <div key={v} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: "5px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: s.text, fontWeight: 600 }}>{v}</span>
                      <span style={{ fontSize: 13, color: s.text, fontWeight: 700 }}>×{c}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...streamedStocks]
                .sort((a, b) => b.weightedScore - a.weightedScore)
                .map((stock, i) => (
                  <StockCard key={stock.symbol} stock={stock} index={i} isNew={newStockSymbols.includes(stock.symbol)} />
                ))}
            </div>

            {error && streamedStocks.length > 0 && (
              <div style={{ background: "#2f1117", border: "1px solid #f87171", borderRadius: 8, padding: "10px 14px", marginTop: 16, color: "#f87171", fontSize: 13 }}>
                ⚠️ {error} — {streamedStocks.length} stocks were analyzed before the error.
              </div>
            )}

            {step === "results" && (
              <div style={{ marginTop: 24, padding: "12px 16px", background: "#111a2e", border: "1px solid #24324d", borderRadius: 8, fontSize: 12, color: "#6f7fa3", textAlign: "center" }}>
                ⚠️ This analysis is for informational purposes only. Not financial advice. Consult a SEBI-registered advisor before investing.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
