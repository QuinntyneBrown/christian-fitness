// Video 13 · Slice 29.2: Audit staff changes. Eleven scenes on a 120 BPM grid (one bar is two
// seconds). The slice has no screen of its own: the pictures are screenshots of the running admin
// app's code screen, Dashboard and Sign out from shots.ts, through the page objects and the shared
// fixture, and the backend's words are what its runners printed (shots/captures.js): the audit
// tests that passed, the totals and the migration's columns. The pipeline is drawn. Every position
// is a pure function of the scene's time (docs/videos/README.md).
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
const closeUp = (src, x, y, w, attrs, bg = light, pad = 28) =>
  `<div style="${at(x, y, w)};${bg};padding:${pad}px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4311${path}`;

/** An audit entry as the table holds it: the field names of AuditEntry and one row's shape. */
const entry = (S, when, action, x, y, w, tilt = 0) => `
  <div style="${at(x, y, w)};${terminal};font-size:26px" ${pop(S, when, tilt)}>
    <div style="${dim}">AuditEntries</div>
    <div style="margin-top:12px"><span style="${dim}">ActorMemberId </span>${esc(C.session.name)}'s id</div>
    <div><span style="${dim}">Action        </span><span style="${green}">${esc(action)}</span></div>
    <div><span style="${dim}">RecordType    </span>StaffSession</div>
    <div><span style="${dim}">RecordId      </span>the same id</div>
    <div><span style="${dim}">OccurredAt    </span>server clock</div>
  </div>`;

// ── Act 1: what is audited ──────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 29.2 · Audit staff changes</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Every change,')}<br>${S.words(S.beat(3), '', { accent: 'on record.' })}</h1>
  </div>
  <div style="${at(120, 640, 820)};display:flex;flex-wrap:wrap;gap:22px">
    <span ${pop(S, onBeat(S, part('hook', 0, 0.45)))}>${chip('who', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, onBeat(S, part('hook', 0, 0.6)))}>${chip('what', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, onBeat(S, part('hook', 0, 0.75)))}>${chip('which record', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, onBeat(S, part('hook', 0, 0.92)))}>${chip('when', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
  </div>
  ${browser('shots/admin-dashboard-xl-dark.png', { width: 840, title: 'Dashboard · Christian Fitness Admin', url: url('/'), style: at(980, 220, 840), attrs: arrive(S, S.beat(2), 2, 9) })}
  </div>
`);

Film.scene('signin', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-019 · AC3 · staff_session.started</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Signed in,')}<br>${S.words(S.beat(2.5), '', { accent: 'written down.' })}</h1>
  </div>
  ${browser('shots/admin-code-xl-light.png', { width: 760, title: 'Enter your code · Christian Fitness Admin', url: url('/sign-in/verify'), style: at(110, 470, 760), attrs: arrive(S, S.beat(1), -1, -6) })}
  ${phone('shots/admin-dashboard-xs-light.png', { width: 230, style: at(940, 300, 230), attrs: arrive(S, onBeat(S, part('signin', 0, 0.35)), 3, 10) })}
  ${entry(S, onBeat(S, part('signin', 0, 0.45)), 'staff_session.started', 1230, 300, 620, -1)}
  </div>
`, { before: 0.3 });

Film.scene('signout', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>staff_session.ended</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Signed out,')}<br>${S.words(S.beat(2.5), '', { accent: 'too.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('signout', 0, 0.55)))}>${esc(C.session.name)}, ${esc(C.session.role)}, read before the session ends.</p>
  </div>
  ${browser('shots/admin-dashboard-xl-light.png', { width: 840, title: 'Dashboard · Christian Fitness Admin', url: url('/'), style: at(900, 150, 840), attrs: arrive(S, 0.2, 1, 6) })}
  ${entry(S, onBeat(S, part('signout', 0, 0.4)), 'staff_session.ended', 1080, 640, 640, 1)}
  </div>
`);

Film.scene('refused', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 660)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Refused · no entry</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'No change,')}<br>${S.words(S.beat(2.5), '', { accent: 'no entry.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(onBeat(S, part('refused', 0, 0.5)))}>${esc(C.wrongCode.error)}</p>
  </div>
  ${browser('shots/admin-wrong-code-xl-light.png', { width: 900, title: 'Enter your code · Christian Fitness Admin', url: url('/sign-in/verify'), style: at(880, 200, 900), attrs: arrive(S, 0.2, -1, -6) })}
  </div>
`, { before: 0.3 });

