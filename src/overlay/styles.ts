/** Overlay styles, injected into the shadow root. Yellow and black so it reads on any page. */
export const OVERLAY_CSS = `
:host { all: initial; }
.root { position: absolute; inset: 0; font: 700 12px/1 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
.root > * { position: absolute; box-sizing: border-box; }
.paths { left: 0; top: 0; overflow: visible; }
.paths .calm { stroke: #161616; stroke-width: 1.5; fill: none; opacity: .45; }
.paths .alarm { stroke: #d6261b; stroke-width: 2.2; fill: none; stroke-dasharray: 6 4; }
.paths .loop { stroke: #d6261b; stroke-width: 2.5; fill: none; marker-end: url(#fl-arrow); }
.badge { min-width: 24px; height: 24px; padding: 0 6px; border-radius: 12px; background: #ffd400; color: #161616; border: 2px solid #161616;
  display: grid; place-items: center; transform: translate(-50%, -50%); font-size: 13px; }
.badge.bad { background: #d6261b; color: #fff; border-color: #fff; box-shadow: 0 0 0 1.5px #d6261b; }
.ring { border: 2.5px solid #ffd400; border-radius: 6px; box-shadow: 0 0 0 1px rgba(22,22,22,.35); }
.ring.bad { border-color: #d6261b; }
.flag { border: 2.5px dashed #d6261b; border-radius: 12px; }
.callout { background: #161616; color: #fff; padding: 6px 9px; border-radius: 5px; white-space: nowrap; letter-spacing: .1px; }
.callout.red { background: #d6261b; }
.focus { border: 3px solid #161616; border-radius: 10px; box-shadow: 0 0 0 4px #ffd400, 0 0 0 7px #161616; animation: pulse 1.2s ease-in-out 2; }
.heading { border: 2px solid #6a3fb5; border-radius: 4px; background: rgba(106,63,181,.06); }
.heading-tag { background: #6a3fb5; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 11px; }
.landmark { border: 2px dashed #0b6e4f; border-radius: 6px; }
.landmark span { position: absolute; right: 4px; top: 4px; background: #0b6e4f; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 11px; }
@keyframes pulse { 50% { box-shadow: 0 0 0 8px #ffd400, 0 0 0 11px #161616; } }
@media (prefers-reduced-motion: reduce) { .focus { animation: none; } }
`
