import { useEffect, useMemo, useState } from 'react'

const assetClasses = [
  { id: 'realEstate', label: 'Real estate', color: '#3a9ca6' },
  { id: 'stocks', label: 'Stocks', color: '#0d7ea1' },
  { id: 'mutualFunds', label: 'Mutual funds', color: '#12b3c7' },
  { id: 'gold', label: 'Gold', color: '#f4c766' },
  { id: 'silver', label: 'Silver', color: '#b8c2cc' },
  { id: 'bonds', label: 'Bonds', color: '#1d9b6c' },
  { id: 'fixedDeposits', label: 'Fixed deposits', color: '#2b7a5a' },
  { id: 'cash', label: 'Cash', color: '#1a6d4f' },
  { id: 'other', label: 'Other', color: '#6c7aa7' },
]

const riskProfiles = [
  { id: 'conservative', label: 'Conservative', min: 20, max: 40 },
  { id: 'balanced', label: 'Balanced', min: 40, max: 60 },
  { id: 'growth', label: 'Growth', min: 60, max: 80 },
]

const horizons = [
  {
    id: 'short',
    label: 'Short (0-3 years)',
    equityMin: 15,
    equityMax: 35,
    liquidTarget: 50,
  },
  {
    id: 'medium',
    label: 'Medium (3-7 years)',
    equityMin: 35,
    equityMax: 55,
    liquidTarget: 35,
  },
  {
    id: 'long',
    label: 'Long (7+ years)',
    equityMin: 55,
    equityMax: 75,
    liquidTarget: 20,
  },
]

const learnCards = [
  {
    title: 'Financial management essentials',
    detail: 'Short lessons on budgeting, compounding, and disciplined investing.',
  },
  {
    title: 'Risk and return literacy',
    detail: 'Understand volatility, drawdowns, and diversification basics.',
  },
  {
    title: 'Goal-based planning',
    detail: 'Plan for milestones with clarity on time horizon and cash needs.',
  },
]

const communityCards = [
  {
    title: 'Investor circles',
    detail: 'Peer groups that share strategies, insights, and accountability.',
  },
  {
    title: 'Expert AMAs',
    detail: 'Live sessions with advisors, product specialists, and market analysts.',
  },
  {
    title: 'Portfolio playbooks',
    detail: 'Curated templates for different goals and risk profiles.',
  },
]

const formspreeEndpoint = 'https://formspree.io/f/xkozdpee'
const portfolioAnalyzerUrl = 'http://localhost:5173'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const formatPercent = (value) => `${value.toFixed(1)}%`

const scoreRange = (value, min, max, maxScore, fullPenaltyAt = 40) => {
  if (value >= min && value <= max) return maxScore
  const deviation = value < min ? min - value : value - max
  const penalty = (maxScore / fullPenaltyAt) * deviation
  return clamp(maxScore - penalty, 0, maxScore)
}

const computeEfficiencyScore = (percents) => {
  const otherPenalty = Math.max(0, percents.other - 10) / 5 * 2
  const preciousPenalty = Math.max(0, (percents.gold + percents.silver) - 20) / 5 * 1.5
  const realEstatePenalty = Math.max(0, percents.realEstate - 20) / 5 * 1.5
  const cashPenalty = Math.max(0, percents.cash - 20) / 5
  const score = 15 - otherPenalty - preciousPenalty - realEstatePenalty - cashPenalty
  return clamp(score, 0, 15)
}

