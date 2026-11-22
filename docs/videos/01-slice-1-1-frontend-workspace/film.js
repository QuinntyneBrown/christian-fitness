// Video 01 · Slice 1.1: Frontend workspace. Nine scenes on a 120 BPM grid (one bar is two
// seconds). The slice has almost no screen, so most scenes are drawn: the workspace tree, the
// dependency direction, the budget and the fixture. The app pictures are screenshots of the
// running apps from shots.ts. Every position is a pure function of the scene's time
// (docs/videos/README.md).
const { enter, ease, lerp, clamp, prog, phone, browser, esc } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;
const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which line `n` of scene `id` starts. */
const said = (id, n) => lineOf(id, n).start - Film.at(id);
/** Scene time at which the fraction `f` of line `n` has been spoken. */
const part = (id, n, f) => said(id, n) + (lineOf(id, n).end - lineOf(id, n).start) * f;
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

// ── Act 1: one workspace ────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 250, 960)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 1.1 · Frontend workspace</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Two apps.')}<br>${S.words(S.beat(3), '', { accent: 'One workspace.' })}</h1>
  </div>
  ${browser('shots/web-xl-light.png', { width: 760, title: 'Christian Fitness', url: 'localhost:4310', style: at(1080, 200, 760), attrs: arrive(S, S.beat(2), 3, 9) })}
  ${browser('shots/admin-xl-dark.png', { width: 640, theme: 'dark', title: 'Christian Fitness Admin', url: 'localhost:4311', style: at(1180, 600, 640), attrs: arrive(S, S.beat(4), -2, -8) })}
  </div>
`);

Film.scene('tree', (S) => {
  const rows = [
    ['frontend/', 'Angular 22 workspace', 0],
    ['projects/web/', 'member app', 1],
    ['projects/admin/', 'admin app', 1],
    ['projects/components/', 'presentation', 1],
    ['projects/domain/', 'pure rules', 1],
    ['projects/api/', 'contracts', 1],
    ['e2e/', 'Playwright', 1],
  ];
  const cue = [0, part('tree', 0, 0.1), part('tree', 0, 0.25), part('tree', 0, 0.55), part('tree', 0, 0.72), part('tree', 0, 0.86), part('tree', 0, 0.95)];
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 680)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>frontend/ · ADR 0001</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Five projects,')}<br>${S.words(S.beat(3), '', { accent: 'one home.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(2))}>Standalone, signals, OnPush, zoneless.</p>
  </div>
  <div style="${at(860, 130, 960)};${light};padding:44px 52px">
    ${rows.map(([name, note, depth], i) => `
      <div style="display:flex;align-items:baseline;gap:28px;padding:14px 0;border-bottom:2px solid var(--palette-stone-150);padding-left:${depth * 56}px" ${S.rise(onBeat(S, cue[i]), { y: 30 })}>
        <span class="mono" style="font-size:40px;font-weight:600;${i >= 1 && i <= 5 ? 'color:var(--palette-bordeaux-700)' : ''}">${esc(name)}</span>
        <span style="margin-left:auto;font-size:30px;color:var(--palette-stone-600)">${esc(note)}</span>
      </div>`).join('')}
  </div>
  </div>`;
});

