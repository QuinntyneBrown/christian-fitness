// Video 53 · Slice 26.1: Find members. Eleven scenes on a 120 BPM grid (one bar is two seconds).
// The pictures are screenshots of the running admin app from shots.ts, through the page object
// and the shared fixture; the questions the search asked are the ones the fixture recorded; the
// API's answer and refusal are drawn from what the API tests assert; the counts and the bundle
// sizes are what the runners and the build printed (shots/captures.js). Every position is a pure
// function of the scene's time (docs/videos/README.md).
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
  `<div style="${at(x, y, w)};${bg};padding:24px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4311${path}`;
const TITLE = 'Members · Christian Fitness Admin';
/** A question the app asked the list, as the fixture recorded it. */
const question = (asked) =>
  `GET /api/admin/members?status=${asked.status}${asked.q === null ? '' : `&q=${asked.q}`}`;

// ── Act 1: the list ─────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 26.1 · Find members</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Any member,')}<br>${S.words(S.beat(3), '', { accent: 'found.' })}</h1>
  </div>
  ${browser('shots/admin-members-xl-light.png', { width: 860, title: TITLE, url: url('/members'), style: at(960, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/admin-members-xs-light.png', { width: 250, style: at(840, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('list', (S) => {
  const first = C.list.rows[0];
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-028 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Everyone,')}<br>${S.words(S.beat(2.5), '', { accent: 'in a table.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('list', 0, 0.5)))}>${esc(first[0])}<br>Joined ${esc(first[3])}, in Toronto.</p>
  </div>
  ${browser('shots/admin-members-xl-light.png', { width: 1060, title: TITLE, url: url('/members'), style: at(780, 150, 1060), attrs: arrive(S, 0.2, 1, 6) })}
  </div>`;
}, { before: 0.3 });

Film.scene('tabs', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-028 · AC3</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'A tab for')}<br>${S.words(S.beat(2.5), '', { accent: 'each status.' })}</h1>
  </div>
  ${tablet('shots/admin-members-flagged-m-light.png', { width: 420, style: at(150, 470, 420), attrs: arrive(S, 0.2, -2, -6) })}
  ${browser('shots/admin-members-suspended-xl-light.png', { width: 980, title: TITLE, url: url('/members?status=suspended'), style: at(800, 220, 980), attrs: arrive(S, onBeat(S, part('tabs', 0, 0.55)), 1, 8) })}
  </div>
`);

// ── Act 2: finding someone ──────────────────────────────────────────────────────────────────────
Film.scene('search', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-028 · AC2 · 300 ms after the last key</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Five letters,')}<br>${S.words(S.beat(2.5), '', { accent: 'one question.' })}</h1>
  </div>
  <div style="${at(110, 560, 760)};${terminal};font-size:22px" ${pop(S, onBeat(S, part('search', 0, 0.3)))}>
    ${C.asked.map((asked) => `<div>${esc(question(asked))}</div>`).join('')}
    <div style="${dim};margin-top:12px">${C.asked.length} questions for “grace”, not ${1 + 'grace'.length}</div>
  </div>
  ${browser('shots/admin-members-search-xl-light.png', { width: 900, title: TITLE, url: url('/members?q=grace'), style: at(920, 150, 900), attrs: arrive(S, 0.2, 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('none', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>admin-members · no-results</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Nobody?')}<br>${S.words(S.beat(2.5), '', { accent: 'It says so.' })}</h1>
  </div>
  ${browser('shots/admin-members-none-xl-light.png', { width: 900, title: TITLE, url: url('/members?q=Jessica'), style: at(920, 110, 900), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/admin-members-none.png', 110, 640, 760, pop(S, onBeat(S, part('none', 0, 0.45)), -1))}
  </div>
`);

Film.scene('pages', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-028 · AC1 · 25 to a page</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Page')}<br>${S.words(S.beat(2.5), '', { accent: 'by page.' })}</h1>
  </div>
  ${browser('shots/admin-members-pages-xl-light.png', { width: 940, title: TITLE, url: url('/members?page=2'), style: at(880, 110, 940), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/admin-members-pages.png', 110, 660, 1060, pop(S, onBeat(S, part('pages', 0, 0.35)), -1))}
  ${phone('shots/admin-members-pages-xs-light.png', { width: 230, style: at(1640, 520, 230), attrs: arrive(S, onBeat(S, part('pages', 0, 0.7)), 4, 10) })}
  </div>
`, { before: 0.3 });

Film.scene('states', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-028 · AC5</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Loading, or')}<br>${S.words(S.beat(2.5), '', { accent: 'try again.' })}</h1>
  </div>
  ${browser('shots/admin-members-loading-xl-light.png', { width: 900, title: TITLE, url: url('/members'), style: at(880, 110, 900), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/admin-members-error.png', 110, 690, 1000, pop(S, onBeat(S, part('states', 0, 0.55)), -1))}
  </div>
`);

Film.scene('api', (S) => {
  const later = onBeat(S, part('api', 0, 0.6));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>ADR 0022 · the API tests</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One answer,')}<br>${S.words(S.beat(2.5), '', { accent: 'nothing logged.' })}</h1>
  </div>
  <div style="${at(800, 130, 1020)};${terminal};font-size:24px" ${pop(S, S.beat(2))}>
    <div style="${dim}">GET /api/admin/members?status=active&amp;q=gmail</div>
    <div><span style="${green}">200</span> { "total": <span style="${green}">5</span>, "matches": <span style="${green}">1</span>,</div>
    <div>&nbsp;&nbsp;"page": <span style="${green}">1</span>, "pageSize": <span style="${green}">25</span>, "members": [ … ] }</div>
    <div style="${dim};margin-top:12px">?status=banned · ?page=0 · a search of 101 characters</div>
    <div><span style="${rose}">400</span> <span style="${green}">"validation_failed"</span></div>
  </div>
  <div style="${at(800, 600, 1020)};${terminal};font-size:24px" ${pop(S, later)}>
    <div style="${dim}">the span of a search</div>
    <div>GET <span style="${green}">api/admin/members</span></div>
    <div style="${dim};margin-top:12px">no term · no email · no home church</div>
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
  <div style="${at(110, 110, 720)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Red,')}<br>${S.words(S.beat(2), 'then', { accent: 'green.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>Admin first load ${C.build.raw} kB of 290.<br>Members ${C.build.page} kB, loaded when first opened.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Later · slices 25.1 and 27.1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Then,')} ${S.words(S.beat(2), '', { accent: 'moderate.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('Flag', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('Suspend', 'var(--palette-stone-950)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('Reinstate', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('search', 'var(--palette-bordeaux-700)');
wipeInto('proof', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
