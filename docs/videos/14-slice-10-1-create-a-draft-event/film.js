// Video 14 · Slice 10.1: Create a draft event. Eleven scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running admin app from shots.ts, through the page
// objects and the shared fixture; the request Save draft sent is the one the fixture recorded; the
// API's refusal is drawn from what the API tests assert; the counts and the bundle sizes are what
// the runners and the build printed (shots/captures.js). Every position is a pure function of the
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
  `<div style="${at(x, y, w)};${bg};padding:24px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4311${path}`;
const TITLE = 'Events · Christian Fitness Admin';

// ── Act 1: the list ─────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 10.1 · Create a draft event</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'New event,')}<br>${S.words(S.beat(3), '', { accent: 'kept as a draft.' })}</h1>
  </div>
  ${browser('shots/admin-saved-xl-light.png', { width: 860, title: TITLE, url: url('/events'), style: at(960, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/admin-editor-xs-light.png', { width: 250, style: at(840, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('list', (S) => {
  const draft = C.list.rows[C.list.rows.length - 1];
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-022 · AC5</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Soonest')}<br>${S.words(S.beat(2.5), '', { accent: 'first.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('list', 0, 0.5)))}>${esc(draft[2])}, in Toronto.<br>${esc(draft[3])} going.</p>
  </div>
  ${browser('shots/admin-events-xl-light.png', { width: 1060, title: TITLE, url: url('/events'), style: at(780, 150, 1060), attrs: arrive(S, 0.2, 1, 6) })}
  </div>`;
}, { before: 0.3 });

Film.scene('tabs', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>All · Published · Draft</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Every tab')}<br>${S.words(S.beat(2.5), '', { accent: 'counts.' })}</h1>
  </div>
  ${tablet('shots/admin-events-draft-m-light.png', { width: 420, style: at(150, 470, 420), attrs: arrive(S, 0.2, -2, -6) })}
  ${browser('shots/admin-events-tab-empty-xl-light.png', { width: 980, title: TITLE, url: url('/events?status=published'), style: at(800, 220, 980), attrs: arrive(S, onBeat(S, part('tabs', 0, 0.55)), 1, 8) })}
  </div>
`);

// ── Act 2: the editor ───────────────────────────────────────────────────────────────────────────
Film.scene('editor', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-022 · AC1 · a CDK Dialog</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'The event')}<br>${S.words(S.beat(2.5), '', { accent: 'editor.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('editor', 0, 0.6)))}>Loaded on the first New event.</p>
  </div>
  ${browser('shots/admin-editor-xl-light.png', { width: 960, title: TITLE, url: url('/events'), style: at(700, 140, 960), attrs: arrive(S, 0.2, 1, 6) })}
  ${phone('shots/admin-editor-xs-light.png', { width: 250, style: at(1610, 470, 250), attrs: arrive(S, onBeat(S, part('editor', 0, 0.7)), 4, 10) })}
  </div>
`, { before: 0.3 });

Film.scene('saving', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 620)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>event-editor · saving</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Saving…')}</h1>
  </div>
  <div style="${at(110, 470, 640)};${terminal};font-size:22px" ${pop(S, onBeat(S, part('saving', 0, 0.3)))}>
    <div style="${dim}">POST /api/admin/events</div>
    <div>"category": <span style="${green}">"${esc(C.sent.category)}"</span>, "date": <span style="${green}">"${esc(C.sent.date)}"</span></div>
    <div>"startTime": <span style="${green}">"${esc(C.sent.startTime)}"</span>, "priceCents": <span style="${green}">${C.sent.priceCents}</span></div>
    <div>"capacity": <span style="${green}">${C.sent.capacity}</span></div>
  </div>
  ${closeUp('shots/admin-editor-saving.png', 1060, 60, 560, pop(S, S.beat(1.5), 1))}
  </div>
`);

Film.scene('saved', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 600)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>admin-toast · draft-saved</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Draft')}<br>${S.words(S.beat(2.5), '', { accent: 'saved.' })}</h1>
  </div>
  ${browser('shots/admin-saved-xl-light.png', { width: 1060, title: TITLE, url: url('/events'), style: at(760, 150, 1060), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/admin-saved-toast.png', 110, 600, 560, pop(S, onBeat(S, part('saved', 0, 0.35)), -1))}
  </div>
`, { before: 0.3 });

Film.scene('states', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-022 · AC5 · AC6</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Empty, or')}<br>${S.words(S.beat(2.5), '', { accent: 'try again.' })}</h1>
  </div>
  ${browser('shots/admin-events-empty-xl-light.png', { width: 900, title: TITLE, url: url('/events'), style: at(880, 110, 900), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/admin-events-error.png', 110, 690, 1000, pop(S, onBeat(S, part('states', 0, 0.55)), -1))}
  </div>
`);

Film.scene('api', (S) => {
  const later = onBeat(S, part('api', 0, 0.55));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>ADR 0020 · the API tests</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'A code for')}<br>${S.words(S.beat(2.5), '', { accent: 'every field.' })}</h1>
  </div>
  <div style="${at(800, 130, 1020)};${terminal};font-size:24px" ${pop(S, S.beat(2))}>
    <div style="${dim}">POST /api/admin/events · title blank, capacity 0</div>
    <div><span style="${rose}">400</span> <span style="${green}">"validation_failed"</span></div>
    <div>"fieldCodes": { "title": <span style="${green}">"title_required"</span>,</div>
    <div>&nbsp;&nbsp;"capacity": <span style="${green}">"capacity_out_of_range"</span> }</div>
    <div style="${dim};margin-top:12px">nothing is saved</div>
  </div>
  <div style="${at(800, 560, 1020)};${terminal};font-size:24px" ${pop(S, later)}>
    <div style="${dim}">date 2026-05-22 · startTime 16:00 · America/Toronto</div>
    <div>startsAt <span style="${green}">2026-05-22T20:00:00Z</span></div>
    <div style="${dim};margin-top:12px">a start before the API's clock: <span style="${green}">"start_in_past"</span></div>
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
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>Admin first load ${C.build.raw} kB of 290.<br>Editor ${C.build.editor} kB, loaded when first opened.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 10.2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Edit an')} ${S.words(S.beat(2), '', { accent: 'event.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('Edit', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('each field named', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('an image', 'var(--palette-stone-950)', 'var(--palette-stone-0)')}</span>
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
wipeInto('editor', 'var(--palette-bordeaux-700)');
wipeInto('proof', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