const computePortfolioAnalysis = (allocations, riskProfile, horizon) => {
  const total = assetClasses.reduce((sum, item) => sum + (allocations[item.id] || 0), 0)
  const percentages = assetClasses.reduce((acc, item) => {
    const value = allocations[item.id] || 0
    acc[item.id] = total > 0 ? (value / total) * 100 : 0
    return acc
  }, {})

  const percentValues = assetClasses.map((item) => percentages[item.id])
  const hhi = percentValues.reduce((sum, value) => sum + Math.pow(value / 100, 2), 0)
  const diversificationScore = total > 0
    ? 20 * clamp(1 - (hhi - 0.2) / 0.8, 0, 1)
    : 0

  const equityPercent = percentages.stocks + percentages.mutualFunds
  const riskScore = total > 0 ? scoreRange(equityPercent, riskProfile.min, riskProfile.max, 20) : 0

  const maxPercent = percentValues.length ? Math.max(...percentValues) : 0
  const concentrationScore = total === 0
    ? 0
    : maxPercent <= 45
      ? 15
      : maxPercent >= 80
        ? 0
        : 15 * (1 - (maxPercent - 45) / 35)

  const liquidPercent = percentages.bonds + percentages.fixedDeposits + percentages.cash
  const liquidityScore = total > 0
    ? clamp(15 * (liquidPercent / horizon.liquidTarget), 0, 15)
    : 0

  const horizonScore = total > 0
    ? scoreRange(equityPercent, horizon.equityMin, horizon.equityMax, 15)
    : 0

  const efficiencyScore = total > 0 ? computeEfficiencyScore(percentages) : 0

  const score = Math.round(
    diversificationScore
    + riskScore
    + concentrationScore
    + liquidityScore
    + horizonScore
    + efficiencyScore
  )

  const band =
    score >= 80 ? 'Excellent'
      : score >= 65 ? 'Strong'
        : score >= 50 ? 'Needs Work'
          : 'High Risk'

  const maxBucket = assetClasses.reduce((current, item) => {
    if (!current) return item
    return percentages[item.id] > percentages[current.id] ? item : current
  }, null)

  const riskAligned = equityPercent >= riskProfile.min && equityPercent <= riskProfile.max
  const horizonAligned = equityPercent >= horizon.equityMin && equityPercent <= horizon.equityMax
  const liquidityAligned = liquidPercent >= horizon.liquidTarget

  const triggers = []

  if (total === 0) {
    triggers.push('Enter allocations to generate recommendations.')
  } else {
    if (!riskAligned) {
      triggers.push(
        `Stocks + mutual funds are ${equityPercent.toFixed(1)}% vs the ${riskProfile.min}-${riskProfile.max}% range for ${riskProfile.label}.`
      )
    }
    if (!horizonAligned) {
      triggers.push(
        `Horizon fit: stocks + mutual funds are ${equityPercent.toFixed(1)}% vs ${horizon.equityMin}-${horizon.equityMax}% for ${horizon.label}.`
      )
    }
    if (maxPercent > 60 && maxBucket) {
      triggers.push(
        `Concentration risk: ${maxBucket.label} is ${maxPercent.toFixed(1)}% of the portfolio.`
      )
    }
    if (!liquidityAligned) {
      triggers.push(
        `Liquidity is ${liquidPercent.toFixed(1)}% vs a ${horizon.liquidTarget}% target for ${horizon.label}.`
      )
    }
    if (percentages.other > 15) {
      triggers.push(
        `Other assets are ${percentages.other.toFixed(1)}%; consider trimming toward 10-15%.`
      )
    }
    if (percentages.gold + percentages.silver > 25) {
      triggers.push(
        `Precious metals are ${(percentages.gold + percentages.silver).toFixed(1)}%; consider a 10-20% range.`
      )
    }
    if (horizon.id === 'long' && percentages.cash > 30) {
      triggers.push(
        `Cash is ${percentages.cash.toFixed(1)}%; consider shifting toward long-term growth assets.`
      )
    }
    if (percentages.realEstate > 30) {
      triggers.push(
        `Real estate is ${percentages.realEstate.toFixed(1)}%; consider balancing with liquid assets.`
      )
    }
    if (diversificationScore < 10) {
      triggers.push('Diversification is low; spreading across more assets can reduce volatility.')
    }
  }

  if (total > 0 && triggers.length === 0) {
    triggers.push('Allocation aligns with your profile. Rebalance annually or after major market moves.')
  }

  const narrative = total === 0
    ? 'Add your portfolio allocations to see the score, charts, and recommendations.'
    : `Score ${score}/100 (${band}). Based on a ${riskProfile.label.toLowerCase()} risk profile and a ${horizon.label.toLowerCase()} horizon, the portfolio is ${riskAligned && horizonAligned ? 'largely aligned' : 'showing some misalignment'} with your stated preferences.`

  const breakdown = [
    { label: 'Diversification', value: diversificationScore, max: 20 },
    { label: 'Risk alignment', value: riskScore, max: 20 },
    { label: 'Concentration', value: concentrationScore, max: 15 },
    { label: 'Liquidity', value: liquidityScore, max: 15 },
    { label: 'Horizon fit', value: horizonScore, max: 15 },
    { label: 'Efficiency', value: efficiencyScore, max: 15 },
  ]

  return {
    total,
    percentages,
    breakdown,
    score,
    band,
    triggers,
    narrative,
  }
}

