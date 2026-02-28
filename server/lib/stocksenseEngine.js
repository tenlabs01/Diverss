export class UpstreamHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "UpstreamHttpError";
    this.status = status;
  }
}

export const STOCKSENSE_RULES_CONTEXT = `
You are a stock portfolio analyst. Analyze the given portfolio using these weighted rules:
1. ROCE-to-PE Mapping (25% weight):
   - ROCE <10%: undervalued below PE 20
   - ROCE 10-20%: undervalued below PE 30
   - ROCE >20%: undervalued below PE 40
   - Rank 1-5 based on relative gap between current PE and threshold
2. Market Cap (10% weight):
   - Large cap (>25000 Cr): Rank 4-5
   - Mid cap (5000-25000 Cr): Rank 3
   - Small cap (<5000 Cr): Rank 1-2
3. Price-to-Book (10% weight):
   - Rank higher when P/B < 24M avg & sector avg
   - Rank lower when P/B > 10 or above sector avg
4. Quarterly Revenue & Profitability Growth (15% weight):
   - Consistent positive growth 4 quarters: Rank 5
   - Large cap single-digit YoY growth: Rank 4
   - Mid/small cap double-digit YoY growth: Rank 4
   - Flat or negative growth: Rank 1-2
5. Institutional Shareholding Trend (10% weight):
   - 12-month consistent FII+DII increase: Rank 5
   - 3-month substantial DII increase: Rank 4
   - Flat: Rank 2, Decreasing: Rank 1
6. Liquidity/Turnover Ratio (10% weight):
   - Turnover ratio >=0.1% is considered liquid, rank higher
7. RSI (15% weight):
   - RSI <30 (Oversold): Rank 5
   - RSI 30-45: Rank 4
   - RSI 45-55: Rank 3
   - RSI 55-70: Rank 2
   - RSI >70 (Overbought): Rank 1
8. Event Sensitivity (5% weight):
   - Rank higher for upcoming earnings, policy changes, MSCI inclusion, positive analyst ratings
For each stock in the portfolio, use your knowledge to:
1. Estimate/score each factor (1-5)
2. Calculate weighted total score out of 5
3. Give a verdict: Strong Hold/Add, Hold, Reduce, Exit, Speculative
4. Provide 2-3 lines of reasoning
5. Identify the "hope factor" — what could drive recovery
Also check recent news and catalysts.
Return ONLY valid JSON in this exact format:
{
  "summary": {
    "totalInvested": number,
    "currentValue": number,
    "totalPnL": number,
    "portfolioScore": number
  },
  "stocks": [
    {
      "symbol": "SYMBOL",
      "companyName": "Full Company Name",
      "quantity": number,
      "avgPrice": number,
      "ltp": number,
      "pnl": number,
      "pnlPercent": number,
      "verdict": "Strong Hold/Add" | "Hold" | "Hold with Caution" | "Reduce" | "Exit" | "Speculative",
      "scores": {
        "roceToPe": number,
        "marketCap": number,
        "priceToBook": number,
        "revenueGrowth": number,
        "institutionalHolding": number,
        "liquidity": number,
        "rsi": number,
        "eventSensitivity": number
      },
      "weightedScore": number,
      "hopeLevel": "Very High" | "High" | "Moderate" | "Low" | "Speculative" | "Very Low",
      "reasoning": "string",
      "hopeFactor": "string",
      "latestNews": "string"
    }
  ]
}
`;

function parseJsonObject(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}

function buildStockSensePrompt(portfolioDescription) {
  return [
    "Analyze this Indian stock portfolio using the rules provided.",
    "Use your knowledge of these stocks as of early 2026.",
    "",
    "Portfolio:",
    portfolioDescription,
    "",
    "Return ONLY the JSON, no other text.",
  ].join("\n");
}

export async function analyzeStockSensePortfolio({
  portfolioDescription,
  apiKey,
  model = "claude-sonnet-4-20250514",
}) {
  const userPrompt = buildStockSensePrompt(portfolioDescription);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 8192, // ✅ Increased for large batches
      stream: true,     // ✅ Streaming to avoid Vercel timeout
      system: STOCKSENSE_RULES_CONTEXT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const upstreamMessage =
      payload?.error?.message || "Anthropic request failed.";
    throw new UpstreamHttpError(response.status, upstreamMessage);
  }

  if (!response.body) {
    throw new UpstreamHttpError(
      502,
      "Streaming not supported in this environment."
    );
  }

  // Buffer streamed chunks into full text
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });

    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (
          event?.type === "content_block_delta" &&
          event?.delta?.type === "text_delta"
        ) {
          fullText += event.delta.text;
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  console.log(`Batch received ${fullText.length} chars`);

  const parsed = parseJsonObject(fullText);
  if (!parsed) {
    throw new UpstreamHttpError(
      502,
      "Model response did not include valid JSON."
    );
  }
  return parsed;
}

// ✅ Analyze large portfolios — all batches fire in parallel
export async function analyzePortfolioInBatches({
  portfolioDescription,
  apiKey,
  model = "claude-sonnet-4-20250514",
  batchSize = 10,
}) {
  // Split CSV into header + data rows
  const lines = portfolioDescription.trim().split("\n");
  const header = lines[0];
  const rows = lines.slice(1).filter((r) => r.trim()); // remove empty lines

  // If small portfolio, just run directly — no batching needed
  if (rows.length <= batchSize) {
    return analyzeStockSensePortfolio({ portfolioDescription, apiKey, model });
  }

  // Split rows into batches of batchSize
  const batches = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batchRows = rows.slice(i, i + batchSize);
    batches.push([header, ...batchRows].join("\n"));
  }

  console.log(
    `Processing ${rows.length} stocks in ${batches.length} batches of ${batchSize}`
  );

  // ✅ Fire ALL batches in parallel at once — finishes in ~15s instead of 45s+
  const allBatchResults = await Promise.all(
    batches.map((batch) =>
      analyzeStockSensePortfolio({ portfolioDescription: batch, apiKey, model })
    )
  );

  // Merge all batch results into one unified response
  const allStocks = allBatchResults.flatMap((r) => r.stocks || []);

  const totalInvested = allStocks.reduce(
    (sum, s) => sum + s.avgPrice * s.quantity,
    0
  );
  const currentValue = allStocks.reduce(
    (sum, s) => sum + s.ltp * s.quantity,
    0
  );
  const totalPnL = currentValue - totalInvested;
  const portfolioScore =
    allStocks.reduce((sum, s) => sum + (s.weightedScore || 0), 0) /
    allStocks.length;

  console.log(`All ${batches.length} batches merged. Total stocks: ${allStocks.length}`);

  return {
    summary: {
      totalInvested: +totalInvested.toFixed(2),
      currentValue: +currentValue.toFixed(2),
      totalPnL: +totalPnL.toFixed(2),
      portfolioScore: +portfolioScore.toFixed(2),
    },
    stocks: allStocks,
  };
}