// ── Act 2: how ──────────────────────────────────────────────────────────────────────────────────
Film.scene('pipeline', (S) => {
  const steps = [
    ['Controller', 'sends one request'],
    ['Validation', 'refuses bad input'],
    ['AuditBehavior', 'opens the trail'],
    ['Handler', 'Record(who, record)'],
    ['Database', 'change + entry'],
  ];
  const step = (i) => onBeat(S, part('pipeline', 0, 0.1 + i * 0.17));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 1700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>IAuditableCommand · AuditTrail · ADR 0021</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One step,')} ${S.words(S.beat(2.5), '', { accent: 'every command.' })}</h1>
  </div>
  <div style="${at(110, 470, 1700)};display:flex;gap:28px;align-items:stretch">
    ${steps.map(([title, what], i) => `
      <div style="flex:1;${light};padding:34px 26px;${i === 2 ? 'outline:6px solid var(--palette-borealis-300);outline-offset:6px' : ''}" ${pop(S, step(i))}>
        <div style="font:700 34px/1.1 var(--font-family-sans)">${esc(title)}</div>
        <div style="margin-top:16px;font:500 26px/1.3 var(--font-family-mono);color:var(--palette-stone-600)">${esc(what)}</div>
      </div>`).join('')}
  </div>
  <p class="lede" style="${at(110, 800, 1700)};color:var(--palette-stone-100)" ${S.rise(onBeat(S, part('pipeline', 0, 0.85)))}>Saved together, in one commit.</p>
  </div>`;
}, { before: 0.3 });

Film.scene('forget', (S) => {
  // The test runner cuts a case's name at 50 characters; each row is found by its start.
  const cases = [
    ['records and leaves the sa', 'records; the behaviour saves', '1 entry', green],
    ['records, then saves with', 'records, then saves its change', '1 entry', green],
    ['refused after recording', 'refused after recording', 'no entry', rose],
    ['refused before recording', 'refused before recording', 'no entry', rose],
    ['names no record', 'names no record', 'fails', rose],
    ['not auditable', 'not auditable', 'passes', dim],
  ];
  const rows = cases.filter(([found]) => C.backend.behaviour.some((row) => row.includes(found)));
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>AuditBehaviorTests</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Forget,')}<br>${S.words(S.beat(2.5), '', { accent: 'and fail.' })}</h1>
  </div>
  <div style="${at(760, 190, 1060)};${terminal};font-size:30px;line-height:1.7">
    ${rows.map(([, text, label, colour], i) => `
      <div style="display:flex;justify-content:space-between;gap:24px;${text === 'names no record' ? 'font-weight:700' : ''}" ${S.rise(S.beat(1.5 + i * 0.5), { y: 16 })}><span><span style="${green}">✓</span> ${esc(text)}</span><span style="${colour};white-space:nowrap">${label}</span></div>`).join('')}
  </div>
  </div>`;
});

Film.scene('table', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>${esc(C.table.command)}</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Identifiers')}<br>${S.words(S.beat(2.5), '', { accent: 'only.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('table', 0, 0.6)))}>No name, no email, no field values.</p>
  </div>
  <div style="${at(800, 180, 1020)};${terminal};font-size:28px">
    <div style="${dim}">CREATE TABLE "AuditEntries" (</div>
    ${C.table.columns.map((col, i) => `<div style="white-space:pre" ${S.rise(S.beat(1.5 + i * 0.5), { y: 16 })}>  ${esc(col)}</div>`).join('')}
    <div style="${dim}">);</div>
  </div>
  </div>
`);

Film.scene('telemetry', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-033 · AC2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'The action,')}<br>${S.words(S.beat(2.5), '', { accent: 'nothing more.' })}</h1>
  </div>
  <div style="${at(860, 220, 960)};${terminal};font-size:28px" ${pop(S, S.beat(1.5))}>
    <div style="${dim}">log</div>
    <div>Staff change <span style="${green}">{AuditAction}</span> audited</div>
    <div style="margin-top:28px;${dim}">attributes</div>
    <div><span style="${green}">AuditAction</span> = staff_session.started</div>
    <div style="margin-top:28px" ${S.rise(onBeat(S, part('telemetry', 0, 0.55)), { y: 16 })}><span style="${rose}">✕</span> member id   <span style="${rose}">✕</span> email</div>
    <div ${S.rise(onBeat(S, part('telemetry', 0, 0.75)), { y: 16 })}><span style="${rose}">✕</span> name        <span style="${rose}">✕</span> record</div>
  </div>
  </div>
`, { before: 0.3 });

// ── Act 3: what it proves ───────────────────────────────────────────────────────────────────────
Film.scene('proof', (S) => {
  const rows = [
    [`${C.backend.acceptance.length} audit acceptance tests`, 'StaffAuditTests, through the API'],
    [`${C.backend.behaviour.length} behaviour cases`, 'AuditBehaviorTests, one per row'],
    [`${C.backend.passed} backend tests`, C.backend.command],
  ];
  return `
  <div class="fill field--ink">
  <div style="${at(110, 110, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Red,')}<br>${S.words(S.beat(2), 'then', { accent: 'green.' })}</h1>
  </div>
  <div style="${at(860, 200, 960)};${terminal};font-size:34px">
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · every staff command</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'One marker,')} ${S.words(S.beat(2), '', { accent: 'one call.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('event.created', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('IAuditableCommand', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('audit.Record(…)', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('pipeline', 'var(--palette-bordeaux-700)');
wipeInto('proof', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
