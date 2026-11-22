// Video 06 · Slice 2.2: Join refusals. Eleven scenes on a 120 BPM grid (one bar is two seconds).
// The pictures are screenshots of the running member app from shots.ts, through the page objects
// and the shared fixture; the API's answers are drawn from what the API tests assert; the counts
// and the test names are what the runners printed (shots/captures.js). Every position is a pure
// function of the scene's time (docs/videos/README.md).
const { enter, ease, lerp, clamp, phone, browser, esc } = Film;
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

// ── Act 1: the form ─────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 860)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 2.2 · Join refusals</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Say what')}<br>${S.words(S.beat(3), '', { accent: 'to fix.' })}</h1>
  </div>
  ${browser('shots/web-join-invalid-fields-xl-light.png', { width: 860, title: 'Join · Christian Fitness', url: 'localhost:4310/join', style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-join-taken-xs-light.png', { width: 250, style: at(880, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('fields', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-003 · AC3</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Each field,')}<br>${S.words(S.beat(2.5), '', { accent: 'named.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('fields', 0, 0.7)))}>Nothing is sent while a field is invalid.</p>
  </div>
  ${browser('shots/web-join-invalid-fields-xl-light.png', { width: 1080, title: 'Join · Christian Fitness', url: 'localhost:4310/join', style: at(760, 150, 1080), attrs: arrive(S, 0.2, -1, 6) })}
  ${phone('shots/web-join-invalid-fields-xs-light.png', { width: 260, style: at(560, 560, 260), attrs: arrive(S, S.bar(2), -4, -10) })}
  </div>
`, { before: 0.3 });

Film.scene('summary', (S) => {
  const fix = onBeat(S, part('summary', 0, 0.55));
  return `
  <div class="fill field--blush">
  <div style="${at(110, 120, 760)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Error summary · role="alert"</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One link,')}<br>${S.words(S.beat(2.5), '', { accent: 'one field.' })}</h1>
  </div>
  ${closeUp('shots/web-join-summary.png', 110, 560, 820, pop(S, S.beat(3), -1))}
  ${closeUp('shots/web-join-password-error.png', 1040, 360, 780, pop(S, fix, 1))}
  <p class="lede" style="${at(1040, 760, 780)}" ${S.rise(fix + S.BEAT)}>Focus lands on Password; the name, now typed, is clear.</p>
  </div>`;
});

Film.scene('taken', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-003 · AC2 · 409</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Already')}<br>${S.words(S.beat(2.5), '', { accent: 'a member?' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('taken', 0, 0.5)))}>Grace@Gmail.com and grace@gmail.com are one account.</p>
  </div>
  ${browser('shots/web-join-taken-xl-light.png', { width: 1000, title: 'Join · Christian Fitness', url: 'localhost:4310/join', style: at(820, 110, 1000), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/web-join-taken-email.png', 640, 760, 900, pop(S, S.bar(2), -1))}
  </div>
`);

Film.scene('failed', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-032 · AC1 · mock: refused, error</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Nothing')}<br>${S.words(S.beat(2.5), '', { accent: 'lost.' })}</h1>
  </div>
  ${closeUp('shots/web-join-refused.png', 110, 560, 760, pop(S, onBeat(S, part('failed', 0, 0.25)), -1))}
  ${phone('shots/web-join-failed-xs-light.png', { width: 300, style: at(1000, 150, 300), attrs: arrive(S, S.beat(2), -3, -8) })}
  ${browser('shots/web-join-failed-xl-light.png', { width: 640, title: 'Join · Christian Fitness', url: 'localhost:4310/join', style: at(1220, 330, 640), attrs: arrive(S, S.bar(2), 2, 8) })}
  </div>
`, { before: 0.3 });

// ── Act 2: the API ──────────────────────────────────────────────────────────────────────────────
Film.scene('api', (S) => {
  const second = onBeat(S, part('api', 0, 0.7));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-003 · AC6 · L2-032 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Checked')}<br>${S.words(S.beat(2.5), '', { accent: 'twice.' })}</h1>
  </div>
  <div style="${at(800, 110, 1020)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">POST /api/account/join · name of 101 characters</div>
    <div><span style="${rose}">400</span> application/problem+json</div>
    <div>"code": <span style="${green}">"field_too_long"</span>,</div>
    <div>"errors": { "fullName": ["Use 100 characters or fewer"] }</div>
  </div>
  <div style="${at(800, 520, 1020)};${terminal};font-size:26px" ${pop(S, second)}>
    <div style="${dim}">POST /api/account/join · Grace.Thompson@Gmail.com, again</div>
    <div><span style="${rose}">409</span> application/problem+json</div>
    <div>"code": <span style="${green}">"email_taken"</span></div>
  </div>
  <p class="lede" style="${at(800, 820, 1020)};color:var(--palette-stone-0)" ${S.rise(second + S.BEAT)}>Never the value sent, and nothing created.</p>
  </div>`;
}, { before: 0.3 });

Film.scene('rules', (S) => {
  const rows = [
    ['Full name', 'blank · over 100'],
    ['Email', 'no name@domain.tld · over 254'],
    ['Password', 'under 8'],
    ['Home church', 'over 120'],
  ];
  const race = onBeat(S, part('rules', 0, 0.6));
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 760)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>ADR 0008 · ${C.backend.ruleRows} rows in each suite</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One table,')}<br>${S.words(S.beat(2.5), '', { accent: 'two stacks.' })}</h1>
    <div style="margin-top:44px;display:flex;flex-direction:column;align-items:flex-start;gap:20px;transform-origin:left;scale:0.85">
      <div ${S.rise(S.beat(4))}>${chip(`validateJoin · member app`, 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</div>
      <div ${S.rise(S.beat(5))}>${chip(`CreateAccountValidator · API`, 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</div>
    </div>
  </div>
  <div style="${at(960, 150, 860)};${light};padding:36px 44px;font:500 32px/1.4 var(--font-family-sans)" ${pop(S, S.beat(2))}>
    ${rows.map(([field, rule], i) => `
      <div style="display:flex;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:2px solid var(--palette-stone-150)" ${S.rise(S.beat(2.5 + i * 0.5), { y: 20 })}>
        <strong>${esc(field)}</strong><span style="color:var(--palette-bordeaux-700)">${esc(rule)}</span></div>`).join('')}
  </div>
  <div style="${at(960, 680, 860)};${terminal};font-size:24px" ${pop(S, race)}>
    <div style="${dim}">unique index refuses the second save</div>
    <div>DbUpdateException → <span style="${green}">409 email_taken</span>, not 500</div>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('text', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-032 · AC3</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Text stays')}<br>${S.words(S.beat(2.5), '', { accent: 'text.' })}</h1>
    <div style="margin-top:44px" ${S.rise(onBeat(S, part('text', 0, 0.4)))}>${chip('fullName: "<b>Grace</b> Thompson"', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</div>
  </div>
  ${closeUp('shots/web-home-markup.png', 900, 560, 900, pop(S, S.beat(2), -1))}
  <p class="lede" style="${at(900, 820, 900)}" ${S.rise(onBeat(S, part('text', 0, 0.7)))}>Home greets the characters typed; no bold.</p>
  </div>
`);

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
  <div style="${at(110, 130, 900)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 3.1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Sign in,')} ${S.words(S.beat(2), '', { accent: 'sign out.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('/sign-in', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('Sign in instead?', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
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