const buildAllocationGradient = (percentages) => {
  const segments = []
  let start = 0
  assetClasses.forEach((item) => {
    const value = percentages[item.id] || 0
    if (value <= 0) return
    const end = start + value
    segments.push(`${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`)
    start = end
  })
  if (!segments.length) {
    return '#e7edf1'
  }
  return `conic-gradient(${segments.join(', ')})`
}

export default function App() {
  const [allocations, setAllocations] = useState(() => (
    {
      realEstate: 300000,
      stocks: 450000,
      mutualFunds: 250000,
      gold: 80000,
      silver: 40000,
      bonds: 150000,
      fixedDeposits: 120000,
      cash: 60000,
      other: 30000,
    }
  ))
  const [riskIndex, setRiskIndex] = useState(1)
  const [horizonId, setHorizonId] = useState('medium')
  const [meetingStatus, setMeetingStatus] = useState('idle')
  const [menuOpen, setMenuOpen] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = analyzerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [analyzerOpen])

  const handleOpenAnalyzer = (event) => {
    if (event) {
      event.preventDefault()
    }
    setAnalyzerOpen(true)
    setMenuOpen(false)
  }

  const riskProfile = riskProfiles[riskIndex]
  const horizon = horizons.find((item) => item.id === horizonId) || horizons[1]

  const analysis = useMemo(
    () => computePortfolioAnalysis(allocations, riskProfile, horizon),
    [allocations, riskProfile, horizon]
  )

  const allocationGradient = useMemo(
    () => buildAllocationGradient(analysis.percentages),
    [analysis.percentages]
  )

  const handleAmountChange = (key) => (event) => {
    const raw = Number(event.target.value)
    const value = Number.isFinite(raw) ? Math.max(0, raw) : 0
    setAllocations((prev) => ({ ...prev, [key]: value }))
  }

  const handleMeetingSubmit = async (event) => {
    event.preventDefault()
    if (formspreeEndpoint.includes('yourFormId')) {
      setMeetingStatus('error')
      return
    }

    setMeetingStatus('sending')
    const formData = new FormData(event.target)

    try {
      const response = await fetch(formspreeEndpoint, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      })

      if (response.ok) {
        setMeetingStatus('success')
        event.target.reset()
      } else {
        setMeetingStatus('error')
      }
    } catch (error) {
      setMeetingStatus('error')
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="logo">
          <img src="/diverss-logo.png" alt="Diverss" />
        </div>
        <button
          className="nav-toggle"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'} id="primary-nav">
          <a href="#learn" onClick={() => setMenuOpen(false)}>Learn</a>
          <a href="#analyse" onClick={handleOpenAnalyzer}>Analyse</a>
          <a href="/stocksense" onClick={() => setMenuOpen(false)}>StockSense</a>
          <a href="#community" onClick={() => setMenuOpen(false)}>Community</a>
        </nav>
        <div className={menuOpen ? 'nav-mobile open' : 'nav-mobile'}>
          <a
            className="btn primary nav-cta"
            href="#expert"
            onClick={() => setMenuOpen(false)}
          >
            Talk To An Expert
          </a>
        </div>
        <a className="btn primary header-cta" href="#expert">
          Talk To An Expert
        </a>
      </header>

      <main>
        <section className="hero" id="top">
          <div className="hero-text">
            <h1>
              <span className="accent">Diverss</span>ify your portfolio
            </h1>
            <p className="subtitle">understand the power of diversification to create long-term wealth</p>
            <button
              className="btn primary"
              type="button"
              onClick={handleOpenAnalyzer}
            >
              Analyse Portfolio
            </button>
          </div>
          <div className="hero-visual">
            <img
              className="hero-image"
              src="/diverss-hero.png"
              alt="Diverss portfolio illustration"
            />
          </div>
        </section>

        <section className="section" id="learn">
          <div className="section-heading">
            <h2>Learn financial management with confidence</h2>
            <p>
              Diverss is a wealth-tech platform helping investors build fundamentals
              and make better decisions with clarity.
            </p>
          </div>
          <div className="card-grid">
            {learnCards.map((item) => (
              <div key={item.title} className="card">
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section analyse" id="analyse">
          <div className="section-heading">
            <h2>Analyse your portfolio with DIVERSS risk analyser</h2>
            <p>
              Enter your current allocation and get a score, visual breakdowns,
              and narrative triggers tailored to your risk profile.
            </p>
          </div>

          <div className="portfolio-grid">
            <div className="portfolio-card">
              <h3>Portfolio inputs</h3>
              <p className="helper">Enter amounts in INR to build your mix.</p>
              <div className="portfolio-form">
                {assetClasses.map((item) => (
                  <div key={item.id} className="asset-row">
                    <div className="asset-label">
                      <span className="asset-dot" style={{ background: item.color }} />
                      <div>
                        <p className="asset-name">{item.label}</p>
                        <p className="asset-percent">{formatPercent(analysis.percentages[item.id])}</p>
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={allocations[item.id]}
                      onChange={handleAmountChange(item.id)}
                    />
                  </div>
                ))}
              </div>

              <div className="control-block">
                <label className="control-label" htmlFor="risk">
                  Risk profile
                </label>
                <input
                  id="risk"
                  className="range"
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={riskIndex}
                  onChange={(event) => setRiskIndex(Number(event.target.value))}
                />
                <div className="range-labels">
                  {riskProfiles.map((profile, index) => (
                    <span
                      key={profile.id}
                      className={index === riskIndex ? 'range-label active' : 'range-label'}
                    >
                      {profile.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="control-block">
                <label className="control-label" htmlFor="horizon">
                  Investment horizon
                </label>
                <select
                  id="horizon"
                  value={horizonId}
                  onChange={(event) => setHorizonId(event.target.value)}
                >
                  {horizons.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="total-row">
                <span>Total portfolio value</span>
                <strong>{currency.format(analysis.total)}</strong>
              </div>
            </div>

            <div className="portfolio-card">
              <div className="score-panel">
                <div
                  className="score-meter"
                  style={{
                    background: `conic-gradient(#0d7ea1 0% ${analysis.score}%, #e7edf1 ${analysis.score}% 100%)`,
                  }}
                >
                  <div className="score-meter-content">
                    <p className="score-value">{analysis.score}</p>
                    <p className="score-label">Score</p>
                  </div>
                </div>
                <div>
                  <p className="score-band">{analysis.band}</p>
                  <p className="score-narrative">{analysis.narrative}</p>
                </div>
              </div>

              <div className="chart-grid">
                <div className="chart-card">
                  <p className="chart-title">Allocation mix</p>
                  <div className="donut" style={{ background: allocationGradient }}>
                    <div className="donut-center">
                      <p>Total</p>
                      <strong>{currency.format(analysis.total)}</strong>
                    </div>
                  </div>
                  <div className="legend">
                    {assetClasses.map((item) => (
                      <div key={item.id} className="legend-item">
                        <span className="legend-dot" style={{ background: item.color }} />
                        <span>{item.label}</span>
                        <strong>{formatPercent(analysis.percentages[item.id])}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <p className="chart-title">Allocation bars</p>
                  <div className="allocation-bars">
                    {assetClasses.map((item) => (
                      <div key={item.id} className="allocation-row">
                        <span>{item.label}</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{ width: `${analysis.percentages[item.id]}%`, background: item.color }}
                          />
                        </div>
                        <strong>{formatPercent(analysis.percentages[item.id])}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="score-breakdown">
                <p className="chart-title">Score breakdown</p>
                {analysis.breakdown.map((item) => (
                  <div key={item.label} className="score-row">
                    <span>{item.label}</span>
                    <strong>{item.value.toFixed(1)} / {item.max}</strong>
                  </div>
                ))}
              </div>

              <div className="trigger-box">
                <p className="chart-title">Recommendation triggers</p>
                <ul className="trigger-list">
                  {analysis.triggers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="disclaimer">
                  This scorecard is a decision-support tool and not financial advice.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="community">
          <div className="section-heading">
            <h2>Community that helps you stay on track</h2>
            <p>
              Learn with peers, compare notes, and grow confidence in your portfolio choices.
            </p>
          </div>
          <div className="card-grid">
            {communityCards.map((item) => (
              <div key={item.title} className="card">
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta" id="expert">
          <div>
            <h2>Need a second opinion on your portfolio?</h2>
            <p>
              Talk to a Diverss expert about portfolio health, risk alignment, and next steps.
            </p>
          </div>
          <a className="btn primary" href="#expert-form">
            Talk To An Expert
          </a>
        </section>

        <section className="section" id="expert-form">
          <div className="section-heading">
            <h2>Book a meeting with a Diverss expert</h2>
            <p>
              Share your details and preferred time. We will confirm a slot within 24 hours.
            </p>
          </div>
          <form
            className="meeting-form"
            onSubmit={handleMeetingSubmit}
            action={formspreeEndpoint}
            method="POST"
          >
            <input type="hidden" name="_subject" value="Diverss meeting request" />
            <div className="form-row">
              <label>
                Full name
                <input type="text" name="name" placeholder="Your name" required />
              </label>
              <label>
                Email
                <input type="email" name="email" placeholder="you@email.com" required />
              </label>
            </div>
            <div className="form-row">
              <label>
                Phone
                <input type="tel" name="phone" placeholder="+91 90000 00000" />
              </label>
              <label>
                Preferred date
                <input type="date" name="date" required />
              </label>
            </div>
            <div className="form-row">
              <label>
                Preferred time
                <input type="time" name="time" required />
              </label>
              <label>
                Topic
                <select name="topic" defaultValue="portfolio">
                  <option value="portfolio">Portfolio review</option>
                  <option value="risk">Risk alignment</option>
                  <option value="planning">Goal planning</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <label className="full">
              Notes
              <textarea name="notes" rows="4" placeholder="Tell us what you need help with." />
            </label>
            <div className="form-actions">
              <button className="btn primary" type="submit">
                {meetingStatus === 'sending' ? 'Sending...' : 'Request Meeting'}
              </button>
              {meetingStatus === 'success' && (
                <span className="form-success">Thanks! We will confirm your slot soon.</span>
              )}
              {meetingStatus === 'error' && (
                <span className="form-error">
                  Unable to send. Please check the Formspree ID or try again.
                </span>
              )}
              {meetingStatus === 'idle' && (
                <span className="form-hint">We respond within 24 hours.</span>
              )}
            </div>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <p className="footer-title">DIVERSS</p>
          <p className="footer-subtitle">Analyse, learn, and diversify with confidence.</p>
        </div>
        <div className="footer-links">
          <a href="#learn">Learn</a>
          <a href="#analyse" onClick={handleOpenAnalyzer}>Analyse</a>
          <a href="/stocksense">StockSense</a>
          <a href="#community">Community</a>
        </div>
        <p className="footer-note">Wealth-tech platform for modern investors.</p>
      </footer>

      {analyzerOpen && (
        <div className="analyzer-overlay" role="dialog" aria-modal="true">
          <div className="analyzer-shell">
            <button
              className="analyzer-close"
              type="button"
              aria-label="Close portfolio analyzer"
              onClick={() => setAnalyzerOpen(false)}
            >
              ×
            </button>
            <iframe
              className="analyzer-frame"
              title="Portfolio Analyzer"
              src={portfolioAnalyzerUrl}
            />
          </div>
        </div>
      )}
    </div>
  )
}
