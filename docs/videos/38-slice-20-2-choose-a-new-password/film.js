// Video 38 · Slice 20.2: Choose a new password. Eleven scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running member app from shots.ts, through the page
// object and the shared fixture; the sessions, the single use and the race are drawn from what the
// API tests assert; the counts, the test names and the initial total are what the runners and the
// build printed (shots/captures.js). Every position is a pure function of the scene's time
// (docs/videos/README.md).
const { enter, ease, lerp, clamp, phone, tablet, browser, esc } = Film;
const C = window.FILM_CAPTURES;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;
const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which the fraction `f` of line `n` of scene `id` has been spoken. */
const part = (id, n, f) => lineOf(id, n).start - Film.at(id) + (lineOf(id, n).end - lineOf(id, n).start) * f;
/** The same, moved to the beat at or after it. */
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;

/** A device that rises into place at `when`. */
const arrive = (S, when, tilt = 0, from = 10) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.55);
    el.style.opacity = clamp(p * 4);
    el.style.transform = `translateY(${(1 - p) * 700}px) rotate(${lerp(from, tilt, p)}deg)`;
  });

/** Something that pops in at `when`, with a small overshoot. */
const pop = (S, when, tilt = 0) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

const card = 'box-sizing:border-box;border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const light = `${card};background:var(--palette-stone-0);color:var(--palette-stone-950)`;
const terminal = `${card};background:var(--palette-stone-1000);color:var(--palette-stone-50);padding:34px 40px;font:500 28px/1.45 var(--font-family-mono)`;
/** A close-up shot on a white card. */
const closeUp = (src, x, y, w, attrs) =>
  `<div style="${at(x, y, w)};${light};padding:28px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4310${path}`;
const TITLE = 'Reset password · Christian Fitness';

