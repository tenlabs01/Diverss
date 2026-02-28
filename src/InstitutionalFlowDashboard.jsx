import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const SECTORS = ['Banking', 'IT', 'Pharma', 'Auto', 'FMCG', 'Metals', 'Energy', 'Realty', 'Infra', 'Telecom']
const PERIODS = ['Today', '1W', '1M', '3M', 'YTD']
const CHART_FILTERS = ['combined', 'fii', 'dii']

const CHART_LINES = {
  fii: [{ key: 'fii', label: 'FII', color: '#015574' }],
  dii: [{ key: 'dii', label: 'DII', color: '#035878' }],
  combined: [
    { key: 'fii', label: 'FII', color: '#015574' },
    { key: 'dii', label: 'DII', color: '#035878' },
    { key: 'combined', label: 'Net', color: '#2aa66a' },
  ],
}

function rnd(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(2)
}

function generateSectorData(period) {
  const mult = period === 'Today' ? 1 : period === '1W' ? 7 : period === '1M' ? 30 : period === '3M' ? 90 : 252
  return SECTORS.map((sector) => {
    const fii = rnd(-4000, 6000) * (mult / 30)
    const dii = rnd(-3000, 5000) * (mult / 30)
    const net = fii + dii
    const flow7d = rnd(-2000, 4000)
    const flow1m = rnd(-5000, 8000)
    const raw = flow7d * 0.4 + flow1m * 0.6
    const momentum = Math.min(100, Math.max(0, Math.round(((raw + 4800) / 9600) * 100)))
    const trend7d = [
      rnd(-500, 800),
      rnd(-400, 700),
      rnd(-600, 900),
      rnd(-300, 600),
      rnd(-500, 800),
      rnd(-400, 750),
      net / 7,
    ]
    return {
      sector,
      fii: +fii.toFixed(0),
      dii: +dii.toFixed(0),
      net: +net.toFixed(0),
      flow7d: +flow7d.toFixed(0),
      flow1m: +flow1m.toFixed(0),
      momentum,
      trend7d,
    }
  })
}

function generateTimeSeriesData(period) {
  const labels =
    period === 'Today'
      ? ['9:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30']
      : period === '1W'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : period === '1M'
          ? Array.from({ length: 30 }, (_, i) => `D${i + 1}`)
          : period === '3M'
            ? ['Jan W1', 'Jan W2', 'Jan W3', 'Jan W4', 'Feb W1', 'Feb W2', 'Feb W3', 'Feb W4', 'Mar W1', 'Mar W2', 'Mar W3', 'Mar W4']
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return labels.map((label) => ({
    label,
    fii: +rnd(-3000, 5000).toFixed(0),
    dii: +rnd(-2000, 4000).toFixed(0),
    combined: +rnd(-4000, 7000).toFixed(0),
  }))
}

