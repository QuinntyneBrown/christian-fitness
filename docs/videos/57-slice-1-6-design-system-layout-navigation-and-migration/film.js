// Video 57 · Slice 1.6: Design-system layout, navigation and migration. Nine scenes on a 120 BPM
// grid (one bar is two seconds). The app pictures are screenshots of the running member and admin
// apps from shots.ts, through the page objects and the shared fixture: every screen shown is now
// composed of library components. The tab bar, breadcrumb and footer, which no screen shows yet,
// are drawn from their design-system pages. The removed folders, the test counts and the initial
// totals are what the file system, the runners and the build said (shots/captures.js). Every
// position is a pure function of the scene's time (docs/videos/README.md).
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
const closeUp = (src, x, y, w, attrs, bg = light) =>
  `<div style="${at(x, y, w)};${bg};padding:24px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto;border-radius:8px"></div>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const web = (path) => `localhost:4310${path}`;
const adminUrl = (path) => `localhost:4311${path}`;

const brand = 'var(--palette-bordeaux-700)';
const ink = 'var(--palette-stone-950)';
const paper = 'var(--palette-stone-0)';
const line = 'var(--palette-stone-300)';
const pill = (text, bg, fg, border = bg) =>
  `<span style="display:inline-block;padding:12px 24px;border-radius:var(--radius-full);background:${bg};color:${fg};border:2px solid ${border};font:600 26px/1 var(--font-family-sans);white-space:nowrap">${esc(text)}</span>`;
const attr = (text) => `<div style="margin-top:14px;font:500 22px/1.2 var(--font-family-mono);color:var(--palette-stone-500)">${esc(text)}</div>`;
const panel = (x, y, w, inner, attrs) => `<div style="${at(x, y, w)};${light};padding:32px 38px" ${attrs}>${inner}</div>`;

// ── Act 1: one library ─────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 270, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 1.6 · Layout, navigation, migration</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Every screen,')}<br>${S.words(S.beat(3), '', { accent: 'one library.' })}</h1>
  </div>
  ${browser('shots/web-profile-xl-light.png', { width: 880, title: 'Profile · Christian Fitness', url: web('/profile'), style: at(960, 140, 880), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-profile-xs-light.png', { width: 240, style: at(850, 560, 240), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('removed', (S) => {
  const rows = C.library.removed;
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-038 · AC7 · ADR 0019</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), `${rows.length} copies`)}<br>${S.words(S.beat(2.5), '', { accent: 'gone.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('removed', 0, 0.6)))}>${C.library.folders} folders, ${C.library.pages} design-system pages, one composite: ${esc(C.library.composite)}.</p>
  </div>
  <div style="${at(800, 90, 1020)};${terminal};font-size:25px;padding:28px 36px;columns:2;column-gap:40px">
    ${rows.map(([gone, now], i) => `<div style="break-inside:avoid;margin-bottom:8px" ${S.rise(0.4 + i * 0.14, { y: 20 })}><span style="${dim};text-decoration:line-through">${esc(gone)}</span><br><span style="${green}">→ ${esc(now)}</span></div>`).join('')}
  </div>
  </div>`;
}, { before: 0.3 });

