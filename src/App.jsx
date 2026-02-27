import { useEffect, useRef, useState } from 'react'

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

export default function App() {
  const [meetingStatus, setMeetingStatus] = useState('idle')
  const [menuOpen, setMenuOpen] = useState(false)
  const [stocksenseHeight, setStocksenseHeight] = useState(980)
  const stocksenseFrameRef = useRef(null)

  useEffect(() => {
    const iframe = stocksenseFrameRef.current
    if (!iframe) return

    let observer
    let rafId

    const syncHeight = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc) return

        const body = doc.body
        const html = doc.documentElement
        const nextHeight = Math.max(
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          html?.clientHeight || 0,
          html?.scrollHeight || 0,
          html?.offsetHeight || 0
        )

        if (nextHeight > 0) {
          const minHeight = window.innerWidth <= 700 ? 760 : 860
          setStocksenseHeight(Math.max(nextHeight, minHeight))
        }
      } catch {
        // Same-origin is expected; ignore if document is temporarily unavailable.
      }
    }

    const scheduleSync = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(syncHeight)
    }

    const onLoad = () => {
      syncHeight()
      const doc = iframe.contentDocument
      if (doc?.body) {
        observer = new MutationObserver(scheduleSync)
        observer.observe(doc.body, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        })
      }
    }

    iframe.addEventListener('load', onLoad)
    window.addEventListener('resize', scheduleSync)

    if (iframe.contentDocument?.readyState === 'complete') {
      onLoad()
    }

    return () => {
      iframe.removeEventListener('load', onLoad)
      window.removeEventListener('resize', scheduleSync)
      if (observer) observer.disconnect()
      cancelAnimationFrame(rafId)
    }
  }, [])

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
          <a href="#analyse" onClick={() => setMenuOpen(false)}>Analyse</a>
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
            <a className="btn primary" href="#analyse">
              Analyse Portfolio
            </a>
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
            <h2>Analyse your portfolio with StockSense</h2>
            <p>
              We have replaced the old Diverss risk analyser with StockSense AI.
              Upload your holdings and get rule-based portfolio intelligence instantly.
            </p>
          </div>

          <div className="stocksense-shell">
            <iframe
              className="stocksense-frame"
              title="StockSense Analyzer"
              src="/stocksense"
              loading="lazy"
              ref={stocksenseFrameRef}
              style={{ height: `${stocksenseHeight}px` }}
            />
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
          <a href="#analyse">Analyse</a>
          <a href="/stocksense">StockSense</a>
          <a href="#community">Community</a>
        </div>
        <p className="footer-note">Wealth-tech platform for modern investors.</p>
      </footer>
    </div>
  )
}
