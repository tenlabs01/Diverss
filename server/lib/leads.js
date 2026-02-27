const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeUserDetails(input = {}) {
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").replace(/\D/g, "");

  if (!name) {
    return { valid: false, error: "Missing name." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Invalid email." };
  }
  if (phone.length < 10 || phone.length > 15) {
    return { valid: false, error: "Invalid phone number." };
  }

  return {
    valid: true,
    data: {
      name,
      email,
      phone,
    },
  };
}

export function extractRequestMeta(req) {
  const forwardedFor = req?.headers?.["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req?.socket?.remoteAddress || "")
        .split(",")[0]
        .trim();

  return {
    ip,
    userAgent: String(req?.headers?.["user-agent"] || ""),
    referer: String(req?.headers?.referer || ""),
  };
}

export async function sendLeadToGoogleSheets({
  userDetails,
  portfolioDescription,
  source = "stocksense",
  meta = {},
}) {
  const webhookUrl = String(process.env.GOOGLE_SHEETS_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return { sent: false, reason: "missing_webhook" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source,
        name: userDetails.name,
        email: userDetails.email,
        phone: userDetails.phone,
        portfolioDescription: String(portfolioDescription || ""),
        ip: String(meta.ip || ""),
        userAgent: String(meta.userAgent || ""),
        referer: String(meta.referer || ""),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Google Sheets webhook failed (${response.status}).`);
    }

    return { sent: true };
  } finally {
    clearTimeout(timeoutId);
  }
}
