// Video 05 · Slice 2.1: Join with valid details. Eleven scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running member app from shots.ts, through the
// page objects and the shared fixture; the request, the cookie and the budget are drawn from what
// the API tests and the build said; the counts are what the runners printed (shots/captures.js).
// Every position is a pure function of the scene's time (docs/videos/README.md).
const { enter, ease, lerp, clamp, prog, phone, browser, esc } = Film;
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

// ── Act 1: the Join screen ──────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 860)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 2.1 · Join with valid details</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Join.')}<br>${S.words(S.beat(3), '', { accent: 'Signed in.' })}</h1>
  </div>
  ${browser('shots/web-join-xl-light.png', { width: 860, title: 'Join · Christian Fitness', url: 'localhost:4310/join', style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-home-xs-light.png', { width: 250, style: at(880, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('join', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-003 · /join</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Create your')}<br>${S.words(S.beat(2.5), '', { accent: 'profile.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('join', 0, 0.6)))}>Name, email, password, an optional church and eight interests.</p>
  </div>
  ${browser('shots/web-join-xl-light.png', { width: 1080, title: 'Join · Christian Fitness', url: 'localhost:4310/join', style: at(760, 150, 1080), attrs: arrive(S, 0.2, -1, 6) })}
  ${phone('shots/web-join-xs-light.png', { width: 260, style: at(560, 560, 260), attrs: arrive(S, S.bar(2), -4, -10) })}
  </div>
`, { before: 0.3 });

Film.scene('optional', (S) => {
  const sent = onBeat(S, part('optional', 0, 0.55));
  return `
  <div class="fill field--blush">
  <div style="${at(110, 120, 760)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-003 · AC4 · L2-033 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Faith details,')}<br>${S.words(S.beat(2.5), '', { accent: 'optional.' })}</h1>
  </div>
  ${closeUp('shots/web-join-church.png', 110, 520, 760, pop(S, S.beat(3), -1))}
  <div style="${at(1000, 300, 820)};${terminal}" ${pop(S, sent, 0.5)}>
    <div style="${dim}">POST /api/account/join</div>
    <div>"fullName": "${esc(C.sent.fullName)}",</div>
    <div>"homeChurch": <span style="${green}">${C.sent.homeChurch === null ? 'null' : esc(C.sent.homeChurch)}</span>,</div>
    <div>"interests": [${C.sent.interests.map((i) => `"${esc(i)}"`).join(', ')}]</div>
  </div>
  <p class="lede" style="${at(1000, 700, 820)}" ${S.rise(sent + S.BEAT)}>Blank is sent as none, and stored as none.</p>
  </div>`;
});

Film.scene('submitting', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-003 · AC5</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Busy,')}<br>${S.words(S.beat(2.5), '', { accent: 'not stuck.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('submitting', 0, 0.6)))}>Disabled and aria-busy; the fields hold still.</p>
  </div>
  ${browser('shots/web-join-submitting-xl-light.png', { width: 1000, title: 'Join · Christian Fitness', url: 'localhost:4310/join', style: at(820, 110, 1000), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/web-join-busy.png', 640, 760, 760, pop(S, S.bar(2), -1))}
  </div>
`);

Film.scene('home', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-003 · AC1 · /home</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Welcome,')}<br>${S.words(S.beat(2.5), '', { accent: 'Grace.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('home', 0, 0.6)))}>A stand-in until the real Home, slice 13.1 (ADR 0007).</p>
  </div>
  ${browser('shots/web-home-xl-dark.png', { width: 900, theme: 'dark', title: 'Home · Christian Fitness', url: 'localhost:4310/home', style: at(900, 160, 900), attrs: arrive(S, 0.2, -1, 6) })}
  ${phone('shots/web-home-xs-light.png', { width: 260, style: at(720, 520, 260), attrs: arrive(S, S.bar(1.5), -4, -10) })}
  </div>
`, { before: 0.3 });

// ── Act 2: the API ──────────────────────────────────────────────────────────────────────────────
Film.scene('api', (S) => {
  const hash = onBeat(S, part('api', 0, 0.4));
  const cookie = onBeat(S, part('api', 0, 0.7));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-030 · AC1 · AC2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One request,')}<br>${S.words(S.beat(2.5), '', { accent: 'signed in.' })}</h1>
  </div>
  <div style="${at(820, 130, 1000)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">POST /api/account/join  [AllowAnonymous]</div>
    <div>201 Created · { "memberId", "name" }</div>
    <div style="margin-top:22px" ${S.rise(hash)}><span style="${dim}">PasswordHash</span> AQAAAAIAAYag… <span style="${green}">PBKDF2</span></div>
    <div style="margin-top:22px" ${S.rise(cookie)}><span style="${dim}">Set-Cookie</span> __Host-cf-session=…;</div>
    <div ${S.rise(cookie)}>&nbsp;&nbsp;<span style="${green}">secure; httponly; samesite=lax; path=/</span></div>
  </div>
  <p class="lede" style="${at(820, 640, 1000)};color:var(--palette-stone-0)" ${S.rise(cookie + S.BEAT)}>Then GET /api/session answers who is signed in. No name, email or church in any span or log.</p>
  </div>`;
}, { before: 0.3 });

