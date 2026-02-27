import { analyzePortfolioInput } from "../server/lib/portfolioEngine.js";

export default function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const output = analyzePortfolioInput(req.body || {});
    return res.status(200).json(output);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Portfolio analysis failed.",
    });
  }
}