function fmtSigned(value) {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('en-IN')}`
}

function fmtCr(value) {
  return `${value >= 0 ? '+' : '-'}₹${Math.abs(value).toLocaleString('en-IN')} Cr`
}

function Sparkline({ values, positive }) {
  const width = 82
  const height = 30
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline
        fill="none"
        stroke={positive ? '#16a34a' : '#dc2626'}
        strokeWidth="1.8"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function TrendArrow({ value }) {
  if (value > 1000) return <span className="ifd-arrow up-strong">↑↑</span>
  if (value > 0) return <span className="ifd-arrow up">↑</span>
  if (value < -1000) return <span className="ifd-arrow down-strong">↓↓</span>
  return <span className="ifd-arrow down">↓</span>
}

function MomentumBar({ score }) {
  const color = score >= 60 ? '#2aa66a' : score >= 40 ? '#d39a38' : '#d67979'
  return (
    <div className="ifd-momentum-wrap">
      <div className="ifd-momentum-track">
        <div className="ifd-momentum-fill" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span style={{ color }}>{score}</span>
    </div>
  )
}

function getRowTone(row) {
  if (row.fii > 0 && row.dii > 0) return 'ifd-row-buy'
  if (row.fii < 0 && row.dii < 0) return 'ifd-row-sell'
  return 'ifd-row-diverge'
}

function smoothPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function LineTrendChart({ data, filter }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const lines = CHART_LINES[filter]
  const width = 920
  const height = 280
  const pad = { top: 16, right: 18, bottom: 38, left: 44 }
  if (!data.length) return null

  const allValues = data.flatMap((row) => lines.map((line) => row[line.key]))
  allValues.push(0)
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const range = max - min || 1

  const xStep = (width - pad.left - pad.right) / Math.max(data.length - 1, 1)
  const yFor = (value) => pad.top + ((max - value) / range) * (height - pad.top - pad.bottom)
  const xFor = (index) => pad.left + index * xStep

  const yTicks = 5
  const xLabelStep = data.length > 16 ? 4 : data.length > 10 ? 2 : 1
  const zeroY = yFor(0)
  const safeIndex = activeIndex === null ? null : Math.max(0, Math.min(data.length - 1, activeIndex))
  const activePoint = safeIndex === null ? null : data[safeIndex]
  const activeX = safeIndex === null ? null : xFor(safeIndex)
  const activeTopY =
    safeIndex === null
      ? null
      : Math.min(...lines.map((line) => yFor(data[safeIndex][line.key])))

  const linePaths = lines.map((line) => {
    const points = data.map((row, index) => ({
      x: xFor(index),
      y: yFor(row[line.key]),
    }))
    return {
      ...line,
      points,
      path: smoothPath(points),
    }
  })

  function onMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const relativeX = ((event.clientX - rect.left) / rect.width) * width
    const idx = Math.round((relativeX - pad.left) / xStep)
    if (idx < 0 || idx >= data.length) {
      setActiveIndex(null)
      return
    }
    setActiveIndex(idx)
  }

  return (
    <div className="ifd-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="ifd-chart-svg"
        role="img"
        aria-label="Institutional flow trend chart"
        onMouseMove={onMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.12" />
          </filter>
        </defs>

        {Array.from({ length: yTicks }).map((_, index) => {
          const t = index / (yTicks - 1)
          const y = pad.top + t * (height - pad.top - pad.bottom)
          const value = max - t * (max - min)
          return (
            <g key={`y-${index}`}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e6eef4" strokeDasharray="4 4" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#8a97a7">
                ₹{Math.round(value / 1000)}k
              </text>
            </g>
          )
        })}

        <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} stroke="#c5d0da" strokeDasharray="3 3" />

        {linePaths.map((line) => (
          <path
            key={line.key}
            d={line.path}
            fill="none"
            stroke={line.color}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lineGlow)"
          />
        ))}

        {safeIndex !== null && activeX !== null && (
          <line
            x1={activeX}
            y1={pad.top}
            x2={activeX}
            y2={height - pad.bottom}
            stroke="#a7b4c2"
            strokeDasharray="4 4"
          />
        )}

        {safeIndex !== null &&
          linePaths.map((line) => {
            const value = data[safeIndex][line.key]
            return (
              <g key={`dot-${line.key}`}>
                <circle cx={activeX} cy={yFor(value)} r="6.5" fill="#fff" stroke={line.color} strokeWidth="2.5" />
                <circle cx={activeX} cy={yFor(value)} r="3.2" fill={line.color} />
              </g>
            )
          })}

        {data.map((row, index) =>
          index % xLabelStep === 0 ? (
            <text key={row.label} x={xFor(index)} y={height - 12} textAnchor="middle" fontSize="10" fill="#8a97a7">
              {row.label}
            </text>
          ) : null,
        )}
      </svg>

      {activePoint && (
        <div
          className={`ifd-chart-tooltip ${activeX > width * 0.62 ? 'left' : ''}`}
          style={{
            left: `${(activeX / width) * 100}%`,
            top: `${Math.max(10, ((activeTopY - 10) / height) * 100)}%`,
          }}
        >
          <p>{activePoint.label}</p>
          {lines.map((line) => {
            const value = activePoint[line.key]
            return (
              <div key={line.key}>
                <span style={{ color: line.color }}>{line.label}</span>
                <strong className={value >= 0 ? 'pos' : 'neg'}>
                  {fmtCr(value)}
                </strong>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function InstitutionalFlowDashboard() {
  const [period, setPeriod] = useState('1M')
  const [chartFilter, setChartFilter] = useState('combined')
  const [chartSector, setChartSector] = useState('All')
  const [sectorData, setSectorData] = useState([])
  const [timeSeriesData, setTimeSeriesData] = useState([])
  const [hoveredRow, setHoveredRow] = useState(null)
  const [sortKey, setSortKey] = useState('net')
  const [sortDir, setSortDir] = useState('desc')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const refreshRef = useRef(null)

  const loadData = useCallback(() => {
    setSectorData(generateSectorData(period))
    setTimeSeriesData(generateTimeSeriesData(period))
    setLastUpdated(new Date())
  }, [period])

  useEffect(() => {
    loadData()
    refreshRef.current = setInterval(loadData, 15 * 60 * 1000)
    return () => clearInterval(refreshRef.current)
  }, [loadData])

  const summaryData = useMemo(() => {
    const totalFII = sectorData.reduce((acc, row) => acc + row.fii, 0)
    const totalDII = sectorData.reduce((acc, row) => acc + row.dii, 0)
    const net = totalFII + totalDII
    const strongest = sectorData.reduce((best, row) => (row.net > best.net ? row : best), { net: -Infinity, sector: '—' })
    return { totalFII, totalDII, net, strongest }
  }, [sectorData])

  const classified = useMemo(() => {
    const bothBuying = []
    const divergence = []
    const bothSelling = []

    sectorData.forEach((row) => {
      if (row.fii > 0 && row.dii > 0) bothBuying.push(row.sector)
      else if (row.fii < 0 && row.dii < 0) bothSelling.push(row.sector)
      else divergence.push(row.sector)
    })

    return { bothBuying, divergence, bothSelling }
  }, [sectorData])

  const sortedData = useMemo(() => {
    return [...sectorData].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [sectorData, sortDir, sortKey])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('desc')
  }

  function exportCSV() {
    const headers = ['Sector', 'FII (₹Cr)', 'DII (₹Cr)', 'Net (₹Cr)', '7D Flow', '1M Flow', 'Momentum']
    const rows = sectorData.map((row) => [row.sector, row.fii, row.dii, row.net, row.flow7d, row.flow1m, row.momentum])
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `institutional-flows-${period}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const displaySeries =
    chartSector === 'All'
      ? timeSeriesData
      : timeSeriesData.map((point) => {
          const bump = chartSector.length * 9
          return {
            ...point,
            fii: point.fii + bump,
            dii: point.dii - bump / 2,
            combined: point.combined + bump / 3,
          }
        })

  return (
    <section className="section institutional-flow-section" id="community">
      <div className="section-heading">
        <h2>Check Institutional Money Flow</h2>
        <p>Track sector-wise FII and DII capital movement with momentum, divergence, and trend snapshots.</p>
      </div>

      <div className="ifd">
        <div className="ifd-top">
          <p className="ifd-update">
            Updated:{' '}
            {lastUpdated.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <div className="ifd-controls">
            <div className="ifd-segment">
              {PERIODS.map((p) => (
                <button key={p} type="button" className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
                  {p}
                </button>
              ))}
            </div>
            <button type="button" className="btn primary ifd-export" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="ifd-cards">
          {[
            { label: 'FII Net', value: summaryData.totalFII, sub: 'Foreign Institutional' },
            { label: 'DII Net', value: summaryData.totalDII, sub: 'Domestic Institutional' },
            { label: 'Net Institutional Flow', value: summaryData.net, sub: 'FII + DII' },
          ].map((card) => {
            const isPositive = card.value >= 0
            return (
              <article key={card.label} className="ifd-card">
                <p className="ifd-card-label">{card.label}</p>
                <p className="ifd-card-sub">{card.sub}</p>
                <p className={isPositive ? 'ifd-value pos' : 'ifd-value neg'}>{fmtCr(card.value)}</p>
                <Sparkline values={Array.from({ length: 8 }, () => rnd(-2000, 4000))} positive={isPositive} />
              </article>
            )
          })}
          <article className="ifd-card">
            <p className="ifd-card-label">Strongest Sector</p>
            <p className="ifd-card-sub">By net inflow</p>
            <p className="ifd-strong-sector">{summaryData.strongest?.sector}</p>
            <p className={(summaryData.strongest?.net ?? 0) >= 0 ? 'ifd-value pos' : 'ifd-value neg'}>
              {fmtCr(summaryData.strongest?.net ?? 0)}
            </p>
          </article>
        </div>

        <div className="ifd-table-shell">
          <div className="ifd-table-header">
            <div>
              <h3>Sector Heatmap</h3>
              <p>Scroll to view all sectors • Hover for details</p>
            </div>
            <div className="ifd-heat-legend" aria-label="Heatmap legend">
              <span><i className="ifd-legend-box buy" />Both Buy</span>
              <span><i className="ifd-legend-box diverge" />Diverge</span>
              <span><i className="ifd-legend-box sell" />Both Sell</span>
            </div>
          </div>
          <div className="ifd-table-scroll">
            <table className="ifd-table">
              <thead>
                <tr>
                  {[
                    ['sector', 'Sector'],
                    ['fii', 'FII (₹Cr)'],
                    ['dii', 'DII (₹Cr)'],
                    ['net', 'Net (₹Cr)'],
                    ['momentum', 'Momentum'],
                    ['flow7d', '7D Trend'],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className={sortKey === key ? 'active' : ''}
                    >
                      {label} {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, index) => (
                  <tr
                    key={row.sector}
                    className={getRowTone(row)}
                    onMouseEnter={() => setHoveredRow(index)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="ifd-sector-cell">
                      {row.sector}
                      {hoveredRow === index && (
                        <div className="ifd-hover">
                          <p>{row.sector}</p>
                          <div>
                            <span>7D Flow</span>
                            <strong className={row.flow7d >= 0 ? 'ifd-hover-pos' : 'ifd-hover-neg'}>
                              {fmtCr(row.flow7d)}
                            </strong>
                          </div>
                          <div>
                            <span>1M Flow</span>
                            <strong className={row.flow1m >= 0 ? 'ifd-hover-pos' : 'ifd-hover-neg'}>
                              {fmtCr(row.flow1m)}
                            </strong>
                          </div>
                          <div>
                            <span>Momentum</span>
                            <strong className="ifd-hover-momentum">{row.momentum}/100</strong>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className={row.fii >= 0 ? 'ifd-flow-positive' : 'ifd-flow-negative'}>{fmtSigned(row.fii)}</td>
                    <td className={row.dii >= 0 ? 'ifd-flow-positive' : 'ifd-flow-negative'}>{fmtSigned(row.dii)}</td>
                    <td className={row.net >= 0 ? 'ifd-net-positive' : 'ifd-net-negative'}>{fmtSigned(row.net)}</td>
                    <td><MomentumBar score={row.momentum} /></td>
                    <td><TrendArrow value={row.net} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ifd-divergence">
          {[
            { label: 'Both Buying', emoji: '🔥', sectors: classified.bothBuying, tone: 'buy' },
            { label: 'Divergence', emoji: '⚖️', sectors: classified.divergence, tone: 'diverge' },
            { label: 'Both Selling', emoji: '⚠️', sectors: classified.bothSelling, tone: 'sell' },
          ].map((card) => (
            <article key={card.label} className={`ifd-div-card ${card.tone}`}>
              <header>
                <span>{card.emoji}</span>
                <h4>{card.label}</h4>
                <strong>{card.sectors.length}</strong>
              </header>
              <div className="ifd-chip-wrap">
                {card.sectors.length > 0
                  ? card.sectors.map((sector) => (
                      <span key={sector} className="ifd-chip">{sector}</span>
                    ))
                  : <span className="ifd-empty">None currently</span>}
              </div>
            </article>
          ))}
        </div>

        <div className="ifd-chart-card">
          <div className="ifd-chart-head">
            <div>
              <h3>Flow Trend Chart</h3>
              <p>Net institutional capital movement over time.</p>
            </div>
            <div className="ifd-chart-controls">
              <div className="ifd-segment small">
                {CHART_FILTERS.map((item) => (
                  <button key={item} type="button" className={chartFilter === item ? 'active' : ''} onClick={() => setChartFilter(item)}>
                    {item === 'combined' ? 'All' : item.toUpperCase()}
                  </button>
                ))}
              </div>
              <select value={chartSector} onChange={(event) => setChartSector(event.target.value)}>
                <option value="All">All Sectors</option>
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          </div>

          <LineTrendChart data={displaySeries} filter={chartFilter} />

          <div className="ifd-legend">
            {CHART_LINES[chartFilter].map((line) => (
              <span key={line.key}>
                <i style={{ background: line.color }} />
                {line.label}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[#015574] text-white rounded-2xl p-8 shadow-sm">
  <span className="text-sm uppercase tracking-wider text-[#5de1e6]">
    Strategic Intelligence
  </span>

  <h3 className="text-2xl font-semibold mt-2">
    Institutions Move Before Retail Reacts.
  </h3>

  <p className="mt-4 text-gray-200 leading-relaxed">
    FII and DII activity often signals where capital is positioning —
    days or even weeks before price action reflects it.
  </p>

  <p className="mt-3 text-gray-200 leading-relaxed">
    Use this dashboard to identify sector-level accumulation,
    distribution, and divergence patterns in real time.
  </p>

  <p className="mt-4 font-medium text-[#60ebf0]">
    When institutions align, momentum often follows.
    When they diverge, volatility tends to increase.
  </p>
</div>
        </div>
      </div>
    </section>
  )
}
