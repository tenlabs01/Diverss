import express from "express";
import cors from "cors";
import { analyzePortfolioInput } from "./lib/portfolioEngine.js";
import {
  analyzeStockSensePortfolio,
  UpstreamHttpError,
} from "./lib/stocksenseEngine.js";

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing OPENAI_API_KEY.",
    });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  try {
    const result = await analyzeStockSensePortfolio({
      portfolioDescription,
      apiKey,
      model,
    });
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
