// Video 08 · Slice 3.2: Sign-in protections. Ten scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running member app from shots.ts, through the page
// objects and the shared fixture; the window's timeline and the API's answers are drawn from what
// the API tests assert; the addresses, the counts, the test names and the initial total are what
// the take and the runners printed (shots/captures.js). Every position is a pure function of the
// scene's time (docs/videos/README.md).
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
const chip = (text, bg, fg, size = 36) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 ${size}px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const arrow = (color = 'var(--palette-bordeaux-700)') =>
  `<span style="font:600 44px/1 var(--font-family-sans);color:${color}">→</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (p) => `localhost:4310${p}`;

// ── Act 1: guessing and suspension ──────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 3.2 · Sign-in protections</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Guard')}<br>${S.words(S.beat(3), '', { accent: 'the door.' })}</h1>
  </div>
  ${browser('shots/web-sign-in-paused-xl-light.png', { width: 860, title: 'Sign in · Christian Fitness', url: url('/sign-in'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-sign-in-suspended-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('paused', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-004 · AC3 · 429 too_many_attempts</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Five tries,')}<br>${S.words(S.beat(2.5), '', { accent: 'then a pause.' })}</h1>
  </div>
  ${closeUp('shots/web-sign-in-paused.png', 110, 500, 560, pop(S, onBeat(S, part('paused', 0, 0.4)), -1))}
  ${tablet('shots/web-sign-in-paused-m-light.png', { width: 420, style: at(760, 220, 420), attrs: arrive(S, 0.2, -2, -6) })}
  ${phone('shots/web-sign-in-paused-xs-light.png', { width: 300, style: at(1260, 160, 300), attrs: arrive(S, S.bar(2), 3, 8) })}
  <p class="lede" style="${at(1220, 900, 600)}" ${S.rise(onBeat(S, part('paused', 0, 0.75)))}>"Reset your password" gets you back in now.</p>
  </div>
`, { before: 0.3 });

Film.scene('window', (S) => {
  // A 15-minute axis, 1 400 px wide, with five failures a minute apart, the refused sixth and
  // the first leaving: what SignInLockoutTests asserts at 14 and 15 minutes.
  const x0 = 210;
  const per = 1400 / 20;
  const dot = (minute, when, color, label, below = 620) => `
    <div style="${at(x0 + minute * per - 22, 560, 44)};height:44px;border-radius:50%;background:${color}" ${pop(S, when)}></div>
    <div style="${at(x0 + minute * per - 70, below, 140)};text-align:center;font:600 24px/1.2 var(--font-family-sans);color:var(--palette-stone-700)" ${S.rise(when)}>${label}</div>`;
  const windowBar = S.ref((el, t) => {
    const slide = clamp((t - onBeat(S, part('window', 0, 0.3))) / 1.2);
    const start = lerp(0, 1, ease.inOut(slide));
    el.style.left = `${x0 + start * per}px`;
    el.style.opacity = clamp(enter(t, S.beat(2), 0.4) * 2);
  });
  return `
  <div class="fill field--blush">
  <div style="${at(110, 110, 900)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>A sliding window · ADR 0012</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Fifteen minutes,')}<br>${S.words(S.beat(2.5), '', { accent: 'sliding.' })}</h1>
  </div>
  <div style="${at(x0, 480, 15 * per)};height:200px;border-radius:var(--radius-lg);background:rgb(108 29 54 / 0.12);border:3px solid var(--palette-bordeaux-700);box-sizing:border-box" ${windowBar}>
    <div style="position:absolute;left:20px;top:-52px;font:600 28px/1 var(--font-family-sans);color:var(--palette-bordeaux-700)">the last 15 minutes</div>
  </div>
  <div style="${at(x0, 582, 1400)};height:4px;background:var(--palette-stone-400)"></div>
  ${[1, 2, 3, 4, 5].map((m, i) => dot(m, S.beat(2 + i * 0.5), 'var(--palette-bordeaux-700)', `fail ${m}`)).join('')}
  ${dot(15, onBeat(S, part('window', 0, 0.05)), 'var(--palette-stone-950)', '6th · 429')}
  ${dot(16, onBeat(S, part('window', 0, 0.55)), 'var(--palette-green-800)', 'signs in', 700)}
  <div style="${at(1160, 120, 640)};${terminal};font-size:24px" ${pop(S, onBeat(S, part('window', 0, 0.75)))}>
    <div style="${dim}">5 failures for nobody@…, then again</div>
    <div><span style="${rose}">429</span> "code": <span style="${green}">"too_many_attempts"</span></div>
    <div style="${dim};margin-top:10px">an unknown email pauses too</div>
  </div>
  <p class="lede" style="${at(210, 780, 1400)}" ${S.rise(S.bar(4))}>Stored as a SHA-256 of the email, never the address typed.</p>
  </div>`;
});

