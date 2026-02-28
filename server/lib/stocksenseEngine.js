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
      max_tokens: 4000,
      stream: true,   // ✅ ADDED
      system: STOCKSENSE_RULES_CONTEXT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const upstreamMessage = payload?.error?.message || "Anthropic request failed.";
    throw new UpstreamHttpError(response.status, upstreamMessage);
  }

  // ✅ Buffer the stream chunk by chunk
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });

    // Extract text from SSE data lines
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (event?.type === "content_block_delta" && event?.delta?.type === "text_delta") {
          fullText += event.delta.text;
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  const parsed = parseJsonObject(fullText);
  if (!parsed) {
    throw new UpstreamHttpError(502, "Model response did not include valid JSON.");
  }
  return parsed;
}
