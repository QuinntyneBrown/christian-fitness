// Video 04 · Slice 30.1: Not found and server error. Eleven scenes on a 120 BPM grid (one bar is
// two seconds). The pictures are screenshots of the running apps from shots.ts, through the page
// objects and the shared fixture; the reference, the guard and the budget are drawn; the test
// counts are what the runners printed (shots/captures.js). Every position is a pure function of
// the scene's time (docs/videos/README.md).
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
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 40px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;

// ── Act 1: not found ────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 30.1 · Not found and server error</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Lost?')}<br>${S.words(S.beat(3), '', { accent: 'A way back.' })}</h1>
  </div>
  ${browser('shots/web-not-found-xl-light.png', { width: 820, title: 'Page not found · Christian Fitness', url: 'localhost:4310/events/old-spring-run', style: at(1000, 170, 820), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${browser('shots/admin-server-error-xl-dark.png', { width: 640, theme: 'dark', title: 'Something went wrong · Christian Fitness Admin', url: 'localhost:4311/members', style: at(1180, 600, 640), attrs: arrive(S, S.beat(4), -2, -8) })}
  </div>
`);

Film.scene('notfound', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-043 · AC1 · member app</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Page')}<br>${S.words(S.beat(2.5), '', { accent: 'not found.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('notfound', 0, 0.55)))}>The address stays. Focus lands on the heading.</p>
  </div>
  ${browser('shots/web-not-found-xl-light.png', { width: 1060, title: 'Page not found · Christian Fitness', url: 'localhost:4310/events/old-spring-run', style: at(760, 150, 1060), attrs: arrive(S, 0.2, -1, 6) })}
  ${phone('shots/web-not-found-xs-light.png', { width: 260, style: at(620, 560, 260), attrs: arrive(S, S.bar(2), -4, -10) })}
  </div>
`, { before: 0.3 });

Film.scene('waysback', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 130, 760)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-043 · AC2</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'Two')}<br>${S.words(S.beat(2.5), '', { accent: 'ways back.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1.5))}>Links of 44 × 44 px to the touch, in order for the keyboard.</p>
  </div>
  ${closeUp('shots/web-not-found-actions.png', 980, 300, 820, pop(S, S.beat(2), -1))}
  <div style="${at(980, 640, 820)};display:flex;gap:24px" ${S.rise(onBeat(S, part('waysback', 0, 0.5)))}>
    ${chip('href="/"', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}${chip('href="/events"', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}
  </div>
  </div>
`);

Film.scene('admin', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Admin console</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Staff too,')}<br>${S.words(S.beat(2.5), '', { accent: 'same words.' })}</h1>
  </div>
  ${browser('shots/admin-not-found-xl-dark.png', { width: 1020, theme: 'dark', title: 'Page not found · Christian Fitness Admin', url: 'localhost:4311/members/no-such-member', style: at(780, 160, 1020), attrs: arrive(S, 0.2, 1, 6) })}
  ${phone('shots/admin-not-found-xs-light.png', { width: 260, style: at(560, 560, 260), attrs: arrive(S, S.bar(1.5), -4, -10) })}
  </div>
`);

// ── Act 2: server error ─────────────────────────────────────────────────────────────────────────
Film.scene('servererror', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-043 · AC4 · AC6</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Our fault,')}<br>${S.words(S.beat(2.5), '', { accent: 'try again.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('servererror', 0, 0.7)))}>Try again loads the address that failed.</p>
  </div>
  ${browser('shots/web-server-error-xl-light.png', { width: 1060, title: 'Something went wrong · Christian Fitness', url: 'localhost:4310/events/42', style: at(760, 150, 1060), attrs: arrive(S, 0.2, -1, 6) })}
  ${phone('shots/web-server-error-xs-light.png', { width: 260, style: at(600, 560, 260), attrs: arrive(S, S.bar(2), -4, -10) })}
  </div>
`, { before: 0.3 });

Film.scene('reference', (S) => {
  const trace = onBeat(S, part('reference', 0, 0.35));
  const ref = onBeat(S, part('reference', 0, 0.6));
  return `
  <div class="fill field--borealis">
  <div style="${at(110, 100, 900)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-043 · AC3 · ProblemDetails</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Quote it.')}<br>${S.words(S.beat(2.5), '', { accent: 'Find it.' })}</h1>
  </div>
  ${closeUp('shots/web-server-error-reference.png', 110, 560, 900, pop(S, S.beat(3), -0.5))}
  <div style="${at(1080, 160, 740)};${terminal};font-size:26px" ${pop(S, trace, 0.5)}>
    <div style="color:var(--palette-stone-400)">traceparent</div>
    <div>00-<span style="color:var(--palette-bordeaux-300)">4bf92f35</span>77b34da6a3ce929d0e0e4736-…</div>
    <div style="margin-top:26px;color:var(--palette-stone-400)">500 application/problem+json</div>
    <div>"code": "server_error",</div>
    <div ${S.rise(ref)}>"reference": "<span style="color:var(--palette-green-300)">CF-4BF92F35</span>"</div>
  </div>
  <p class="lede" style="${at(1080, 640, 740)}" ${S.rise(ref + S.BEAT)}>CF- and the first eight digits of the trace id. A 404 carries none.</p>
  </div>`;
}, { before: 0.3 });

Film.scene('guard', (S) => {
  const cue = onBeat(S, part('guard', 0, 0.55));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>domain · referenceOf · returnPathOf</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'No words')}<br>${S.words(S.beat(2.5), '', { accent: 'but ours.' })}</h1>
  </div>
  <div style="${at(110, 560, 720)};display:flex;flex-direction:column;align-items:flex-start;gap:22px;transform-origin:left;scale:0.8">
    <div ${S.rise(S.beat(3))}>${chip('<b>CF-1</b> call 555…  →  left out', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</div>
    <div ${S.rise(cue)}>${chip('//elsewhere.example  →  /', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</div>
  </div>
  ${browser('shots/web-server-error-crafted-xl-light.png', { width: 1000, title: 'Something went wrong · Christian Fitness', url: 'localhost:4310/server-error?reference=…', style: at(860, 220, 1000), attrs: arrive(S, 0.2, 1, 6) })}
  </div>`;
});

