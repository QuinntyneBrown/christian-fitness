// Video 10 · Slice 9.2: Two-step verification. Nine scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running admin app from shots.ts, through the page
// objects and the shared fixture; the API's answers and `cf two-step` are drawn from what the API
// tests and the CLI's source say; the counts, the test names and the initial total are what the
// runners and the build printed (shots/captures.js). Every position is a pure function of the
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
const closeUp = (src, x, y, w, attrs, bg = light) =>
  `<div style="${at(x, y, w)};${bg};padding:28px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4311${path}`;

// ── Act 1: the second step ──────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 9.2 · Two-step verification</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Two')}<br>${S.words(S.beat(3), '', { accent: 'steps.' })}</h1>
  </div>
  ${browser('shots/admin-two-step-xl-light.png', { width: 860, title: 'Enter your code · Christian Fitness Admin', url: url('/sign-in/verify'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/admin-two-step-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('code', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-046 · AC1 · AC2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Six digits,')}<br>${S.words(S.beat(2.5), '', { accent: 'then in.' })}</h1>
  </div>
  ${closeUp('shots/admin-two-step-busy.png', 110, 450, 400, pop(S, onBeat(S, part('code', 0, 0.45)), -1))}
  ${tablet('shots/admin-two-step-m-light.png', { width: 380, style: at(600, 220, 380), attrs: arrive(S, 0.2, -2, -6) })}
  ${browser('shots/admin-dashboard-xl-light.png', { width: 800, title: 'Dashboard · Christian Fitness Admin', url: url(C.verify.landed), style: at(1040, 300, 800), attrs: arrive(S, onBeat(S, part('code', 0, 0.75)), 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('wrong', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-046 · AC3 · 401 invalid_code</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Not that')}<br>${S.words(S.beat(2.5), '', { accent: 'code.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('wrong', 0, 0.5)))}>The code stays. The field takes focus.</p>
  </div>
  ${closeUp('shots/admin-two-step-invalid.png', 820, 110, 520, pop(S, S.beat(3), 1))}
  ${phone('shots/admin-two-step-invalid-xs-light.png', { width: 280, style: at(1500, 280, 280), attrs: arrive(S, S.beat(2), 4, 10) })}
  </div>
`);

Film.scene('endings', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-046 · AC4 · AC5 · AttemptWindow</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Five tries,')}<br>${S.words(S.beat(2.5), '', { accent: 'five minutes.' })}</h1>
  </div>
  ${closeUp('shots/admin-sign-in-locked.png', 110, 520, 640, pop(S, S.beat(3), -1))}
  ${closeUp('shots/admin-sign-in-expired.png', 110, 790, 640, pop(S, onBeat(S, part('endings', 0, 0.6)), 1))}
  ${browser('shots/admin-sign-in-locked-xl-light.png', { width: 900, title: 'Staff sign in · Christian Fitness Admin', url: url('/sign-in'), style: at(900, 200, 900), attrs: arrive(S, 0.2, 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('setup', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-046 · AC6 · 403 two_step_not_set_up</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Ask an')}<br>${S.words(S.beat(2.5), '', { accent: 'Admin.' })}</h1>
  </div>
  ${closeUp('shots/admin-sign-in-not-set-up.png', 110, 410, 380, pop(S, S.beat(2.5), -1))}
  <div style="${at(800, 300, 1020)};${terminal};font-size:26px" ${pop(S, onBeat(S, part('setup', 0, 0.55)))}>
    <div><span style="${green}">$</span> cf two-step lee.chen@christianfitness.ca</div>
    <div style="${dim};margin-top:14px">Two-step verification set up. Add this link to the</div>
    <div style="${dim}">staff member's authenticator app; it is not shown again:</div>
    <div style="margin-top:14px">otpauth://totp/Christian%20Fitness:…</div>
    <div>?secret=<span style="${rose}">••••••••</span>&amp;digits=6&amp;period=30</div>
  </div>
  </div>
`);

Film.scene('api', (S) => {
  const later = onBeat(S, part('api', 0, 0.5));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-046 · AC2 · AC8 · ADR 0013</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Pending,')}<br>${S.words(S.beat(2.5), '', { accent: 'not signed in.' })}</h1>
  </div>
  <div style="${at(800, 110, 1020)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">POST /api/admin/session · the right password</div>
    <div><span style="${green}">202</span> no body · no session cookie</div>
    <div>Set-Cookie: <span style="${green}">__Host-cf-admin-step</span>=… · 5 min</div>
  </div>
  <div style="${at(800, 470, 1020)};${terminal};font-size:24px" ${pop(S, later)}>
    <div style="${dim}">POST /api/admin/session/two-step</div>
    <div><span style="${rose}">401</span> <span style="${green}">"invalid_code"</span> · wrong, or already used</div>
    <div><span style="${rose}">429</span> <span style="${green}">"too_many_attempts"</span> · 5 in 15 min</div>
    <div><span style="${rose}">401</span> <span style="${green}">"two_step_expired"</span> · after 5 min</div>
    <div style="${dim};margin-top:14px">no code, secret or cookie in any log or span</div>
  </div>
  </div>`;
}, { before: 0.3 });

// ── Act 2: what it proves ───────────────────────────────────────────────────────────────────────
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
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>Admin first load ${C.build.raw} kB of 275.<br>Code screen ${C.build.codeScreen} kB, loaded when needed.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 9.3</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Idle')} ${S.words(S.beat(2), '', { accent: 'expiry.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('30-minute idle expiry', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('the forbidden screen', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
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
wipeInto('api', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