Film.scene('suspended', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-004 · AC4 · 403 account_suspended</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Suspended,')}<br>${S.words(S.beat(2.5), '', { accent: 'and told.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(2))}>A wrong password hears nothing new.</p>
  </div>
  ${closeUp('shots/web-sign-in-suspended.png', 110, 640, 760, pop(S, onBeat(S, part('suspended', 0, 0.5)), -1))}
  ${browser('shots/web-sign-in-suspended-xl-light.png', { width: 860, title: 'Sign in · Christian Fitness', url: url('/sign-in'), style: at(960, 220, 860), attrs: arrive(S, S.beat(2), 2, 8) })}
  </div>
`, { before: 0.3 });

// ── Act 2: the way back ─────────────────────────────────────────────────────────────────────────
Film.scene('return', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 110, 760)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-004 · AC6 · memberAuthGuard</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Right back')}<br>${S.words(S.beat(2.5), '', { accent: 'where you were.' })}</h1>
  </div>
  <div style="${at(110, 470, 760)};display:flex;flex-direction:column;align-items:flex-start;gap:22px">
    <span ${pop(S, onBeat(S, part('return', 0, 0.1)))}>${chip(C.returned.asked, 'var(--palette-stone-0)', 'var(--palette-stone-950)', 30)}</span>
    <span ${pop(S, onBeat(S, part('return', 0, 0.35)))}>${chip(decodeURIComponent(C.returned.sentTo), 'var(--palette-borealis-300)', 'var(--palette-stone-950)', 26)}</span>
    <span ${pop(S, onBeat(S, part('return', 0, 0.75)))}>${chip(C.returned.landed, 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)', 30)}</span>
  </div>
  ${browser('shots/web-return-sign-in-xl-light.png', { width: 760, title: 'Sign in · Christian Fitness', url: url(C.returned.sentTo), style: at(960, 110, 760), attrs: arrive(S, onBeat(S, part('return', 0, 0.3)), -1, -6) })}
  ${browser('shots/web-return-home-xl-light.png', { width: 760, title: 'Home · Christian Fitness', url: url(C.returned.landed), style: at(1060, 500, 760), attrs: arrive(S, onBeat(S, part('return', 0, 0.7)), 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('crafted', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 130, 760)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Only a path inside the app</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Never')}<br>${S.words(S.beat(2.5), '', { accent: 'off-site.' })}</h1>
    <div style="margin-top:56px;display:flex;align-items:center;gap:22px;flex-wrap:wrap" ${S.rise(onBeat(S, part('crafted', 0, 0.6)))}>
      ${chip(`returnUrl=${C.crafted.returnUrl}`, 'var(--palette-stone-0)', 'var(--palette-stone-950)', 26)}
      ${arrow()}
      ${chip(C.crafted.landed, 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)', 30)}
    </div>
  </div>
  ${phone('shots/web-crafted-sign-in-xs-light.png', { width: 300, style: at(1080, 150, 300), attrs: arrive(S, S.beat(2), -3, -8) })}
  ${phone('shots/web-crafted-home-xs-light.png', { width: 300, style: at(1460, 230, 300), attrs: arrive(S, onBeat(S, part('crafted', 0, 0.6)), 3, 8) })}
  </div>
`);

Film.scene('join', (S) => `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-034 · AC2 · 429 rate_limited</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Five')}<br>${S.words(S.beat(2.5), '', { accent: 'an hour.' })}</h1>
  </div>
  ${closeUp('shots/web-join-limited.png', 110, 520, 700, pop(S, onBeat(S, part('join', 0, 0.55)), -1))}
  ${phone('shots/web-join-limited-xs-light.png', { width: 300, style: at(900, 180, 300), attrs: arrive(S, S.beat(2), -3, -8) })}
  <div style="${at(1270, 240, 560)};${terminal};font-size:24px" ${pop(S, onBeat(S, part('join', 0, 0.35)))}>
    <div style="${dim}">6th account, one address, one hour</div>
    <div><span style="${rose}">429</span> "code": <span style="${green}">"rate_limited"</span></div>
    <div style="${dim};margin-top:10px">counted per IPv4 address,</div>
    <div style="${dim}">or per IPv6 /64</div>
    <div style="${dim};margin-top:10px">refused joins don't count</div>
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

Film.scene('left', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 130, 1200)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 9.1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Staff')} ${S.words(S.beat(2), '', { accent: 'sign-in.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('/admin/sign-in', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('admin shell', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('members refused', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
  </div>
  </div>
`);

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
wipeInto('return', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
