// Video 03 · Slice 1.3: CI pipeline. Nine scenes on a 120 BPM grid (one bar is two seconds).
// The slice has no screen and no endpoint: its system is the GitHub Actions workflow. Its pictures
// are drawn, and every job, step, second and log line in them is what GitHub said about the runs of
// pull request #4, set word for word from shots/captures.js, which shots.ts saved with
// `gh run view` (docs/videos/README.md). Every position is a pure function of the scene's time.
const { enter, ease, lerp, clamp, esc } = Film;
const C = window.FILM_CAPTURES;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;
const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which line `n` of scene `id` starts. */
const said = (id, n) => lineOf(id, n).start - Film.at(id);
/** Scene time at which the fraction `f` of line `n` has been spoken. */
const part = (id, n, f) => said(id, n) + (lineOf(id, n).end - lineOf(id, n).start) * f;
/** The same, moved to the beat at or after it. */
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;

/** Something that pops in at `when`, with a small overshoot. */
const pop = (S, when, tilt = 0) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

/** A card that slides in from the right at `when`. */
const slide = (S, when, tilt = 0) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.5);
    el.style.opacity = clamp(p * 3);
    el.style.transform = `translateX(${(1 - p) * 900}px) rotate(${lerp(4, tilt, p)}deg)`;
  });

const card = 'box-sizing:border-box;border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const light = `${card};background:var(--palette-stone-0);color:var(--palette-stone-950)`;
const terminal = `${card};background:var(--palette-stone-1000);color:var(--palette-stone-50);padding:34px 40px;font:500 28px/1.45 var(--font-family-mono)`;
const green = 'color:var(--palette-green-300)';
const red = 'color:var(--palette-bordeaux-300)';
const dim = 'color:var(--palette-stone-400)';

const job = (run, name) => run.jobs.find((j) => j.name === name);
/** The steps a person reads: the actions' own housekeeping and the empty ones left out. */
const steps = (j) => j.steps.filter((s) => !/^Run actions\/|^Read the Playwright|^Keep the Playwright/.test(s.name));
/** ✓, ✗ or –, in colours that read on a terminal or, with `onLight`, on a white card. */
const mark = (conclusion, onLight = false) =>
  conclusion === 'success'
    ? `<span style="color:var(--palette-green-${onLight ? 800 : 300})">✓</span>`
    : conclusion === 'failure'
      ? `<span style="color:var(--palette-bordeaux-${onLight ? 700 : 300})">✗</span>`
      : `<span style="${dim}">–</span>`;
const wall = (run) => Math.max(...run.jobs.map((j) => j.seconds));

/** A job's steps as GitHub listed them, one row a step, each rising at `when(i)`. */
const stepList = (S, j, when, { size = 34, onLight = false } = {}) =>
  steps(j)
    .map(
      (s, i) => `
    <div style="display:flex;gap:22px;align-items:baseline;padding:10px 0;font-size:${size}px;${s.conclusion === 'skipped' ? 'opacity:0.45' : ''}" ${S.rise(when(i), { y: 20 })}>
      ${mark(s.conclusion, onLight)}<span>${esc(s.name)}</span>
      <span style="margin-left:auto;${dim}">${s.conclusion === 'skipped' ? 'skipped' : `${s.seconds}s`}</span>
    </div>`,
    )
    .join('');

// ── Act 1: what it is ───────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 1.3 · CI pipeline</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Every change,')}<br>${S.words(S.beat(3), '', { accent: 'checked.' })}</h1>
  </div>
  <div style="${at(1080, 330, 740)};${terminal};font-size:34px" ${slide(S, S.beat(3), -1.5)}>
    <div style="${dim}">CI · pull request #4 · ${esc(C.green.sha)}</div>
    ${C.green.jobs.map((j) => `<div style="margin-top:18px">${mark(j.conclusion)} ${esc(j.name)} <span style="${dim}">· ${j.seconds}s</span></div>`).join('')}
  </div>
  </div>
