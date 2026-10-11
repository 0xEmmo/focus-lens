import { PHOTOS } from './photos'

const REPO = 'https://github.com/0xEmmo/focus-lens'

export function About() {
  const hero = PHOTOS[0]!
  return (
    <div className="info-body">
      <figure className="info-fig">
        <img src={hero.src} alt={hero.alt} width={960} height={480} loading="lazy" />
        <figcaption>
          A braille display: one of the ways people read the web without a mouse. Photo: {hero.credit}, {hero.licence}.
        </figcaption>
      </figure>
      <p>
        Focus Lens shows a page the way a keyboard does. It numbers every tab stop and draws the path between them, so a positive <code>tabindex</code> or a
        widget that won’t let go is obvious at a glance.
      </p>
      <h3>What it checks</h3>
      <ul className="checks">
        <li>
          <b>Keyboard traps</b> (2.1.2). It sends Tab to each stop and follows wherever the page’s script moves focus, then tries Escape.
        </li>
        <li>
          <b>Names and labels</b> (1.3.1, 4.1.2). Controls with no accessible name, and fields labelled only by a placeholder.
        </li>
        <li>
          <b>Text contrast</b> (1.4.3), composited through translucent backgrounds, with the nearest passing shade of the same colour.
        </li>
        <li>
          <b>Focus order and visibility</b> (2.4.3, 2.4.7). Positive tabindex, and stylesheets that remove the focus ring with nothing in its place.
        </li>
        <li>
          <b>Reachability</b> (2.1.1). Things that look clickable but never take focus.
        </li>
        <li>
          <b>Structure</b> (1.3.1, 2.4.1). Skipped heading levels and a missing main landmark.
        </li>
      </ul>
      <h3>What it doesn’t</h3>
      <p>
        Automated checks find roughly a third of real problems. Focus Lens is for the keyboard part, quickly and visually; it’s not a certificate. Test with a
        keyboard and a screen reader too.
      </p>
      <p>Everything runs in your browser. Nothing about the page you audit is sent anywhere.</p>
      <h3>Photos</h3>
      <ul className="credits">
        {PHOTOS.map((p) => (
          <li key={p.src}>
            <a href={p.source} target="_blank" rel="noreferrer">
              {p.alt.split(',')[0]}
            </a>{' '}
            by {p.credit}, {p.licence}
          </li>
        ))}
      </ul>
      <p className="small">
        Built by Emmanuel Balogun.{' '}
        <a href={REPO} target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
        , MIT licensed.
      </p>
    </div>
  )
}

export function GetExtension() {
  return (
    <div className="info-body">
      <p>The same panel runs as a Chrome extension, in the side panel, on any page you open.</p>
      <ol className="steps">
        <li>
          <a className="btn dark" href="/focus-lens-extension.zip" download>
            Download the extension (.zip)
          </a>
        </li>
        <li>Unzip it.</li>
        <li>
          Open <code className="mono">chrome://extensions</code> and switch on <b>Developer mode</b>.
        </li>
        <li>
          Choose <b>Load unpacked</b> and pick the unzipped folder.
        </li>
        <li>Pin Focus Lens, open any page and click the lens. The audit runs in the side panel.</li>
      </ol>
      <p>
        Want something broken to try it on? Open the{' '}
        <a href="/sample.html" target="_blank" rel="noreferrer">
          Ember Cinemas sample page
        </a>{' '}
        on its own.
      </p>
      <p className="small">
        It asks for <code className="mono">activeTab</code>, <code className="mono">scripting</code> and <code className="mono">sidePanel</code>: it can only
        read a page after you click it there, and it never sends what it reads anywhere.
      </p>
    </div>
  )
}