// ── Act 3: what it costs and proves ─────────────────────────────────────────────────────────────
Film.scene('budget', (S) => {
  const grow = onBeat(S, part('budget', 0, 0.3));
  const fill = (t) => ease.out(prog(t, grow, 1.4));
  const width = 1500;
  const x = (kb) => (kb / 260) * width;
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 90, 900)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-035 · ADR 0006</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Loaded when')} ${S.words(S.beat(2.5), '', { accent: 'needed.' })}</h1>
  </div>
  <p class="figure" style="${at(1060, 70, 800)};text-align:right" ${S.rise(grow)}>220<span style="font-size:120px"> kB</span></p>
  <div style="${at(210, 520, width)};height:110px;border-radius:var(--radius-full);background:var(--palette-stone-150);overflow:hidden">
    <div style="height:100%;background:var(--palette-bordeaux-700);border-radius:var(--radius-full)" ${S.ref((el, t) => { el.style.width = `${x(220.4) * fill(t)}px`; })}></div>
  </div>
  ${[[225, 'warning 225 kB'], [250, 'error 250 kB']].map(([kb, label], i) => `
    <div style="position:absolute;left:${210 + x(kb)}px;top:480px;width:6px;height:190px;background:var(--palette-stone-950)" ${S.rise(grow + S.BEAT * (2 + i))}></div>
    <p class="kicker" style="position:absolute;left:${210 + x(kb) - 150}px;top:${i ? 700 : 420}px;width:300px;text-align:center" ${S.rise(grow + S.BEAT * (2 + i))}>${label}</p>`).join('')}
  <p class="lede" style="${at(210, 800, 1500)}" ${S.rise(grow + S.BAR)}>Each screen is a lazy chunk of its own, fetched on first visit.</p>
  </div>`;
}, { before: 0.3 });

Film.scene('proof', (S) => {
  const rows = [
    [`${C.specs.tests} Playwright tests`, C.specs.command],
    [`${C.unit.passed} unit tests`, C.unit.command],
    [`${C.api.passed} ProblemDetails tests`, C.api.command],
  ];
  return `
  <div class="fill field--ink">
  <div style="${at(110, 110, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Red,')}<br>${S.words(S.beat(2), 'then', { accent: 'green.' })}</h1>
  </div>
  <div style="${at(880, 200, 940)};${terminal};font-size:34px">
    ${rows.map(([what, cmd], i) => `
      <div style="margin-bottom:30px" ${S.rise(onBeat(S, part('proof', 0, 0.3 + i * 0.2)), { y: 30 })}>
        <div><span style="color:var(--palette-green-300)">✓</span> ${esc(what)}</div>
        <div style="font-size:24px;color:var(--palette-stone-400)">${esc(cmd)}</div>
      </div>`).join('')}
  </div>
  </div>`;
});

Film.scene('left', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 130, 800)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>What is left</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Ready,')} ${S.words(S.beat(2), '', { accent: 'waiting.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;align-items:center;gap:30px">
    <span ${pop(S, S.beat(2))}>${chip('GET /api/…  500', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span class="headline headline--md" ${pop(S, S.beat(3))}>→</span>
    <span ${pop(S, S.beat(3.5))}>${chip('serverErrorInterceptor', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span class="headline headline--md" ${pop(S, S.beat(4.5))}>→</span>
    <span ${pop(S, S.beat(5))}>${chip('/server-error', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('servererror', 'var(--palette-bordeaux-700)');
wipeInto('budget', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
