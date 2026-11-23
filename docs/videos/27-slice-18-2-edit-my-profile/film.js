// Video 27 · Slice 18.2: Edit my profile. Ten scenes on a 120 BPM grid (one bar is two seconds).
// The pictures are screenshots of the running member app from shots.ts, through the page objects
// and the shared fixture; the API's answers are drawn from what the API tests assert; the counts,
// the test names and the initial total are what the runners and the build printed
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
const closeUp = (src, x, y, w, attrs) =>
  `<div style="${at(x, y, w)};${light};padding:28px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4310${path}`;
const TITLE = 'Profile · Christian Fitness';

// ── Act 1: edit your profile ────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 18.2 · Edit my profile</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Yours to')}<br>${S.words(S.beat(3), '', { accent: 'change.' })}</h1>
  </div>
  ${browser('shots/web-dialog-xl-light.png', { width: 860, title: TITLE, url: url('/profile'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-dialog-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('open', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-006 AC1 · ADR 0021</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Edit')}<br>${S.words(S.beat(2.5), '', { accent: 'profile.' })}</h1>
    <p class="lede" style="margin-top:28px" ${S.rise(onBeat(S, part('open', 0, 0.6)))}>A CDK Dialog, built from the library.</p>
  </div>
  ${closeUp('shots/web-hero.png', 110, 520, 900, pop(S, S.beat(2), -0.5))}
  ${closeUp('shots/web-add-bio.png', 110, 820, 900, pop(S, onBeat(S, part('open', 0, 0.3)), 0.5))}
  ${tablet('shots/web-dialog-m-light.png', { width: 560, style: at(1180, 140, 560), attrs: arrive(S, onBeat(S, part('open', 0, 0.55)), 2, 8) })}
  </div>
`, { before: 0.3 });

Film.scene('church', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-006 AC4 · L2-033</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Hidden')}<br>${S.words(S.beat(2.5), '', { accent: 'by default.' })}</h1>
  </div>
  ${closeUp('shots/web-church.png', 110, 520, 1000, pop(S, S.beat(2), -0.5))}
  ${closeUp('shots/web-show-church.png', 1180, 560, 640, pop(S, onBeat(S, part('church', 0, 0.7)), 1))}
  </div>
`, { before: 0.3 });

Film.scene('save', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 560)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-006 · AC2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Saved,')}<br>${S.words(S.beat(2.5), '', { accent: 'at once.' })}</h1>
  </div>
  ${closeUp('shots/web-saving.png', 110, 620, 640, pop(S, S.beat(2), -1))}
  ${browser('shots/web-saved-xl-light.png', { width: 760, title: TITLE, url: url('/profile'), style: at(840, 160, 760), attrs: arrive(S, onBeat(S, part('save', 0, 0.35)), -2, -8) })}
  ${phone('shots/web-saved-xs-light.png', { width: 250, style: at(1580, 440, 250), attrs: arrive(S, onBeat(S, part('save', 0, 0.7)), 3, 9) })}
  </div>
`, { before: 0.3 });

// ── Act 2: when a save cannot go through ────────────────────────────────────────────────────────
Film.scene('limits', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-006 AC3, AC6 · mock: invalid-limits</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Named')}<br>${S.words(S.beat(2.5), '', { accent: 'first.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('limits', 0, 0.75)))}>${C.limits.items.map((item) => esc(item)).join('<br>')}</p>
  </div>
  ${browser('shots/web-limits-xl-light.png', { width: 760, title: TITLE, url: url('/profile'), style: at(820, 140, 760), attrs: arrive(S, S.beat(2), -2, -8) })}
  ${phone('shots/web-limits-xs-light.png', { width: 250, style: at(1560, 460, 250), attrs: arrive(S, onBeat(S, part('limits', 0, 0.5)), 3, 9) })}
  </div>
`);

Film.scene('refused', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-006 AC7 · mock: refused · failed</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Nothing')}<br>${S.words(S.beat(2.5), '', { accent: 'lost.' })}</h1>
  </div>
  ${closeUp('shots/web-refused.png', 110, 520, 760, pop(S, S.beat(2), -0.5))}
  ${closeUp('shots/web-failed.png', 110, 800, 760, pop(S, onBeat(S, part('refused', 0, 0.4)), 0.5))}
  ${phone('shots/web-failed-xs-light.png', { width: 280, style: at(1060, 150, 280), attrs: arrive(S, onBeat(S, part('refused', 0, 0.55)), -3, -9) })}
  ${browser('shots/web-refused-xl-light.png', { width: 460, title: TITLE, url: url('/profile'), style: at(1400, 420, 460), attrs: arrive(S, onBeat(S, part('refused', 0, 0.7)), 2, 8) })}
  </div>
`, { before: 0.3 });

Film.scene('private', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-006 AC5 · L2-031 · ADR 0021</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Only')}<br>${S.words(S.beat(2.5), '', { accent: 'yours.' })}</h1>
  </div>
  <div style="${at(800, 150, 1020)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">PUT /api/members/{Grace's id}/profile · Grace</div>
    <div><span style="${green}">200</span> the profile as saved, trimmed</div>
    <div style="${dim};margin-top:22px">PUT /api/members/{Michael's id}/profile · Grace</div>
    <div><span style="${rose}">403</span> forbidden · nothing changed</div>
    <div style="${dim};margin-top:22px">bio 301 · 6 goals</div>
    <div><span style="${rose}">400</span> field_too_long · too_many_goals</div>
    <div style="${dim};margin-top:22px">no session</div>
    <div><span style="${rose}">401</span> unauthenticated</div>
  </div>
  <p class="lede" style="${at(800, 820, 1020)};color:var(--palette-stone-300)" ${S.rise(onBeat(S, part('private', 0, 0.7)))}>An unknown id gets the same 403. No home church in any span or log.</p>
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
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>First load ${C.build.raw} kB of 290, CDK Dialog included. The dialog: ${C.build.dialog} kB, on first use.</p>
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
  <div style="${at(110, 130, 1500)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 19.1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Another')} ${S.words(S.beat(2), '', { accent: "member's profile." })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('public profile', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('church only if shown', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('Going to: slice 6.1', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('limits', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
