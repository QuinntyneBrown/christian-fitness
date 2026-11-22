// Video 07 · Slice 3.1: Sign in and sign out. Ten scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running member app from shots.ts, through the page
// objects and the shared fixture; the API's answers are drawn from what the API tests assert; the
// counts, the test names and the Sign out button's size are what the runners and the take printed
// (shots/captures.js). Every position is a pure function of the scene's time (docs/videos/README.md).
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
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4310${path}`;

// ── Act 1: signing in ───────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 3.1 · Sign in and sign out</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Welcome')}<br>${S.words(S.beat(3), '', { accent: 'back.' })}</h1>
  </div>
  ${browser('shots/web-sign-in-xl-light.png', { width: 860, title: 'Sign in · Christian Fitness', url: url('/sign-in'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-home-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('signin', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-004 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Straight')}<br>${S.words(S.beat(2.5), '', { accent: 'to Home.' })}</h1>
  </div>
  ${closeUp('shots/web-sign-in-busy.png', 110, 470, 520, pop(S, onBeat(S, part('signin', 0, 0.6)), -1))}
  ${tablet('shots/web-sign-in-m-light.png', { width: 420, style: at(700, 200, 420), attrs: arrive(S, 0.2, -2, -6) })}
  ${browser('shots/web-home-xl-light.png', { width: 760, title: 'Home · Christian Fitness', url: url('/home'), style: at(1080, 300, 760), attrs: arrive(S, onBeat(S, part('signin', 0, 0.3)), 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('wrong', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-004 · AC2 · 401 invalid_credentials</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Never says')}<br>${S.words(S.beat(2.5), '', { accent: 'which.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('wrong', 0, 0.75)))}>No field is marked: that would say the email is ours.</p>
  </div>
  ${closeUp('shots/web-sign-in-invalid.png', 880, 120, 620, pop(S, S.beat(2), 1))}
  ${phone('shots/web-sign-in-invalid-xs-light.png', { width: 270, style: at(1560, 300, 270), attrs: arrive(S, S.bar(2), 4, 10) })}
  </div>
`);

Film.scene('failed', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-032 · AC1 · mock: failed</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Try again,')}<br>${S.words(S.beat(2.5), '', { accent: 'nothing lost.' })}</h1>
  </div>
  ${closeUp('shots/web-sign-in-failed.png', 110, 600, 760, pop(S, onBeat(S, part('failed', 0, 0.3)), -1))}
  ${phone('shots/web-sign-in-failed-xs-light.png', { width: 300, style: at(1000, 150, 300), attrs: arrive(S, S.beat(2), -3, -8) })}
  ${browser('shots/web-sign-in-failed-xl-light.png', { width: 640, title: 'Sign in · Christian Fitness', url: url('/sign-in'), style: at(1220, 330, 640), attrs: arrive(S, S.bar(2), 2, 8) })}
  </div>
`, { before: 0.3 });

// ── Act 2: signing out, and the guard ───────────────────────────────────────────────────────────
Film.scene('signout', (S) => {
  const server = onBeat(S, part('signout', 0, 0.7));
  return `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-004 · AC5 · L2-008 · AC4</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Sign out,')}<br>${S.words(S.beat(2.5), '', { accent: 'for real.' })}</h1>
    <div style="margin-top:44px" ${S.rise(S.beat(4))}>${chip(`Sign out · ${Math.round(C.signOutBox.XS.width)} × ${C.signOutBox.XS.height} px`, 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</div>
  </div>
  ${closeUp('shots/web-header.png', 1060, 130, 760, pop(S, S.beat(2)))}
  ${phone('shots/web-home-xs-light.png', { width: 250, style: at(780, 300, 250), attrs: arrive(S, S.bar(2), -3, -8) })}
  <div style="${at(1110, 420, 710)};${terminal};font-size:25px" ${pop(S, server)}>
    <div style="${dim}">DELETE /api/session · X-XSRF-TOKEN</div>
    <div><span style="${green}">204</span> · the server's session row is deleted</div>
    <div style="${dim};margin-top:14px">the old cookie, sent again</div>
    <div><span style="${rose}">401</span> · other devices stay signed in</div>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('guard', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 130, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>memberAuthGuard · ADR 0009</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Members')}<br>${S.words(S.beat(2.5), '', { accent: 'only.' })}</h1>
    <div style="margin-top:48px;display:flex;align-items:center;gap:22px" ${S.rise(onBeat(S, part('guard', 0, 0.5)))}>
      ${chip(C.guard.asked, 'var(--palette-stone-0)', 'var(--palette-stone-950)')}
      <span style="font:600 44px/1 var(--font-family-sans);color:var(--palette-bordeaux-700)">→</span>
      ${chip(C.guard.landed, 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}
    </div>
  </div>
  ${browser('shots/web-guard-xl-light.png', { width: 960, title: 'Sign in · Christian Fitness', url: url('/sign-in'), style: at(880, 190, 960), attrs: arrive(S, 0.2, 1, 6) })}
  </div>
`);

Film.scene('protect', (S) => {
  const headers = onBeat(S, part('protect', 0, 0.6));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-030 · AC3 · AC4</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Only you')}<br>${S.words(S.beat(2.5), '', { accent: 'act.' })}</h1>
  </div>
  <div style="${at(800, 110, 1020)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">POST /api/session · from another site, no X-XSRF-TOKEN</div>
    <div><span style="${rose}">400</span> application/problem+json</div>
    <div>"code": <span style="${green}">"antiforgery_failed"</span></div>
  </div>
  <div style="${at(800, 470, 1020)};${terminal};font-size:24px" ${pop(S, headers)}>
    <div style="${dim}">every API response, refusals included</div>
    <div>Content-Security-Policy: <span style="${green}">default-src 'none'</span>; …</div>
    <div>X-Content-Type-Options: <span style="${green}">nosniff</span></div>
    <div>Referrer-Policy: <span style="${green}">strict-origin-when-cross-origin</span></div>
    <div>Strict-Transport-Security: <span style="${green}">max-age=31536000</span></div>
  </div>
  </div>`;
}, { before: 0.3 });

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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 3.2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Sign-in')} ${S.words(S.beat(2), '', { accent: 'protections.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('too_many_attempts', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('account_suspended', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('?returnUrl=', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('signout', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