`);

Film.scene('trigger', (S) => {
  const jobs = onBeat(S, part('trigger', 0, 0.35));
  const sparse = onBeat(S, part('trigger', 0, 0.62));
  const box = (y, name, folder, when) => `
    <div style="${at(1340, y, 480)};${light};padding:30px 36px" ${pop(S, when)}>
      <div style="font:italic 600 64px/1 var(--font-family-display);text-transform:uppercase;color:var(--palette-bordeaux-700)">${name}</div>
      <div class="mono" style="margin-top:16px;font-size:28px" ${S.rise(sparse)}>sparse checkout: ${folder}</div>
    </div>`;
  const arrow = (y2, when) =>
    `<path d="M 1185 540 C 1260 540, 1250 ${y2}, 1330 ${y2}" fill="none" stroke="var(--palette-bordeaux-700)" stroke-width="7" marker-end="url(#to)" ${S.ref((el, t) => { el.style.opacity = enter(t, when, 0.4); })}/>`;
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-042 · AC1, AC4 · ci.yml</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Two jobs,')}<br>${S.words(S.beat(3), '', { accent: 'side by side.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('trigger', 0, 0.85)))}>Read-only token. No secret, no backend, no database.</p>
  </div>
  <div style="${at(720, 440, 460)};${terminal};font-size:30px;padding:30px 34px" ${pop(S, S.beat(2), -1)}>
    <div style="${dim}">on:</div><div>push → main</div><div>pull_request → main</div>
  </div>
  <svg width="1920" height="1080" style="position:absolute;left:0;top:0">
    <defs><marker id="to" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--palette-bordeaux-700)"/></marker></defs>
    ${arrow(330, jobs)}${arrow(750, jobs + S.BEAT / 2)}
  </svg>
  ${box(230, 'Frontend', 'frontend/', jobs)}${box(650, 'Backend', 'backend/', jobs + S.BEAT / 2)}
  </div>`;
});

// ── Act 2: what each job does ───────────────────────────────────────────────────────────────────
Film.scene('frontend', (S) => {
  const fe = job(C.green, 'Frontend');
  const specs = onBeat(S, said('frontend', 1));
  const list = steps(fe);
  return `
  <div class="fill field--borealis">
  <div style="${at(110, 110, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Job · Frontend · Node 24</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'Lint to')}<br>${S.words(S.beat(2.5), '', { accent: 'specs.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(specs)}>Chromium only. Every request answered by the shared fixture.</p>
  </div>
  <div style="${at(880, 180, 940)};${terminal};font-size:34px">
    <div style="${dim};font-size:26px">run ${C.green.id} · ${fe.seconds}s</div>
    ${stepList(S, fe, (i) => (list[i].name === 'Behaviour specs' ? specs : S.beat(1 + i * 0.75)))}
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('backend', (S) => {
  const be = job(C.green, 'Backend');
  const tests = onBeat(S, part('backend', 0, 0.45));
  const list = steps(be);
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Job · Backend · .NET 10</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'Warnings are')}<br>${S.words(S.beat(2.5), '', { accent: 'errors.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('backend', 0, 0.8)))}>EF Core InMemory. No real database.</p>
  </div>
  <div style="${at(880, 170, 940)};${terminal};font-size:36px" ${slide(S, S.beat(0.5), -1)}>
    <div style="${dim};font-size:26px">run ${C.green.id} · ${be.seconds}s</div>
    ${stepList(S, be, (i) => (list[i].name === 'Acceptance tests' ? tests : S.beat(1 + i * 0.75)))}
    <div style="margin-top:22px;font-size:24px;${green}" ${S.rise(tests + S.BEAT)}>${esc(C.green.passed.find((p) => p.startsWith('Passed!')))}</div>
  </div>
  </div>`;
});

