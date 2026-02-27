import express from "express";
import cors from "cors";
import { analyzePortfolioInput } from "./lib/portfolioEngine.js";
import {
  analyzeStockSensePortfolio,
  UpstreamHttpError,
} from "./lib/stocksenseEngine.js";
import {
  extractRequestMeta,
  normalizeUserDetails,
  sendLeadToGoogleSheets,
} from "./lib/leads.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/analyze", (req, res) => {
  const output = analyzePortfolioInput(req.body || {});
  res.json(output);
});

app.post("/api/stocksense/analyze", async (req, res) => {
  const portfolioDescription = String(req.body?.portfolioDescription || "").trim();
  if (!portfolioDescription) {
    return res.status(400).json({ error: "Missing portfolioDescription." });
  }

  const normalizedDetails = normalizeUserDetails(req.body?.userDetails || {});
  if (!normalizedDetails.valid) {
    return res.status(400).json({ error: normalizedDetails.error });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY.",
    });
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  try {
    const leadCapturePromise = sendLeadToGoogleSheets({
      userDetails: normalizedDetails.data,
      portfolioDescription,
      source: "stocksense-local-server",
      meta: extractRequestMeta(req),
    }).catch((err) => {
      console.error("Lead capture failed:", err?.message || err);
    });

    const result = await analyzeStockSensePortfolio({
      portfolioDescription,
      apiKey,
      model,
    });

    await leadCapturePromise;
    return res.json({ result });
  } catch (error) {
    if (error instanceof UpstreamHttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({
      error: error.message || "StockSense analysis failed.",
    });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Portfolio Analyzer API running on ${PORT}`);
});
