import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { FixKey } from './fixes'
import './sample.css'

interface Props {
  fixed: ReadonlySet<FixKey>
}

const DAYS = [
  { id: 'sun', short: 'Sun', date: 11 },
  { id: 'mon', short: 'Mon', date: 12 },
  { id: 'tue', short: 'Tue', date: 13 },
  { id: 'wed', short: 'Wed', date: 14 },
]
const TIMES = [
  { id: '14:00', screen: 'Screen 2' },
  { id: '17:30', screen: 'Screen 4 · IMAX' },
  { id: '20:15', screen: 'Screen 2' },
]
const PRICE = 3750
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

const REPLIES = [
  'You can pay by card here, or by bank transfer at the box office up to 30 minutes before the film.',
  'Screen 4 is IMAX with reclining seats. Row F is the sweet spot.',
  'Yes, the 17:30 has Yoruba and English subtitles.',
]

/**
 * Ember Cinemas: a believable booking page with nine accessibility flaws
 * built in on purpose. Each flaw can be fixed independently via `fixed`, so
 * the demo can show the audit change as you repair the page.
 */
export function Sample({ fixed }: Props) {
  const has = (k: FixKey) => fixed.has(k)
  const [day, setDay] = useState('sun')
  const [time, setTime] = useState('17:30')
  const [tickets, setTickets] = useState(2)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [booked, setBooked] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const [messages, setMessages] = useState<{ from: 'ada' | 'you'; text: string }[]>([
    { from: 'ada', text: 'Hi! Need help choosing seats or paying with transfer?' },
  ])
  const [draft, setDraft] = useState('')
  const [toast, setToast] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const replies = useRef(0)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const nav = (e: React.MouseEvent) => {
    e.preventDefault()
    setToast('Just a demo page: nothing behind this link.')
  }

  const pay = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter the email address your tickets should go to.')
      return
    }
    setError('')
    setBooked(`EMB-${(Math.abs([...email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 90000) + 10000}`)
  }

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((m) => [...m, { from: 'you', text }])
    setDraft('')
    const reply = REPLIES[replies.current++ % REPLIES.length]!
    setTimeout(() => setMessages((m) => [...m, { from: 'ada', text: reply }]), 700)
  }

  // The flaw: Tab is caught and wrapped inside the widget, and Escape does nothing.
  const onChatKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (has('chat-trap')) {
      if (e.key === 'Escape') {
        setChatOpen(false)
        requestAnimationFrame(() => launcherRef.current?.focus())
      }
      return
    }
    if (e.key !== 'Tab') return
    const stops = [...chatRef.current!.querySelectorAll<HTMLElement>('[data-chat-stop]')]
    const i = stops.indexOf(document.activeElement as HTMLElement)
    e.preventDefault()
    stops[(i + (e.shiftKey ? stops.length - 1 : 1)) % stops.length]!.focus()
  }

  const Wrapper = has('main-landmark') ? 'main' : 'div'
  const AboutHeading = has('heading-level') ? 'h2' : 'h3'
  const total = tickets * PRICE

  return (
    <div className="ember" lang="en-NG">
      {/* A stylesheet the audit can read: the focus-ring flaw lives here on purpose. */}
      {!has('signin-focus') && <style>{`.ember .signin:focus { outline: none; }`}</style>}
      <header className="pnav">
        <a href="#" className="plogo" onClick={nav}>
          Ember
        </a>
        <nav aria-label="Main" className="plinks">
          <a href="#" onClick={nav}>
            Movies
          </a>
          <a href="#" onClick={nav}>
            Cinemas
          </a>
          <a href="#" onClick={nav}>
            Snacks
          </a>
        </nav>
        <span className="ploc">Lekki Phase 1 ▾</span>
        <a href="#" className="signin" onClick={nav} data-fix="signin-focus">
          Sign in
        </a>
      </header>

      <Wrapper className="pmain">
        <div className="hero">
          <div className="poster">
            <img src="/photos/canoe-third-mainland.jpg" alt="Poster: a passenger canoe crossing the lagoon at dusk" width={960} height={720} />
            <div className="poster-tint" />
            <div className="poster-title" aria-hidden="true">
              <b>THE FERRYMAN</b>
              <span>OF EPE</span>
            </div>
          </div>

          <div className="info">
            <h1 className="ptitle">The Ferryman of Epe</h1>
            <p className="pmeta">Drama · 1h 52m · Yoruba and English, subtitled · Rated 15</p>

            <div className="days" role="group" aria-label="Day">
              {DAYS.map((d) => (
                <button key={d.id} type="button" className={`day${day === d.id ? ' on' : ''}`} aria-pressed={day === d.id} onClick={() => setDay(d.id)}>
                  {d.short}
                  <b>{d.date}</b>
                </button>
              ))}
            </div>

            <div className="times" role="group" aria-label="Showtime">
              {TIMES.map((t) =>
                t.id === '20:15' && !has('showtime-button') ? (
                  // The flaw: a div with a click handler. Looks the same, can't be reached by keyboard.
                  <div key={t.id} className={`time${time === t.id ? ' on' : ''}`} data-fix="showtime-button" onClick={() => setTime(t.id)}>
                    {t.id}
                    <small>{t.screen}</small>
                  </div>
                ) : (
                  <button
                    key={t.id}
                    type="button"
                    className={`time${time === t.id ? ' on' : ''}`}
                    aria-pressed={time === t.id}
                    onClick={() => setTime(t.id)}
                    data-fix={t.id === '20:15' ? 'showtime-button' : undefined}
                  >
                    {t.id}
                    <small>{t.screen}</small>
                  </button>
                ),
              )}
            </div>

            {booked ? (
              <div className="booked" role="status">
                <b>Booked. Reference {booked}</b>
                <span>
                  {tickets} ticket{tickets > 1 ? 's' : ''} for {DAYS.find((d) => d.id === day)!.short} {DAYS.find((d) => d.id === day)!.date} at {time}, sent to{' '}
                  {email}.
                </span>
                <button type="button" className="link" onClick={() => setBooked(null)}>
                  Book another
                </button>
              </div>
            ) : (
              <form className="form" onSubmit={pay} noValidate>
                <div className="fld">
                  <label htmlFor="tickets">Tickets</label>
                  <select id="tickets" className="sel" value={tickets} onChange={(e) => setTickets(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} adult{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld grow">
                  {has('email-label') ? <label htmlFor="email">Email for your tickets</label> : <span className="fld-gap" aria-hidden="true" />}
                  <input
                    id="email"
                    type="email"
                    className="inp"
                    placeholder={has('email-label') ? 'you@example.com' : 'Email for your tickets'}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'email-error' : undefined}
                    data-fix="email-label"
                  />
                </div>
                <button type="submit" className={`pay${has('pay-contrast') ? ' fixed' : ''}`} data-fix="pay-contrast">
                  Pay {naira(total)}
                </button>
                {error && (
                  <p id="email-error" className="err">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        <section className="about-film" aria-label="About the film">
          <AboutHeading data-fix="heading-level">About the film</AboutHeading>
          <p>
            For thirty years Kunle has rowed the same crossing from Epe to Ikorodu. When the new bridge is announced, his passengers start to drift away, and
            his daughter wants him to sell the boat. A quiet, funny film about work, pride and the water that holds a city together.
          </p>
        </section>
      </Wrapper>

      <footer className="foot">
        <span>© 2026 Ember Cinemas Ltd</span>
        <a href="#" onClick={nav} tabIndex={has('terms-tabindex') ? undefined : 3} data-fix="terms-tabindex">
          Terms
        </a>
        <a href="#" onClick={nav}>
          Privacy
        </a>
        <a href="#" onClick={nav}>
          Careers
        </a>
        <span>Admiralty Way, Lekki Phase 1</span>
      </footer>

      {chatOpen ? (
        <div className="chat" ref={chatRef} role="region" aria-label="Chat with Ember" data-fix="chat-trap" onKeyDown={onChatKey}>
          <div className="chat-h">
            <span className="chat-who">
              <img src="/photos/agent-ada.jpg" alt="" width={26} height={26} />
              Ada from Ember
            </span>
            {has('chat-close') ? (
              <button type="button" className="chat-x" aria-label="Close chat" data-chat-stop data-fix="chat-close" onClick={() => setChatOpen(false)}>
                ✕
              </button>
            ) : (
              // The flaw: a focusable span with no role and no name.
              <span className="chat-x" tabIndex={0} data-chat-stop data-fix="chat-close" onClick={() => setChatOpen(false)}>
                ✕
              </span>
            )}
          </div>
          <div className="chat-m" aria-live="polite">
            {messages.map((m, i) => (
              <p key={i} className={`bub ${m.from}`}>
                {m.text}
              </p>
            ))}
          </div>
          <form
            className="chat-row"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <input className="ci" aria-label="Message" placeholder="Type a message" value={draft} onChange={(e) => setDraft(e.target.value)} data-chat-stop />
            <button type="submit" className="send" data-chat-stop>
              Send
            </button>
          </form>
        </div>
      ) : (
        <button type="button" className="chat-launch" ref={launcherRef} onClick={() => setChatOpen(true)}>
          <img src="/photos/agent-ada.jpg" alt="" width={28} height={28} /> Chat with Ada
        </button>
      )}

      {toast && (
        <div className="ember-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