Film.scene('fast', (S) => {
  const cold = job(C.cold, 'Frontend').seconds;
  const warm = wall(C.green);
  const limit = 300;
  const scale = 1480 / limit;
  const bar = (y, label, seconds, when, color) => `
    <div style="${at(110, y, 1700)}" ${S.rise(when)}>
      <div style="display:flex;align-items:baseline;gap:24px"><span class="kicker" style="color:var(--palette-stone-600)">${label}</span></div>
      <div style="display:flex;align-items:center;gap:30px;margin-top:14px">
        <div style="height:70px;border-radius:var(--radius-md);background:${color}" ${S.ref((el, t) => { el.style.width = `${seconds * scale * enter(t, when, 0.8, ease.outExpo)}px`; })}></div>
        <span style="font:italic 600 88px/1 var(--font-family-display)">${seconds}s</span>
      </div>
    </div>`;
  const warmAt = onBeat(S, part('fast', 0, 0.45));
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 90, 1500)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-042 · AC3 · npm, NuGet, Chromium cached</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Under')} ${S.words(S.beat(2.5), '', { accent: 'five minutes.' })}</h1>
  </div>
  ${bar(400, 'First run, cold caches', cold, S.beat(3), 'var(--palette-stone-400)')}
  ${bar(600, 'Both jobs, warm caches', warm, warmAt, 'var(--palette-bordeaux-700)')}
  <div style="position:absolute;left:${110 + limit * scale}px;top:370px;height:420px;border-left:6px dashed var(--palette-bordeaux-700)" ${S.rise(onBeat(S, part('fast', 0, 0.8)))}>
    <span class="kicker accent" style="position:absolute;left:-150px;top:440px;width:300px;text-align:center">timeout · 300s</span>
  </div>
  </div>`;
}, { before: 0.3 });

// ── Act 3: seen to fail ─────────────────────────────────────────────────────────────────────────
Film.scene('lint', (S) => {
  const fe = job(C.lint, 'Frontend');
  const why = onBeat(S, part('lint', 0, 0.5));
  return `
  <div class="fill field--ink">
  <div style="${at(110, 110, 680)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-042 · AC2 · run ${C.lint.id}</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'Broken')}<br>${S.words(S.beat(2.5), '', { accent: 'on purpose.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(why + S.BAR)}>Then reverted. A throwaway commit, never merged.</p>
  </div>
  <div style="${at(850, 110, 970)};${light};padding:28px 40px;font:500 30px/1.4 var(--font-family-mono)" ${pop(S, S.beat(1), -0.5)}>
    <div class="kicker" style="color:var(--palette-stone-600)">Frontend · ${fe.seconds}s · ${esc(C.lint.sha)}</div>
    ${stepList(S, fe, (i) => S.beat(1.5 + i * 0.25), { size: 28, onLight: true })}
  </div>
  <div style="${at(850, 680, 970)};${terminal};font-size:26px;outline:2px solid var(--palette-stone-600)" ${pop(S, why, 0.5)}>
    ${C.lint.said.map((l) => `<div style="${l.text.includes('error') ? red : dim}">${esc(l.text)}</div>`).join('')}
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('more', (S) => {
  const spec = C.specAndTest.said.filter((l) => l.step === 'Behaviour specs');
  const test_ = C.specAndTest.said.filter((l) => l.step !== 'Behaviour specs');
  const w = onBeat(S, part('more', 0, 0.1));
  const s = onBeat(S, part('more', 0, 0.25));
  const t_ = onBeat(S, part('more', 0, 0.4));
  const head = (job_, step) => `<div class="kicker" style="${dim};margin-bottom:10px">${esc(job_)} › ${esc(step)} ${mark('failure')}</div>`;
  return `
  <div class="fill field--blush">
  <div style="${at(110, 110, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-042 · AC2 · no retries</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Each fails')}<br>${S.words(S.beat(2.5), '', { accent: 'where it breaks.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('more', 0, 0.75)))}>Every other step of the job is skipped.</p>
  </div>
  <div style="${at(800, 90, 1030)};${terminal};font-size:22px" ${pop(S, w, -1)}>
    ${head('Backend', C.warning.said[0].step)}<div style="${red}">${esc(C.warning.said[0].text)}</div>
  </div>
  <div style="${at(800, 390, 1030)};${terminal};font-size:26px" ${pop(S, s, 0.8)}>
    ${head('Frontend', 'Behaviour specs')}${spec.map((l) => `<div style="${l.text.startsWith('Expected') ? green : red}">${esc(l.text)}</div>`).join('')}
  </div>
  <div style="${at(800, 690, 1030)};${terminal};font-size:22px" ${pop(S, t_, -0.6)}>
    ${head('Backend', test_[0].step)}${test_.map((l) => `<div style="${l.text.startsWith('Expected') ? green : red}">${esc(l.text)}</div>`).join('')}
  </div>
  </div>`;
});

Film.scene('green', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 760)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Reverted · run ${C.green.id}</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Green')}<br>${S.words(S.beat(2), '', { accent: 'again.' })}</h1>
  </div>
  ${C.green.jobs
    .map(
      (j, i) => `
    <div style="${at(960, 180 + i * 360, 840)};${light};padding:40px 52px;display:flex;align-items:center;gap:40px" ${pop(S, S.beat(1.5 + i), i ? 1 : -1)}>
      <span style="font:italic 600 150px/1 var(--font-family-display);${'color:var(--palette-green-800)'}">✓</span>
      <div><div style="font:italic 600 84px/1 var(--font-family-display);text-transform:uppercase">${esc(j.name)}</div>
      <div class="mono" style="margin-top:12px;font-size:30px;color:var(--palette-stone-600)">${j.conclusion} · ${j.seconds}s</div></div>
    </div>`,
    )
    .join('')}
  </div>
`, { before: 0.3 });

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
wipeInto('frontend', 'var(--palette-bordeaux-700)');
wipeInto('lint', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
