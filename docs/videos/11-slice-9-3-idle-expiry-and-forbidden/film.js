// Video 11 · Slice 9.3: Idle expiry and forbidden. Ten scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running admin app from shots.ts, through the page
// objects and the shared fixture; the API's answers are drawn from what the API tests assert; the
// counts, the test names and the initial total are what the runners and the build printed
// (shots/captures.js). Every position is a pure function of the scene's time
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

// ── Act 1: idle expiry ──────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 9.3 · Idle expiry and forbidden</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Half an hour,')}<br>${S.words(S.beat(3), '', { accent: 'then out.' })}</h1>
  </div>
  ${browser('shots/admin-sign-in-expired-xl-light.png', { width: 860, title: 'Staff sign in · Christian Fitness Admin', url: url(C.expired.landed), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/admin-sign-in-expired-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('idle', (S) => {
  const later = onBeat(S, part('idle', 0, 0.55));
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-018 · AC5 · ADR 0014</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Thirty quiet')}<br>${S.words(S.beat(2.5), '', { accent: 'minutes.' })}</h1>
  </div>
  ${browser('shots/admin-dashboard-xl-light.png', { width: 640, title: 'Dashboard · Christian Fitness Admin', url: url('/'), style: at(110, 480, 640), attrs: arrive(S, 0.2, -1, -6) })}
  <div style="${at(860, 170, 960)};${terminal};font-size:27px" ${pop(S, S.beat(2))}>
    <div style="${dim}">GET /api/admin/session · after 29 idle minutes</div>
    <div><span style="${green}">200</span> · the session runs 30 more minutes</div>
  </div>
  <div style="${at(860, 470, 960)};${terminal};font-size:27px" ${pop(S, later)}>
    <div style="${dim}">GET /api/admin/session · after 30 idle minutes</div>
    <div><span style="${rose}">401</span> <span style="${green}">"session_expired"</span></div>
    <div>Set-Cookie: __Host-cf-admin=; expires 1970</div>
    <div style="${dim};margin-top:14px">the session row is deleted on the server</div>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('notice', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-018 · AC5 · Staff sign in</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Your session')}<br>${S.words(S.beat(2.5), '', { accent: 'expired.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('notice', 0, 0.6)))}>A first visit or a reload says nothing.</p>
  </div>
  ${closeUp('shots/admin-sign-in-expired.png', 110, 640, 640, pop(S, S.beat(3), -1))}
  ${tablet('shots/admin-sign-in-expired-m-light.png', { width: 420, style: at(860, 160, 420), attrs: arrive(S, 0.2, -2, -6) })}
  ${browser('shots/admin-sign-in-expired-xl-dark.png', { width: 600, title: 'Staff sign in', url: url('/sign-in'), style: at(1230, 380, 600), attrs: arrive(S, S.beat(2), 2, 8) })}
  </div>
`);

// ── Act 2: forbidden ────────────────────────────────────────────────────────────────────────────
Film.scene('forbidden', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 660)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-047 · AC1 · 403 to a read</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Staff')}<br>${S.words(S.beat(2.5), '', { accent: 'only.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('forbidden', 0, 0.6)))}>The address bar keeps ${esc(C.forbidden.location)}.</p>
  </div>
  ${browser('shots/admin-forbidden-xl-light.png', { width: 900, title: C.forbidden.title, url: url(C.forbidden.location), style: at(880, 160, 900), attrs: arrive(S, 0.2, 1, 6) })}
  ${phone('shots/admin-forbidden-xs-light.png', { width: 240, style: at(560, 560, 240), attrs: arrive(S, S.beat(3), -4, -10) })}
  </div>
`, { before: 0.3 });

Film.scene('signout', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 660)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-047 · AC2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Signing')}<br>${S.words(S.beat(2.5), '', { accent: 'out.' })}</h1>
  </div>
  ${closeUp('shots/admin-forbidden-busy.png', 110, 450, 560, pop(S, onBeat(S, part('signout', 0, 0.4)), -1))}
  ${tablet('shots/admin-forbidden-m-light.png', { width: 380, style: at(780, 200, 380), attrs: arrive(S, 0.2, -2, -6) })}
  ${browser('shots/admin-forbidden-xl-dark.png', { width: 620, title: C.forbidden.title, url: url(C.forbidden.location), style: at(1220, 360, 620), attrs: arrive(S, S.beat(2), 2, 8) })}
  </div>
`);

Film.scene('paused', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-018 · AC3 · L2-004 · AC3</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Paused in')}<br>${S.words(S.beat(2.5), '', { accent: 'both apps.' })}</h1>
  </div>
  ${closeUp('shots/admin-sign-in-paused.png', 110, 560, 660, pop(S, S.beat(3), -1))}
  ${browser('shots/admin-sign-in-paused-xl-light.png', { width: 760, title: 'Staff sign in · Christian Fitness Admin', url: url('/sign-in'), style: at(880, 220, 760), attrs: arrive(S, 0.2, 1, 6) })}
  ${phone('shots/admin-sign-in-paused-xs-light.png', { width: 230, style: at(1640, 420, 230), attrs: arrive(S, S.beat(2), 4, 10) })}
  </div>
`, { before: 0.3 });

Film.scene('api', (S) => {
  const later = onBeat(S, part('api', 0, 0.5));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>ADR 0014 · the API tests</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Every request')}<br>${S.words(S.beat(2.5), '', { accent: 'counts.' })}</h1>
  </div>
  <div style="${at(800, 110, 1020)};${terminal};font-size:24px" ${pop(S, S.beat(2))}>
    <div style="${dim}">Staff cookie · ExpireTimeSpan 30 min</div>
    <div>OnCheckSlidingExpiration → <span style="${green}">renew every request</span></div>
    <div style="${dim};margin-top:12px">request at 10 min, again 25 min later</div>
    <div><span style="${green}">200</span> · the default rule would have said 401</div>
  </div>
  <div style="${at(800, 500, 1020)};${terminal};font-size:24px" ${pop(S, later)}>
    <div style="${dim}">POST /api/admin/session · 5 failures in 15 min</div>
    <div><span style="${rose}">429</span> <span style="${green}">"too_many_attempts"</span> · right password or not</div>
    <div style="${dim};margin-top:12px">one SignInFailures count for both apps</div>
    <div style="${dim}">a refused attempt is never recorded</div>
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
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>Admin first load ${C.build.raw} kB of 275.<br>Staff only ${C.build.forbidden} kB, loaded when needed.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 29.1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Staff')} ${S.words(S.beat(2), '', { accent: 'roles.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('Admin: everything', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('Moderator: members only', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
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
wipeInto('forbidden', 'var(--palette-bordeaux-700)');
wipeInto('proof', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