Film.scene('servererror', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-043 · AC4 · ADR 0006</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Interceptor,')}<br>${S.words(S.beat(2.5), '', { accent: 'switched on.' })}</h1>
    <div style="margin-top:44px;display:flex;flex-direction:column;align-items:flex-start;gap:20px;transform-origin:left;scale:0.85">
      <div ${S.rise(onBeat(S, part('servererror', 0, 0.45)))}>${chip('GET /api/session  500', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</div>
      <div ${S.rise(onBeat(S, part('servererror', 0, 0.75)))}>${chip('address stays /home', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</div>
    </div>
  </div>
  ${browser('shots/web-home-server-error-xl-light.png', { width: 1040, title: 'Something went wrong · Christian Fitness', url: 'localhost:4310/home', style: at(780, 170, 1040), attrs: arrive(S, 0.2, -1, 6) })}
  </div>
`);

// ── Act 3: what it costs and proves ─────────────────────────────────────────────────────────────
Film.scene('budget', (S) => {
  const grow = onBeat(S, part('budget', 0, 0.3));
  const fill = (t) => ease.out(prog(t, grow, 1.4));
  const width = 1500;
  const x = (kb) => (kb / 290) * width;
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 90, 900)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-035 · ADR 0007</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Paid')} ${S.words(S.beat(2.5), '', { accent: 'once.' })}</h1>
  </div>
  <p class="figure" style="${at(1060, 70, 800)};text-align:right" ${S.rise(grow)}>${Math.round(C.build.raw)}<span style="font-size:120px"> kB</span></p>
  <div style="${at(210, 520, width)};height:110px;border-radius:var(--radius-full);background:var(--palette-stone-150);overflow:hidden">
    <div style="height:100%;background:var(--palette-bordeaux-700);border-radius:var(--radius-full)" ${S.ref((el, t) => { el.style.width = `${x(C.build.raw) * fill(t)}px`; })}></div>
  </div>
  ${[[260, 'warning 260 kB'], [275, 'error 275 kB']].map(([kb, label], i) => `
    <div style="position:absolute;left:${210 + x(kb)}px;top:480px;width:6px;height:190px;background:var(--palette-stone-950)" ${S.rise(grow + S.BEAT * (2 + i))}></div>
    <p class="kicker" style="position:absolute;left:${210 + x(kb) - 150}px;top:${i ? 700 : 420}px;width:300px;text-align:center" ${S.rise(grow + S.BEAT * (2 + i))}>${label}</p>`).join('')}
  <p class="lede" style="${at(210, 800, 1500)}" ${S.rise(grow + S.BAR)}>HttpClient 21 kB, the first @for 5 kB, ngTemplateOutlet 3 kB: each paid once for every later screen.</p>
  </div>`;
}, { before: 0.3 });

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
  <div class="fill field--blush">
  <div style="${at(110, 130, 900)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 2.2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Join')} ${S.words(S.beat(2), '', { accent: 'refusals.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('field_too_long', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('email_taken  409', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(4))}>${chip('aria-invalid="true"', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('api', 'var(--palette-borealis-300)');
wipeInto('budget', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
