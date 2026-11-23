// Video 26 · Slice 18.1: View my profile. Ten scenes on a 120 BPM grid (one bar is two seconds).
// The pictures are screenshots of the running member app from shots.ts, through the page objects
// and the shared fixture; the API's answer is drawn from what the API tests assert; the counts,
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

// ── Act 1: your profile ─────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 18.1 · View my profile</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'A page of')}<br>${S.words(S.beat(3), '', { accent: 'your own.' })}</h1>
  </div>
  ${browser('shots/web-profile-xl-light.png', { width: 860, title: TITLE, url: url('/profile'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-profile-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('avatar', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-005 AC1 · ADR 0014</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Your')}<br>${S.words(S.beat(2.5), '', { accent: 'initials.' })}</h1>
  </div>
  ${closeUp('shots/web-header-home.png', 110, 560, 1700, pop(S, S.beat(2), -0.5))}
  ${closeUp('shots/web-header-profile.png', 110, 790, 1700, pop(S, onBeat(S, part('avatar', 0, 0.55)), 0.5))}
  <p class="lede" style="${at(900, 200, 900)}" ${S.rise(onBeat(S, part('avatar', 0, 0.6)))}>Home, then Profile: the ring says where you are, and the page never reloads.</p>
  </div>
`, { before: 0.3 });

Film.scene('profile', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 560)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-005 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'All of')}<br>${S.words(S.beat(2.5), '', { accent: 'you.' })}</h1>
  </div>
  ${phone('shots/web-profile-xs-light.png', { width: 250, style: at(240, 470, 250), attrs: arrive(S, onBeat(S, part('profile', 0, 0.2)), -3, -8) })}
  ${tablet('shots/web-profile-m-light.png', { width: 520, style: at(720, 170, 520), attrs: arrive(S, onBeat(S, part('profile', 0, 0.45)), -2, -8) })}
  ${browser('shots/web-profile-xl-dark.png', { width: 600, title: TITLE, url: url('/profile'), style: at(1270, 330, 600), attrs: arrive(S, onBeat(S, part('profile', 0, 0.7)), 2, 8) })}
  </div>
`, { before: 0.3 });

Film.scene('going', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-005 · AC1</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Going')}<br>${S.words(S.beat(2.5), '', { accent: 'to.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('going', 0, 0.6)))}>${C.profile.rows.map((row) => esc(`${row.date} · ${row.title}`)).join('<br>')}</p>
  </div>
  ${closeUp('shots/web-going.png', 900, 200, 900, pop(S, S.beat(2), 1))}
  </div>
`, { before: 0.3 });

// ── Act 2: nothing yet, and when it goes wrong ──────────────────────────────────────────────────
Film.scene('empty', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-005 · AC2 · mock: empty</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Nothing')}<br>${S.words(S.beat(2.5), '', { accent: 'yet.' })}</h1>
  </div>
  ${phone('shots/web-new-xs-light.png', { width: 280, style: at(820, 140, 280), attrs: arrive(S, S.beat(2), -3, -8) })}
  ${closeUp('shots/web-new-going.png', 1200, 200, 620, pop(S, onBeat(S, part('empty', 0, 0.6)), 1))}
  ${phone('shots/web-new-going-xs-light.png', { width: 240, style: at(1400, 560, 240), attrs: arrive(S, onBeat(S, part('empty', 0, 0.75)), 4, 10) })}
  </div>
`);

Film.scene('states', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>mock: loading · error · ADR 0014</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Try')}<br>${S.words(S.beat(2.5), '', { accent: 'again.' })}</h1>
  </div>
  ${browser('shots/web-loading-xl-light.png', { width: 640, title: TITLE, url: url('/profile'), style: at(760, 140, 640), attrs: arrive(S, S.beat(2), -2, -8) })}
  ${closeUp('shots/web-error.png', 1120, 560, 700, pop(S, onBeat(S, part('states', 0, 0.55)), 1))}
  ${phone('shots/web-error-xs-light.png', { width: 240, style: at(160, 560, 240), attrs: arrive(S, onBeat(S, part('states', 0, 0.7)), -4, -10) })}
  </div>
`, { before: 0.3 });

Film.scene('private', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-005 · ADR 0014</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Only')}<br>${S.words(S.beat(2.5), '', { accent: 'yours.' })}</h1>
  </div>
  <div style="${at(800, 150, 1020)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">GET /api/profile/me · Grace's session</div>
    <div><span style="${green}">200</span> name · city · joinedAt · bio · homeChurch</div>
    <div style="padding-left:68px">goals · interests · upcomingEvents</div>
    <div style="${dim};margin-top:22px">GET /api/profile/me · Michael's session</div>
    <div><span style="${green}">200</span> Michael Chen · only his own</div>
    <div style="${dim};margin-top:22px">GET /api/profile/me · no session</div>
    <div><span style="${rose}">401</span> unauthenticated</div>
  </div>
  <p class="lede" style="${at(800, 760, 1020)};color:var(--palette-stone-300)" ${S.rise(onBeat(S, part('private', 0, 0.7)))}>No id in the address. No home church in any span or log.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 18.2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Edit your')} ${S.words(S.beat(2), '', { accent: 'profile.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('Edit profile', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('bio ≤ 300', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('5 goals', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(3.5))}>${chip('Going to: slice 6.1', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('empty', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