// ── Act 2: the rules it keeps ───────────────────────────────────────────────────────────────────
Film.scene('direction', (S) => {
  const box = (x, y, w, label, when) =>
    `<div style="${at(x, y, w)};${card};height:120px;display:flex;align-items:center;justify-content:center;background:var(--palette-stone-0);color:var(--palette-stone-950);font:italic 600 58px/1 var(--font-family-display);text-transform:uppercase" ${pop(S, when)}>${label}</div>`;
  const libs = onBeat(S, part('direction', 0, 0.3));
  const types = onBeat(S, part('direction', 0, 0.55));
  const fails = onBeat(S, said('direction', 1));
  // Arrows from the apps (top) to the libraries (bottom), and from components and domain to api.
  const arrow = (x1, y1, x2, y2, when, dash = '') =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--palette-borealis-300)" stroke-width="7" ${dash} marker-end="url(#head)" ${S.ref((el, t) => { el.style.opacity = enter(t, when, 0.4); })}/>`;
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 90, 700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Dependency direction · ADR 0002</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'One')}<br>${S.words(S.beat(2.5), '', { accent: 'direction.' })}</h1>
  </div>
  <svg width="1920" height="1080" style="position:absolute;left:0;top:0">
    <defs><marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--palette-borealis-300)"/></marker></defs>
    ${arrow(1060, 250, 960, 560, libs)}${arrow(1100, 250, 1300, 560, libs)}${arrow(1140, 250, 1600, 560, libs)}
    ${arrow(1480, 250, 1000, 560, libs)}${arrow(1520, 250, 1330, 560, libs)}${arrow(1560, 250, 1640, 560, libs)}
    ${arrow(1440, 620, 1512, 620, types)}
    <path d="M970,680 V770 H1650 V692" fill="none" stroke="var(--palette-borealis-300)" stroke-width="7" stroke-dasharray="18 12" marker-end="url(#head)" ${S.ref((el, t) => { el.style.opacity = enter(t, types, 0.4); })}/>
  </svg>
  ${box(930, 130, 340, 'web', S.beat(1))}${box(1360, 130, 340, 'admin', S.beat(1.5))}
  ${box(820, 560, 300, 'components', libs)}${box(1180, 560, 260, 'domain', libs + S.BEAT / 2)}${box(1520, 560, 260, 'api', libs + S.BEAT)}
  <p class="kicker" style="${at(990, 790, 700)};color:var(--palette-borealis-300)" ${S.rise(types)}>components → api: import type only</p>
  <div style="${at(110, 870, 1700)};${terminal};font-size:26px" ${pop(S, fails, -0.5)}>
    <span style="color:var(--palette-bordeaux-300)">error</span>  There is no policy allowing dependencies from elements of type "api" to elements of type "domain"  <span style="color:var(--palette-stone-400)">boundaries/dependencies</span>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('boot', (S) => {
  const dark = onBeat(S, said('boot', 1));
  return `
  <div class="fill field--blush">
  <div style="${at(110, 100, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-038 · AC6</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'Both apps')}<br>${S.words(S.beat(2.5), '', { accent: 'boot.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(2))}>A title, and one <span class="mono" style="font-size:36px">&lt;main&gt;</span>.</p>
  </div>
  ${browser('shots/web-xl-light.png', { width: 1000, title: 'Christian Fitness', url: 'localhost:4310', style: at(800, 90, 1000), attrs: arrive(S, 0.2, -1.5, 6) })}
  ${browser('shots/admin-xl-dark.png', { width: 860, theme: 'dark', title: 'Christian Fitness Admin', url: 'localhost:4311', style: at(980, 520, 860), attrs: arrive(S, dark, 1.5, 8) })}
  ${phone('shots/web-xs-light.png', { width: 250, style: at(640, 560, 250), attrs: arrive(S, S.bar(1.5), -4, -10) })}
  </div>`;
}, { before: 0.3 });

