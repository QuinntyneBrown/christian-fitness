// Video 37 · Slice 20.1: Request a reset link. Eleven scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running member app from shots.ts, through the page
// objects and the shared fixture; the API's answers and the email are drawn from what the API tests
// assert; the counts, the test names and the initial total are what the runners and the build
// printed (shots/captures.js). Every position is a pure function of the scene's time
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
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4310${path}`;

// ── Act 1: asking for a link ────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 20.1 · Request a reset link</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'A way')}<br>${S.words(S.beat(3), '', { accent: 'back in.' })}</h1>
  </div>
  ${browser('shots/web-forgot-xl-light.png', { width: 860, title: 'Forgot password · Christian Fitness', url: url('/forgot-password'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-sent-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('link', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-044 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Forgot your')}<br>${S.words(S.beat(2.5), '', { accent: 'password?' })}</h1>
  </div>
  ${closeUp('shots/web-sign-in-forgot.png', 110, 520, 620, pop(S, onBeat(S, part('link', 0, 0.2)), -1))}
  ${phone('shots/web-sign-in-xs-light.png', { width: 270, style: at(830, 180, 270), attrs: arrive(S, S.beat(2), -3, -8) })}
  ${tablet('shots/web-forgot-m-light.png', { width: 600, style: at(1200, 230, 600), attrs: arrive(S, onBeat(S, part('link', 0, 0.55)), 2, 8) })}
  </div>
`, { before: 0.3 });

Film.scene('send', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-044 · AC4 · AC7</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Check your')}<br>${S.words(S.beat(2.5), '', { accent: 'email.' })}</h1>
  </div>
  ${closeUp('shots/web-forgot-busy.png', 110, 470, 520, pop(S, onBeat(S, part('send', 0, 0.25)), -1))}
  ${browser('shots/web-sent-xl-light.png', { width: 1100, title: 'Forgot password · Christian Fitness', url: url('/forgot-password'), style: at(720, 230, 1100), attrs: arrive(S, onBeat(S, part('send', 0, 0.6)), 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('secret', (S) => {
  const second = onBeat(S, part('secret', 0, 0.35));
  return `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-044 · AC2 · AC3 · ADR 0010</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Never says')}<br>${S.words(S.beat(2.5), '', { accent: 'who.' })}</h1>
  </div>
  <div style="${at(820, 150, 1000)};${terminal}" ${pop(S, S.beat(2))}>
    <div style="${dim}">POST /api/account/password-reset · a member's email</div>
    <div><span style="${green}">202</span> Accepted · no body · one email sent</div>
  </div>
  <div style="${at(820, 420, 1000)};${terminal}" ${pop(S, second)}>
    <div style="${dim}">POST /api/account/password-reset · an unknown email</div>
    <div><span style="${green}">202</span> Accepted · no body · nothing sent</div>
  </div>
  <p class="lede" style="${at(820, 720, 1000)};color:var(--palette-stone-300)" ${S.rise(onBeat(S, part('secret', 0, 0.7)))}>Same status, same headers, same bytes. Mail goes out after the answer.</p>
  </div>`;
}, { before: 0.3 });

Film.scene('email', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-044 · AC2 · AC8</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Thirty')}<br>${S.words(S.beat(2.5), '', { accent: 'minutes.' })}</h1>
  </div>
  <div style="${at(800, 110, 1020)};${light};padding:40px 48px;font:400 30px/1.5 var(--font-family-sans)" ${pop(S, S.beat(2), 1)}>
    <div style="font-weight:600;font-size:34px">Reset your Christian Fitness password</div>
    <div style="${dim};font-size:24px;margin-bottom:22px">to grace.thompson@gmail.com</div>
    <div>Hi Grace,</div>
    <div style="margin-top:14px">Choose a new password with this link:</div>
    <div style="margin-top:14px;font:500 24px/1.4 var(--font-family-mono);color:var(--palette-bordeaux-700)">…/reset-password#token=<span style="background:var(--palette-bordeaux-50)">43 random characters</span></div>
    <div style="margin-top:14px">The link expires in 30 minutes and works once.</div>
  </div>
  <div style="${at(800, 720, 1020)};${terminal};font-size:24px" ${pop(S, onBeat(S, part('email', 0, 0.6)))}>
    <div style="${dim}">PasswordResets · what is stored</div>
    <div>TokenHash <span style="${green}">SHA-256</span> · ExpiresAt = RequestedAt + 30 min</div>
  </div>
  </div>
`, { before: 0.3 });

// ── Act 2: when it goes wrong ───────────────────────────────────────────────────────────────────
Film.scene('invalid', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-044 · AC5 · mock: invalid</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Named')}<br>${S.words(S.beat(2.5), '', { accent: 'first.' })}</h1>
  </div>
  ${closeUp('shots/web-forgot-invalid.png', 820, 120, 620, pop(S, S.beat(2), 1))}
  ${phone('shots/web-forgot-invalid-xs-light.png', { width: 270, style: at(1540, 300, 270), attrs: arrive(S, S.bar(2), 4, 10) })}
  </div>
`);

Film.scene('failed', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-044 · AC7 · mock: error</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Try again,')}<br>${S.words(S.beat(2.5), '', { accent: 'nothing lost.' })}</h1>
  </div>
  ${closeUp('shots/web-forgot-failed.png', 110, 600, 760, pop(S, onBeat(S, part('failed', 0, 0.3)), -1))}
  ${phone('shots/web-forgot-failed-xs-light.png', { width: 300, style: at(1000, 150, 300), attrs: arrive(S, S.beat(2), -3, -8) })}
  ${browser('shots/web-forgot-failed-xl-light.png', { width: 640, title: 'Forgot password · Christian Fitness', url: url('/forgot-password'), style: at(1220, 330, 640), attrs: arrive(S, S.bar(2), 2, 8) })}
  </div>
`, { before: 0.3 });

Film.scene('limit', (S) => `
  <div class="fill field--bordeaux">
  <div style="${at(110, 120, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-044 · AC6 · AttemptWindow</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Three')}<br>${S.words(S.beat(2.5), '', { accent: 'an hour.' })}</h1>
  </div>
  <div style="${at(860, 200, 960)};${terminal};font-size:27px">
    ${['12:45 · link 1 · sent', '12:55 · link 2 · sent', '13:05 · link 3 · sent'].map((row, i) => `
      <div ${S.rise(S.beat(2 + i * 0.5), { y: 20 })}><span style="${green}">202</span> ${esc(row)}</div>`).join('')}
    <div ${S.rise(onBeat(S, part('limit', 0, 0.45)), { y: 20 })}><span style="${green}">202</span> 13:15 · link 4 · <span style="${rose}">not sent</span></div>
    <div style="${dim};margin-top:18px" ${S.rise(onBeat(S, part('limit', 0, 0.7)), { y: 20 })}>13:45 · the hour has passed · sent again</div>
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
  <div style="${at(110, 130, 1400)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 20.2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Choose a')} ${S.words(S.beat(2), '', { accent: 'new password.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('/reset-password#token=…', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('once', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('within 30 min', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('invalid', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
