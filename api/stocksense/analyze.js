import {
  analyzeStockSensePortfolio,
  UpstreamHttpError,
} from "../../server/lib/stocksenseEngine.js";
import {
  extractRequestMeta,
  normalizeUserDetails,
  sendLeadToGoogleSheets,
} from "../../server/lib/leads.js";

export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY." });
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  try {
    const leadCapturePromise = sendLeadToGoogleSheets({
      userDetails: normalizedDetails.data,
      portfolioDescription,
      source: "stocksense-vercel",
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
    return res.status(200).json({ result });
  } catch (error) {
    if (error instanceof UpstreamHttpError) {
      return res.status(error.status).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || "StockSense analysis failed.",
    });
  }
}
