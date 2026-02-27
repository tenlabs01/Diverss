function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (Number.isNaN(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeAllocation(input) {
  const base = {
    stocks: 0,
    mutualFunds: 0,
    gold: 0,
    bonds: 0,
    cash: 0,
    realEstate: 0,
  };

  if (!input || typeof input !== "object") {
    return { ...base };
  }

  const sanitized = Object.keys(base).reduce((acc, key) => {
    acc[key] = clampNumber(input[key], 0, 100, 0);
    return acc;
  }, {});

  const total = Object.values(sanitized).reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return { ...base };
  }

  const factor = 100 / total;
  const scaled = Object.keys(sanitized).reduce((acc, key) => {
    acc[key] = sanitized[key] * factor;
    return acc;
  }, {});

  const rounded = Object.keys(scaled).reduce((acc, key) => {
    acc[key] = Math.round(scaled[key]);
    return acc;
  }, {});

  const roundedTotal = Object.values(rounded).reduce((sum, value) => sum + value, 0);
  const diff = 100 - roundedTotal;
  if (diff !== 0) {
    const largestKey = Object.keys(rounded).reduce((a, b) => (rounded[a] >= rounded[b] ? a : b));
    rounded[largestKey] = clampNumber(rounded[largestKey] + diff, 0, 100, rounded[largestKey]);
  }

  return rounded;
}

function allocationSummary(allocation) {
  const equity = allocation.stocks + allocation.mutualFunds + allocation.realEstate;
  const defensive = allocation.bonds + allocation.cash;
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  return { equity, defensive, total };
}

function countActiveAllocations(allocation) {
  return Object.values(allocation).filter((value) => value > 5).length;
}

function maxAllocation(allocation) {
  const entries = Object.entries(allocation);
  let max = entries[0];
  entries.forEach((entry) => {
    if (entry[1] > max[1]) max = entry;
  });
  return { key: max[0], value: max[1] };
}

function riskTargetFor(riskAppetite) {
  const map = {
    Conservative: 30,
    Moderate: 50,
    Aggressive: 70,
  };
  return map[riskAppetite] ?? 50;
}

function shiftAllocation(allocation, fromKeys, toKeys, amount) {
  const updated = { ...allocation };
  const fromTotal = fromKeys.reduce((sum, key) => sum + updated[key], 0);
  if (fromTotal <= 0 || amount <= 0) return updated;

  fromKeys.forEach((key) => {
    const reduction = (updated[key] / fromTotal) * amount;
    updated[key] = Math.max(0, updated[key] - reduction);
  });

  const perKey = amount / toKeys.length;
  toKeys.forEach((key) => {
    updated[key] += perKey;
  });

  return updated;
}

function buildSuggestedAllocation({ riskAppetite, horizon, age }) {
  const baseModels = {
    Conservative: {
      stocks: 20,
      mutualFunds: 15,
      gold: 10,
      bonds: 35,
      cash: 15,
      realEstate: 5,
    },
    Moderate: {
      stocks: 30,
      mutualFunds: 20,
      gold: 8,
      bonds: 25,
      cash: 12,
      realEstate: 5,
    },
    Aggressive: {
      stocks: 40,
      mutualFunds: 25,
      gold: 5,
      bonds: 20,
      cash: 5,
      realEstate: 5,
    },
  };

  let allocation = { ...baseModels[riskAppetite] };

  const horizonShift = {
    "< 3 years": -10,
    "3-7 years": -5,
    "7-15 years": 0,
    "15+ years": 5,
  }[horizon] ?? 0;

  if (horizonShift !== 0) {
    allocation = shiftAllocation(
      allocation,
      horizonShift > 0 ? ["bonds", "cash"] : ["stocks", "mutualFunds", "realEstate"],
      horizonShift > 0 ? ["stocks", "mutualFunds", "realEstate"] : ["bonds", "cash"],
      Math.abs(horizonShift)
    );
  }

  if (age > 55) {
    allocation = shiftAllocation(
      allocation,
      ["stocks", "mutualFunds", "realEstate"],
      ["bonds", "cash"],
      5
    );
  }

  if (age < 30) {
    allocation = shiftAllocation(
      allocation,
      ["bonds", "cash"],
      ["stocks", "mutualFunds"],
      5
    );
  }

  return normalizeAllocation(allocation);
}

function labelize(key) {
  const map = {
    mutualFunds: "Mutual Funds",
    realEstate: "Real Estate",
    bonds: "Bonds",
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function buildSummary({
  age,
  riskAppetite,
  equity,
  defensive,
  riskTarget,
  equityDiff,
  maxAsset,
  diversificationScore,
  allocation,
  suggestedAllocation,
  ageEquity,
}) {
  const strengths = [];
  const weaknesses = [];
  const adjustments = [];

  if (diversificationScore >= 70) {
    strengths.push("Diversified across multiple asset classes.");
  } else {
    weaknesses.push("Allocation is concentrated in too few asset classes.");
  }

  if (equityDiff <= 8) {
    strengths.push("Equity exposure is aligned with your risk appetite.");
  } else if (equity > riskTarget) {
    weaknesses.push(`Equity exposure is higher than a ${riskAppetite.toLowerCase()} profile.`);
  } else {
    weaknesses.push(`Equity exposure is lower than a ${riskAppetite.toLowerCase()} profile.`);
  }

  if (defensive >= 15 && defensive <= 40) {
    strengths.push("Defensive allocation provides a stable buffer.");
  }

  if (maxAsset.value > 50) {
    weaknesses.push(
      `Overexposure to ${labelize(maxAsset.key)} (${Math.round(maxAsset.value)}%).`
    );
  }

  if (age > 55 && equity > ageEquity + 10) {
    weaknesses.push("Equity exposure may be elevated relative to your age band.");
  }

  if (allocation.cash < 5) {
    weaknesses.push("Cash buffer is below 5%.");
  }

  Object.keys(suggestedAllocation).forEach((key) => {
    const diff = Math.round(suggestedAllocation[key] - allocation[key]);
    if (Math.abs(diff) >= 5) {
      adjustments.push(
        `${diff > 0 ? "Increase" : "Reduce"} ${labelize(key)} by ${Math.abs(diff)}%.`
      );
    }
  });

  if (adjustments.length === 0) {
    adjustments.push("Current allocation is close to the suggested model.");
  }

  return {
    strengths,
    weaknesses,
    adjustments,
  };
}

export function analyzePortfolioInput(input = {}) {
  const name = String(input.name || "").trim();
  const age = clampNumber(input.age, 18, 100, 30);
  const maritalStatus = String(input.maritalStatus || "");
  const riskAppetite = String(input.riskAppetite || "Moderate");
  const horizon = String(input.horizon || "7-15 years");

  const allocation = normalizeAllocation(input.allocation);
  const { equity, defensive, total } = allocationSummary(allocation);

  const riskTarget = riskTargetFor(riskAppetite);
  const equityDiff = Math.abs(equity - riskTarget);
  const ageEquity = clampNumber(110 - age, 20, 80, 50);
  const ageDiff = Math.abs(equity - ageEquity);

  const maxAsset = maxAllocation(allocation);

  let riskScore = 100 - equityDiff * 1.3 - ageDiff * 0.6;
  if (maxAsset.value > 50) riskScore -= 8;
  if (defensive < 10) riskScore -= 5;
  riskScore = Math.round(clampNumber(riskScore, 0, 100, 50));

  let diversificationScore = Math.round(
    (countActiveAllocations(allocation) / Object.keys(allocation).length) * 100
  );
  if (maxAsset.value > 60) diversificationScore -= 15;
  if (maxAsset.value > 75) diversificationScore -= 25;
  diversificationScore = Math.round(clampNumber(diversificationScore, 0, 100, 50));

  const suggestedAllocation = buildSuggestedAllocation({
    riskAppetite,
    horizon,
    age,
  });

  const summary = buildSummary({
    name,
    age,
    riskAppetite,
    equity,
    defensive,
    total,
    riskTarget,
    equityDiff,
    maxAsset,
    diversificationScore,
    allocation,
    suggestedAllocation,
    ageEquity,
  });

  return {
    name,
    maritalStatus,
    riskAppetite,
    horizon,
    riskScore,
    diversificationScore,
    suggestedAllocation,
    summary,
  };
}