Film.scene('foundations', (S) => {
  const swatches = [
    ['--palette-bordeaux-700', 'bordeaux', true],
    ['--palette-borealis-300', 'borealis', false],
    ['--palette-bordeaux-50', 'blush', false],
    ['--palette-stone-950', 'ink', true],
    ['--palette-stone-50', 'canvas', false],
  ];
  const fonts = onBeat(S, part('foundations', 0, 0.45));
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 100, 760)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Foundations · tokens.css</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Brand,')}<br>${S.words(S.beat(2.5), '', { accent: 'built in.' })}</h1>
  </div>
  <div style="${at(110, 560, 820)};display:flex;gap:22px">
    ${swatches.map(([tok, name, dark], i) => `<div style="flex:1;height:230px;${card};background:var(${tok});color:${dark ? 'var(--palette-stone-0)' : 'var(--palette-stone-950)'};display:flex;align-items:flex-end;padding:18px;font:600 24px/1 var(--font-family-sans);outline:2px solid var(--palette-stone-200)" ${pop(S, S.beat(3 + i * 0.5))}>${name}</div>`).join('')}
  </div>
  <div style="${at(1000, 150, 820)};${light};padding:56px 60px" ${pop(S, fonts, 1)}>
    <p style="margin:0;font:italic 600 120px/0.95 var(--font-family-display);text-transform:uppercase;color:var(--palette-bordeaux-700)">Barlow Condensed</p>
    <p style="margin:36px 0 0;font:500 46px/1.3 var(--font-family-sans)">Barlow, for every word of the apps.</p>
    <p class="kicker" style="margin-top:44px;color:var(--palette-stone-600)">Self-hosted woff2 · no font server</p>
  </div>
  </div>`;
});

// ── Act 3: what it guards ───────────────────────────────────────────────────────────────────────
Film.scene('budget', (S) => {
  const grow = onBeat(S, part('budget', 0, 0.3));
  const fill = (t) => ease.out(prog(t, grow, 1.4));
  const width = 1500;
  const x = (kb) => (kb / 260) * width;
  return `
  <div class="fill field--borealis">
  <div style="${at(110, 90, 900)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-035 · angular.json budgets</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Lazy by')} ${S.words(S.beat(2.5), '', { accent: 'default.' })}</h1>
  </div>
  <p class="figure" style="${at(1060, 70, 800)};text-align:right" ${S.rise(grow)}>212<span style="font-size:120px"> kB</span></p>
  <div style="${at(210, 520, width)};height:110px;border-radius:var(--radius-full);background:rgb(255 255 255 / 0.55);overflow:hidden">
    <div style="height:100%;background:var(--palette-bordeaux-700);border-radius:var(--radius-full)" ${S.ref((el, t) => { el.style.width = `${x(212.29) * fill(t)}px`; })}></div>
  </div>
  ${[[220, 'warning 220 kB'], [250, 'error 250 kB']].map(([kb, label], i) => `
    <div style="position:absolute;left:${210 + x(kb)}px;top:480px;width:6px;height:190px;background:var(--palette-stone-950)" ${S.rise(grow + S.BEAT * (2 + i))}></div>
    <p class="kicker" style="position:absolute;left:${210 + x(kb) - 150}px;top:${i ? 700 : 420}px;width:300px;text-align:center" ${S.rise(grow + S.BEAT * (2 + i))}>${label}</p>`).join('')}
  <p class="lede" style="${at(210, 800, 1500)}" ${S.rise(grow + S.BAR * 1.5)}>Initial total of each app · every route through <span class="mono" style="font-size:36px">loadComponent</span></p>
  </div>`;
}, { before: 0.3 });

Film.scene('fixture', (S) => {
  const items = [
    ['An unanswered request', '/api/** and /hubs/** come from handlers'],
    ['A request off localhost', 'blocked before it leaves'],
    ['A page error', 'uncaught, or logged by the app'],
  ];
  const cue = [part('fixture', 0, 0.5), part('fixture', 0, 0.68), part('fixture', 0, 0.85)].map((t) => onBeat(S, t));
  return `
  <div class="fill field--ink">
  <div style="${at(110, 100, 760)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>e2e/fixtures/test.ts</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'No backend.')}<br>${S.words(S.beat(3), 'Nothing', { accent: 'slips.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.bar(2))}>Each fails the spec.</p>
  </div>
  <div style="${at(940, 170, 880)}">
    ${items.map(([title, note], i) => `
      <div style="${light};display:flex;align-items:center;gap:32px;margin-bottom:34px;padding:34px 40px" ${S.rise(cue[i], { y: 50 })}>
        <span style="flex:none;width:76px;height:76px;border-radius:50%;background:var(--palette-bordeaux-700);color:var(--palette-stone-0);font:700 44px/76px var(--font-family-sans);text-align:center">✕</span>
        <span><span style="display:block;font:700 42px/1.15 var(--font-family-sans)">${title}</span><span style="display:block;margin-top:8px;font:500 28px/1.3 var(--font-family-sans);color:var(--palette-stone-600)">${note}</span></span>
      </div>`).join('')}
  </div>
  </div>`;
});

Film.scene('proof', (S) => {
  const green = onBeat(S, part('proof', 0, 0.8));
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Red,')}<br>${S.words(S.beat(2), 'then', { accent: 'green.' })}</h1>
  </div>
  <div style="${at(860, 170, 960)};${terminal}" ${pop(S, S.beat(1), -1)}>
    <div>Expected: <span style="color:var(--palette-green-300)">"Christian Fitness"</span></div>
    <div>Received: <span style="color:var(--palette-bordeaux-300)">"Web"</span></div>
    <div style="margin-top:22px">Expected: <span style="color:var(--palette-green-300)">"Christian Fitness Admin"</span></div>
    <div>Received: <span style="color:var(--palette-bordeaux-300)">"Admin"</span></div>
  </div>
  <div style="${at(960, 640, 860)};${terminal};font-size:34px" ${pop(S, green, 1)}>
    <div><span style="color:var(--palette-green-300)">✓</span> [web] Member app boots</div>
    <div><span style="color:var(--palette-green-300)">✓</span> [admin] Admin app boots</div>
    <div style="margin-top:14px;color:var(--palette-green-300)">2 passed</div>
  </div>
  </div>`;
}, { before: 0.3 });

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
wipeInto('direction', 'var(--palette-borealis-300)');
wipeInto('budget', 'var(--palette-bordeaux-700)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
