// Video 09 · Slice 9.1: Staff sign-in and admin shell. Ten scenes on a 120 BPM grid (one bar is
// two seconds). The pictures are screenshots of the running admin app from shots.ts, through the
// page objects and the shared fixture; the API's answers are drawn from what the API tests assert;
// the counts, the test names, the navigation and the Sign out button's size are what the runners
// and the take printed (shots/captures.js). Every position is a pure function of the scene's time
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
const closeUp = (src, x, y, w, attrs, bg = light) =>
  `<div style="${at(x, y, w)};${bg};padding:28px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4311${path}`;

// ── Act 1: signing in ───────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 9.1 · Staff sign-in and admin shell</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Staff')}<br>${S.words(S.beat(3), '', { accent: 'only.' })}</h1>
  </div>
  ${browser('shots/admin-sign-in-xl-light.png', { width: 860, title: 'Staff sign in · Christian Fitness Admin', url: url('/sign-in'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/admin-sign-in-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('signin', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-018 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Straight')}<br>${S.words(S.beat(2.5), '', { accent: 'in.' })}</h1>
  </div>
  ${closeUp('shots/admin-sign-in-busy.png', 110, 470, 400, pop(S, onBeat(S, part('signin', 0, 0.3)), -1))}
  ${tablet('shots/admin-sign-in-m-light.png', { width: 380, style: at(600, 220, 380), attrs: arrive(S, 0.2, -2, -6) })}
  ${browser('shots/admin-dashboard-xl-light.png', { width: 800, title: 'Dashboard · Christian Fitness Admin', url: url('/'), style: at(1040, 300, 800), attrs: arrive(S, onBeat(S, part('signin', 0, 0.55)), 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('refuse', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-018 · AC2 · AC3 · 403 not_staff</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Members')}<br>${S.words(S.beat(2.5), '', { accent: 'turned away.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('refuse', 0, 0.6)))}>Wrong credentials mark no field.</p>
  </div>
  ${closeUp('shots/admin-sign-in-not-staff.png', 110, 640, 640, pop(S, S.beat(3), -1))}
  ${closeUp('shots/admin-sign-in-invalid.png', 900, 130, 480, pop(S, onBeat(S, part('refuse', 0, 0.55)), 1))}
  ${phone('shots/admin-sign-in-not-staff-xs-light.png', { width: 280, style: at(1520, 280, 280), attrs: arrive(S, S.beat(2), 4, 10) })}
  </div>
`);

// ── Act 2: the shell ────────────────────────────────────────────────────────────────────────────
Film.scene('shell', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-021 · AC1 · aria-current</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Four areas,')}<br>${S.words(S.beat(2.5), '', { accent: 'one click.' })}</h1>
    <div style="margin-top:48px;display:flex;align-items:center;gap:22px" ${S.rise(onBeat(S, part('shell', 0, 0.55)))}>
      ${chip(C.navigate.from, 'var(--palette-stone-0)', 'var(--palette-stone-950)')}
      <span style="font:600 44px/1 var(--font-family-sans);color:var(--palette-borealis-300)">→</span>
      ${chip(C.navigate.to, 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}
    </div>
    <p class="lede" style="margin-top:30px;color:var(--palette-stone-300)" ${S.rise(onBeat(S, part('shell', 0, 0.7)))}>${C.navigate.reloaded ? 'Page reloaded' : 'No page reload'}</p>
  </div>
  ${browser('shots/admin-events-xl-light.png', { width: 900, title: 'Events · Christian Fitness Admin', url: url('/events'), style: at(900, 200, 900), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/admin-nav.png', 110, 660, 320, pop(S, S.bar(2), -2), `${card};background:var(--palette-stone-950)`)}
  </div>
`, { before: 0.3 });

Film.scene('band', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-021 · AC2 · below 1024 px</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'A band,')}<br>${S.words(S.beat(2.5), '', { accent: 'not a maze.' })}</h1>
    <div style="margin-top:44px" ${S.rise(onBeat(S, part('band', 0, 0.7)))}>${chip(`Sign out · ${Math.round(C.signOutBox.XS.width)} × ${Math.round(C.signOutBox.XS.height)} px`, 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</div>
  </div>
  ${closeUp('shots/admin-band.png', 110, 640, 600, pop(S, S.beat(3), -1), `${card};background:var(--palette-stone-950)`)}
  ${phone('shots/admin-services-xs-light.png', { width: 290, style: at(860, 200, 290), attrs: arrive(S, 0.2, -3, -8) })}
  ${tablet('shots/admin-services-m-light.png', { width: 520, style: at(1270, 160, 520), attrs: arrive(S, S.bar(1), 2, 8) })}
  </div>
`, { before: 0.3 });

Film.scene('guard', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 130, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>staffAuthGuard · 5xx</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'No session,')}<br>${S.words(S.beat(2.5), '', { accent: 'no entry.' })}</h1>
    <div style="margin-top:48px;display:flex;align-items:center;gap:22px" ${S.rise(S.beat(3))}>
      ${chip(C.guard.asked, 'var(--palette-stone-0)', 'var(--palette-stone-950)')}
      <span style="font:600 44px/1 var(--font-family-sans);color:var(--palette-bordeaux-700)">→</span>
      ${chip(C.guard.landed, 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}
    </div>
  </div>
  ${browser('shots/admin-server-error-xl-light.png', { width: 960, title: 'Something went wrong · Christian Fitness Admin', url: url('/events'), style: at(880, 190, 960), attrs: arrive(S, onBeat(S, part('guard', 0, 0.55)), 1, 6) })}
  </div>
`);

Film.scene('api', (S) => {
  const cookie = onBeat(S, part('api', 0, 0.5));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-018 · AC4 · ADR 0011</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Every endpoint')}<br>${S.words(S.beat(2.5), '', { accent: 'guarded.' })}</h1>
  </div>
  <div style="${at(800, 110, 1020)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">GET /api/admin/… · no session, or a member's</div>
    <div><span style="${rose}">401</span> application/problem+json · no data</div>
    <div style="${dim};margin-top:14px">POST /api/admin/session · a member, right password</div>
    <div><span style="${rose}">403</span> "code": <span style="${green}">"not_staff"</span> · no cookie</div>
  </div>
  <div style="${at(800, 500, 1020)};${terminal};font-size:24px" ${pop(S, cookie)}>
    <div style="${dim}">staff signed in</div>
    <div>Set-Cookie: <span style="${green}">__Host-cf-admin</span>=…</div>
    <div>Secure; HttpOnly; SameSite=<span style="${green}">Strict</span></div>
    <div>no Expires · ends with the browser</div>
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
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>Admin first load ${C.build.raw} kB of 275.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slices 9.2 and 3.2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Two steps,')} ${S.words(S.beat(2), '', { accent: 'then lockout.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('two-step verification', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('too_many_attempts', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('30-minute idle expiry', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('shell', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