// ── Act 1: choosing a new password ──────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 20.2 · Choose a new password</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'A new')}<br>${S.words(S.beat(3), '', { accent: 'password.' })}</h1>
  </div>
  ${browser('shots/web-form-xl-light.png', { width: 860, title: TITLE, url: url('/reset-password'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-saved-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('open', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-045 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Checked')}<br>${S.words(S.beat(2.5), '', { accent: 'first.' })}</h1>
  </div>
  ${closeUp('shots/web-checking.png', 110, 520, 600, pop(S, S.beat(3), -1))}
  ${tablet('shots/web-form-m-light.png', { width: 560, style: at(800, 200, 560), attrs: arrive(S, onBeat(S, part('open', 0, 0.45)), -2, -8) })}
  ${phone('shots/web-form-xs-light.png', { width: 290, style: at(1480, 260, 290), attrs: arrive(S, onBeat(S, part('open', 0, 0.7)), 3, 9) })}
  </div>
`, { before: 0.3 });

Film.scene('token', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-045 · AC1 · ADR 0013</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Out of the')}<br>${S.words(S.beat(2.5), '', { accent: 'address bar.' })}</h1>
  </div>
  <div style="${at(820, 170, 1000)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">The emailed link</div>
    <div>/reset-password<span style="${rose}">#token=k3Jx9QwP…</span></div>
  </div>
  <div style="${at(820, 420, 1000)};${terminal};font-size:26px" ${pop(S, onBeat(S, part('token', 0, 0.45)))}>
    <div style="${dim}">POST ${esc(C.check.address)}/check · body</div>
    <div><span style="${green}">{ "token": "…" }</span> · never in a URL</div>
  </div>
  <div style="${at(820, 670, 1000)};${terminal};font-size:26px" ${pop(S, onBeat(S, part('token', 0, 0.65)))}>
    <div style="${dim}">The address bar, once read</div>
    <div>localhost:4310<span style="${green}">${esc(C.check.address)}</span></div>
  </div>
  </div>
`, { before: 0.3 });

Film.scene('save', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-045 · AC2 · AC6</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Password')}<br>${S.words(S.beat(2.5), '', { accent: 'saved.' })}</h1>
  </div>
  ${closeUp('shots/web-saving.png', 110, 470, 520, pop(S, onBeat(S, part('save', 0, 0.3)), -1))}
  ${browser('shots/web-saved-xl-light.png', { width: 1100, title: TITLE, url: url('/reset-password'), style: at(720, 230, 1100), attrs: arrive(S, onBeat(S, part('save', 0, 0.6)), 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('everywhere', (S) => {
  const rows = [
    ['phone', 'signed out'],
    ['laptop', 'signed out'],
    ['this browser', 'signed out'],
  ];
  return `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-045 · AC3 · ADR 0013</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Signed out')}<br>${S.words(S.beat(2.5), '', { accent: 'everywhere.' })}</h1>
  </div>
  <div style="${at(820, 170, 1000)};${terminal};font-size:28px">
    <div style="${dim};margin-bottom:16px" ${S.rise(S.beat(2), { y: 20 })}>Sessions of the member · one save with the new password</div>
    ${rows.map(([device, state], i) => `
      <div ${S.rise(S.beat(3 + i * 0.5), { y: 20 })}>${esc(device)} · GET /api/session · <span style="${rose}">401</span> ${esc(state)}</div>`).join('')}
    <div style="margin-top:16px" ${S.rise(onBeat(S, part('everywhere', 0, 0.6)), { y: 20 })}>another member · <span style="${green}">200</span> still signed in</div>
  </div>
  ${closeUp('shots/web-saved.png', 820, 600, 560, pop(S, onBeat(S, part('everywhere', 0, 0.75)), 1))}
  </div>`;
}, { before: 0.3 });

Film.scene('once', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-045 · AC4 · mock: error</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Works')}<br>${S.words(S.beat(2.5), '', { accent: 'once.' })}</h1>
  </div>
  <div style="${at(110, 500, 640)};${terminal};font-size:24px" ${pop(S, S.beat(3))}>
    <div>used · expired · unknown · none</div>
    <div><span style="${rose}">410</span> reset_link_expired</div>
  </div>
  ${browser('shots/web-expired-xl-light.png', { width: 800, title: TITLE, url: url('/reset-password'), style: at(820, 170, 800), attrs: arrive(S, onBeat(S, part('once', 0, 0.6)), 1, 6) })}
  ${phone('shots/web-expired-xs-light.png', { width: 260, style: at(1580, 400, 260), attrs: arrive(S, onBeat(S, part('once', 0, 0.65)), 4, 10) })}
  </div>
`, { before: 0.3 });

// ── Act 2: when it goes wrong ───────────────────────────────────────────────────────────────────
Film.scene('invalid', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-045 · AC5 · mock: invalid</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Named')}<br>${S.words(S.beat(2.5), '', { accent: 'first.' })}</h1>
  </div>
  ${closeUp('shots/web-invalid.png', 820, 120, 620, pop(S, S.beat(2), 1))}
  ${phone('shots/web-invalid-xs-light.png', { width: 270, style: at(1540, 300, 270), attrs: arrive(S, S.bar(2), 4, 10) })}
  </div>
`);

Film.scene('failed', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-045 · AC6 · mock: failed</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Try again,')}<br>${S.words(S.beat(2.5), '', { accent: 'nothing lost.' })}</h1>
  </div>
  ${closeUp('shots/web-failed.png', 110, 600, 760, pop(S, onBeat(S, part('failed', 0, 0.3)), -1))}
  ${phone('shots/web-failed-xs-light.png', { width: 300, style: at(1000, 150, 300), attrs: arrive(S, S.beat(2), -3, -8) })}
  ${browser('shots/web-failed-xl-light.png', { width: 640, title: TITLE, url: url('/reset-password'), style: at(1220, 330, 640), attrs: arrive(S, S.bar(2), 2, 8) })}
  </div>
`, { before: 0.3 });

Film.scene('race', (S) => `
  <div class="fill field--bordeaux">
  <div style="${at(110, 120, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-045 · AC7 · concurrency token</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Never')}<br>${S.words(S.beat(2.5), '', { accent: 'twice.' })}</h1>
  </div>
  <div style="${at(860, 220, 960)};${terminal};font-size:27px">
    <div ${S.rise(S.beat(2), { y: 20 })}>save A · reads the link · <span style="${green}">unused</span></div>
    <div ${S.rise(S.beat(2.5), { y: 20 })}>save B · reads the link · <span style="${green}">unused</span></div>
    <div ${S.rise(S.beat(3.5), { y: 20 })}>save A · writes · <span style="${green}">204</span></div>
    <div ${S.rise(onBeat(S, part('race', 0, 0.6)), { y: 20 })}>save B · writes · <span style="${rose}">410 reset_link_expired</span></div>
    <div style="${dim};margin-top:18px" ${S.rise(onBeat(S, part('race', 0, 0.8)), { y: 20 })}>nothing of save B is kept</div>
  </div>
  </div>
`, { before: 0.3 });

// ── Act 3: what it proves ───────────────────────────────────────────────────────────────────────
Film.scene('proof', (S) => {
  const rows = [
    [`${C.specs.tests} Playwright tests`, C.specs.command],
    [`${C.unit.passed} unit tests`, C.unit.command],
    [`${C.backend.passed} backend tests`, C.backend.command],
  ];
  return `
  <div class="fill field--ink">
  <div style="${at(110, 110, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Red,')}<br>${S.words(S.beat(2), 'then', { accent: 'green.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>First load ${C.build.raw} kB of 275.</p>
  </div>
  <div style="${at(880, 200, 940)};${terminal};font-size:34px">
    ${rows.map(([what, cmd], i) => `
      <div style="margin-bottom:30px" ${S.rise(S.beat(2 + i), { y: 30 })}>
        <div><span style="${green}">✓</span> ${esc(what)}</div>
        <div style="font-size:24px;${dim}">${esc(cmd)}</div>
      </div>`).join('')}
  </div>
  </div>`;
});

Film.scene('close', (S) => `
  <div class="fill field--ink">${S.aurora((t) => 1 - Film.exit(t, S.length - 2.5, 2.5) * 0.6)}
  <div style="position:absolute;left:0;right:0;top:370px;text-align:center">
    <p class="wordmark" ${S.rise(S.beat(1), { y: 40 })}>Christian <span class="accent">Fitness</span></p>
    <p class="lede" style="margin-top:44px" ${S.rise(S.bar(1))}>A Christian community for health in body and spirit.</p>
  </div>
  </div>
`);

// A change of act is a wipe in a brand colour; inside an act the cuts are hard.
const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => Film.prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('invalid', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