// ── Act 2: the shells ──────────────────────────────────────────────────────────────────────────
Film.scene('member', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>cf-skip-link · cf-top-bar</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Skip first,')}<br>${S.words(S.beat(2.5), '', { accent: 'then the bar.' })}</h1>
  </div>
  ${browser('shots/web-skip-link-xl-light.png', { width: 900, title: 'Home · Christian Fitness', url: web('/home'), style: at(900, 130, 900), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/web-top-bar.png', 110, 560, 1080, pop(S, onBeat(S, part('member', 0, 0.5)), -1))}
  </div>
`, { before: 0.3 });

Film.scene('admin', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 110, 620)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>cf-admin-layout · cf-sidebar-navigation</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Sidebar,')}<br>${S.words(S.beat(2.5), '', { accent: 'then a band.' })}</h1>
  </div>
  ${browser('shots/admin-skip-link-xl-light.png', { width: 760, title: 'Events · Christian Fitness Admin', url: adminUrl('/events'), style: at(110, 520, 760), attrs: arrive(S, S.beat(2), -1, -6) })}
  ${tablet('shots/admin-events-m-light.png', { width: 380, style: at(960, 150, 380), attrs: arrive(S, onBeat(S, part('admin', 0, 0.45)), 2, 8) })}
  ${phone('shots/admin-events-xs-light.png', { width: 250, style: at(1420, 200, 250), attrs: arrive(S, onBeat(S, part('admin', 0, 0.6)), -2, -8) })}
  ${browser('shots/admin-events-xl-dark.png', { width: 560, title: 'Events · Christian Fitness Admin', url: adminUrl('/events'), style: at(1300, 640, 520), attrs: arrive(S, onBeat(S, part('admin', 0, 0.8)), 1, 6) })}
  </div>
`, { before: 0.3 });

// ── Act 3: the screens ─────────────────────────────────────────────────────────────────────────
Film.scene('profile', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>cf-container · cf-split · cf-list</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Composed,')}<br>${S.words(S.beat(2.5), '', { accent: 'not copied.' })}</h1>
  </div>
  ${browser('shots/web-profile-xl-dark.png', { width: 820, title: 'Profile · Christian Fitness', url: web('/profile'), style: at(110, 470, 820), attrs: arrive(S, S.beat(2), -1, -6) })}
  ${phone('shots/web-loading-xs-light.png', { width: 230, style: at(1500, 120, 230), attrs: arrive(S, onBeat(S, part('profile', 0, 0.55)), 2, 8) })}
  ${closeUp('shots/web-error.png', 1000, 600, 820, pop(S, onBeat(S, part('profile', 0, 0.75)), 1))}
  </div>
`, { before: 0.3 });

Film.scene('forms', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>cf-alert · cf-link · cf-interest-list</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Same parts,')}<br>${S.words(S.beat(2.5), '', { accent: 'every form.' })}</h1>
  </div>
  ${closeUp('shots/web-sign-in-alert.png', 110, 400, 420, pop(S, S.beat(2), -1))}
  <div style="${at(580, 880, 600)};font:500 24px/1.3 var(--font-family-mono);color:var(--palette-stone-700)" ${S.rise(S.beat(3))}>role="alert" · focus moves to it</div>
  ${phone('shots/web-join-interests-xs-light.png', { width: 270, style: at(820, 170, 270), attrs: arrive(S, onBeat(S, part('forms', 0, 0.5)), 2, 8) })}
  <div style="${at(1240, 380, 560)};${terminal};font-size:26px" ${pop(S, onBeat(S, part('forms', 0, 0.7)), 1)}>
    <div style="${dim}">&lt;cf-button busy&gt;</div>
    <div>aria-busy="true"</div>
    <div><span style="${green}">⟳</span> Signing in…</div>
  </div>
  </div>
`, { before: 0.3 });

Film.scene('ready', (S) => {
  const tab = (label, on) =>
    `<div style="flex:1;text-align:center;padding:16px 0;font:600 22px/1 var(--font-family-sans);color:${on ? brand : 'var(--palette-stone-600)'};border-top:4px solid ${on ? brand : 'transparent'}">${esc(label)}</div>`;
  return `
  <div class="fill field--blush">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Built, waiting for their screens</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Ready')}<br>${S.words(S.beat(2.5), '', { accent: 'when needed.' })}</h1>
  </div>
  ${panel(110, 560, 700, `<div style="display:flex">${tab('Home', false)}${tab('Events', true)}${tab('Services', false)}${tab('Messages 4', false)}${tab('Profile', false)}</div>${attr('cf-tab-bar · aria-current="page" · ", 4 unread"')}`, pop(S, S.beat(2), -1))}
  ${panel(960, 220, 840, `<div style="font:500 28px/1.2 var(--font-family-sans)"><span style="color:${brand};text-decoration:underline">Events</span> <span style="${dim}">/</span> <span style="color:${brand};text-decoration:underline">Sunrise 5K</span> <span style="${dim}">/</span> <b>Registrations</b></div>${attr('cf-breadcrumb · last crumb aria-current="page"')}`, pop(S, S.beat(3), 1))}
  ${panel(960, 600, 840, `<div style="display:flex;justify-content:space-between;font:500 24px/1.2 var(--font-family-sans);color:var(--palette-stone-600)"><span>© 2026 Christian Fitness · Toronto</span><span>Health · Energy · Abundant life</span></div>${attr('cf-footer · one row from 640 px')}`, pop(S, S.beat(4), -1))}
  </div>`;
}, { before: 0.3 });

// ── Act 4: what it proves ───────────────────────────────────────────────────────────────────────
Film.scene('proof', (S) => {
  const rows = [
    [`${C.specs.tests} Playwright tests, unchanged in what they assert`, C.specs.command],
    [`${C.unit.components} component and ${C.unit.domain} domain tests`, C.unit.command],
    [`member ${C.build.web} kB · admin ${C.build.admin} kB`, `${C.build.command} · initial totals, unchanged`],
  ];
  return `
  <div class="fill field--ink">
  <div style="${at(110, 130, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Nothing')}<br>${S.words(S.beat(2), '', { accent: 'grew.' })}</h1>
  </div>
  <div style="${at(820, 220, 1000)};${terminal};font-size:32px">
    ${rows.map(([what, cmd], i) => `
      <div style="margin-bottom:30px" ${S.rise(S.beat(2 + i), { y: 30 })}>
        <div><span style="${green}">✓</span> ${esc(what)}</div>
        <div style="font-size:23px;${dim}">${esc(cmd)}</div>
      </div>`).join('')}
  </div>
  </div>`;
});

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
wipeInto('member', 'var(--palette-bordeaux-700)');
wipeInto('profile', 'var(--palette-borealis-300)');
wipeInto('proof', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
