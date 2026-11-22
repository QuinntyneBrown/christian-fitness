// Video 02 · Slice 1.2: Backend skeleton. Nine scenes on a 120 BPM grid (one bar is two seconds).
// The slice has no screen, so its pictures are drawn: the projects and their direction, the codes,
// the span's tags. What the running backend said is set word for word from shots/captures.js,
// which shots.ts saved from the API and the cf command line (docs/videos/README.md). Every
// position is a pure function of the scene's time.
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

/** A captured answer of the API: the request, the status line and the body, as it was said. */
const answer = (c, { bodyStyle = '' } = {}) => `
  <div style="${dim}">$ curl localhost:4312${esc(c.request.slice(4))}</div>
  <div style="margin-top:10px;${c.status < 400 ? green : red}">HTTP ${c.status} ${esc(c.statusText)} <span style="${dim}">· ${esc(c.contentType)}</span></div>
  <div style="margin-top:14px;${bodyStyle}">${esc(c.body)}</div>`;

// ── Act 1: what it is ───────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 1.2 · Backend skeleton</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'One API.')}<br>${S.words(S.beat(3), '', { accent: 'Closed by default.' })}</h1>
  </div>
  <div style="${at(1080, 330, 740)};${terminal}" ${slide(S, S.beat(3), -1.5)}>
    <div style="${dim}">${esc(C.live.request)}</div>
    <div style="${green}">${C.live.status} ${esc(C.live.body)}</div>
    <div style="margin-top:26px;${dim}">GET /api/members/me</div>
    <div style="${red}">${C.refused.status} ${esc(JSON.parse(C.refused.body).code)}</div>
  </div>
  </div>
`);

Film.scene('layers', (S) => {
  const box = (x, y, w, name, note, when, strong = false) => `
    <div style="${at(x, y, w)};${light};height:150px;padding:26px 34px;${strong ? 'outline:6px solid var(--palette-bordeaux-700)' : ''}" ${pop(S, when)}>
      <div style="font:italic 600 58px/1 var(--font-family-display);text-transform:uppercase;color:var(--palette-bordeaux-700)">${name}</div>
      <div style="margin-top:14px;font:500 26px/1.2 var(--font-family-sans);color:var(--palette-stone-600)">${note}</div>
    </div>`;
  const domain = onBeat(S, part('layers', 0, 0.18));
  const application = onBeat(S, part('layers', 0, 0.36));
  const infrastructure = onBeat(S, part('layers', 0, 0.56));
  const top = onBeat(S, part('layers', 0, 0.78));
  const arrow = (x1, y1, x2, y2, when) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--palette-bordeaux-700)" stroke-width="7" marker-end="url(#down)" ${S.ref((el, t) => { el.style.opacity = enter(t, when, 0.4); })}/>`;
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>backend/ · clean architecture</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Five projects,')}<br>${S.words(S.beat(3), '', { accent: 'one direction.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(2))}>.NET 10 · MediatR · FluentValidation · EF Core on PostgreSQL (ADR 0004)</p>
  </div>
  <svg width="1920" height="1080" style="position:absolute;left:0;top:0">
    <defs><marker id="down" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--palette-bordeaux-700)"/></marker></defs>
    ${arrow(1090, 252, 1220, 330, top)}${arrow(1630, 252, 1500, 330, top)}
    ${arrow(1360, 482, 1360, 562, infrastructure)}${arrow(1360, 714, 1360, 794, application)}
  </svg>
  ${box(880, 100, 420, 'Api', 'health · ProblemDetails · telemetry', top, true)}${box(1420, 100, 420, 'Cli', 'cf migrate · cf seed', top + S.BEAT / 2, true)}
  ${box(1000, 330, 720, 'Infrastructure', 'EF Core · Npgsql · migrations · PBKDF2 hasher', infrastructure)}
  ${box(1000, 562, 720, 'Application', 'IAppDbContext · seeds · MediatR · validators', application)}
  ${box(1000, 794, 720, 'Domain', 'Member · StaffRole · no dependencies', domain)}
  </div>`;
});

// ── Act 2: what it answers ──────────────────────────────────────────────────────────────────────
Film.scene('health', (S) => {
  const ready = onBeat(S, part('health', 0, 0.55));
  return `
  <div class="fill field--borealis">
  <div style="${at(110, 100, 720)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-040 · AC2 · anonymous</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'Status,')}<br>${S.words(S.beat(2.5), '', { accent: 'nothing more.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, said('health', 1)))}>No database ran here: readiness says so, and not why.</p>
  </div>
  <div style="${at(900, 150, 920)};${terminal}" ${pop(S, S.beat(2), -1)}>${answer(C.live, { bodyStyle: `font-size:64px;line-height:1.1;${green}` })}</div>
  <div style="${at(900, 580, 920)};${terminal}" ${pop(S, ready, 1)}>${answer(C.ready, { bodyStyle: `font-size:64px;line-height:1.1;${red}` })}</div>
  </div>`;
}, { before: 0.3 });

Film.scene('fallback', (S) => {
  const body = JSON.parse(C.refused.body);
  const json = Object.entries(body).map(([key, value]) => {
    const strong = key === 'code';
    return `<div style="padding-left:28px;${strong ? 'background:rgb(255 255 255 / 0.08);border-radius:8px' : ''}"><span style="${dim}">"${esc(key)}":</span> <span style="${strong ? red + ';font-weight:700' : ''}">${esc(JSON.stringify(value))}</span></div>`;
  }).join('');
  const code = onBeat(S, part('fallback', 0, 0.55));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 100, 640)}">
    <p class="kicker" ${S.rise(S.beat(1))}>L2-031 · AC1 · fallback policy</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'Closed by')}<br>${S.words(S.beat(2.5), '', { accent: 'default.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(code)}>No session: 401, never a redirect, even where no endpoint is.</p>
  </div>
  <div style="${at(770, 150, 1090)};${terminal};font-size:23px" ${slide(S, S.beat(1), -1)}>
    <div style="${dim}">$ curl 'localhost:4312${esc(C.refused.request.slice(4))}'</div>
    <div style="margin-top:12px;${red}">HTTP ${C.refused.status} ${esc(C.refused.statusText)} <span style="${dim}">· ${esc(C.refused.contentType)}</span></div>
    <div style="margin-top:18px;word-break:break-all" ${S.rise(code)}>{${json}}</div>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('errors', (S) => {
  const rows = [
    ['401', 'unauthenticated', 'no session'],
    ['403', 'forbidden', 'no right to it'],
    ['404', 'not_found', 'nothing there'],
    ['500', 'server_error', 'no message, no stack trace'],
  ];
  const last = onBeat(S, part('errors', 0, 0.25));
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 720)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-032 · AC2, AC4 · ProblemCodes</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Every error,')}<br>${S.words(S.beat(2), '', { accent: 'a code.' })}</h1>
  </div>
  <div style="${at(900, 150, 920)};${light};padding:30px 48px">
    ${rows.map(([status, code, note], i) => `
      <div style="display:flex;align-items:baseline;gap:34px;padding:22px 0;${i < 3 ? 'border-bottom:2px solid var(--palette-stone-150)' : ''}" ${S.rise(i < 3 ? S.beat(0.5 + i * 0.5) : last, { y: 30 })}>
        <span style="font:italic 600 76px/1 var(--font-family-display);${i === 3 ? 'color:var(--palette-bordeaux-700)' : ''}">${status}</span>
        <span class="mono" style="font-size:38px;font-weight:600">${code}</span>
        <span style="margin-left:auto;font:500 26px/1.2 var(--font-family-sans);color:var(--palette-stone-600)">${note}</span>
      </div>`).join('')}
  </div>
  <p class="lede" style="${at(900, 840, 920)}" ${S.rise(last + S.BAR)}>Always <span class="mono" style="font-size:34px">application/problem+json</span>.</p>
  </div>`;
});

// ── Act 3: what it keeps, and how it ships ──────────────────────────────────────────────────────
Film.scene('telemetry', (S) => {
  // The tags ASP.NET Core instrumentation set on the span of GET /health?email=…&token=…, as the
  // test printed them with the redaction processor taken out.
  const tags = [
    ['http.request.method', 'GET', true],
    ['server.address', 'localhost', false],
    ['url.scheme', 'http', false],
    ['url.path', '/health', false],
    ['url.query', '?email=Redacted&token=Redacted', false],
    ['network.protocol.version', '1.1', false],
    ['http.route', '/health', true],
    ['http.response.status_code', '200', true],
  ];
  const drop = onBeat(S, said('telemetry', 1));
  return `
  <div class="fill field--ink">
  <div style="${at(110, 100, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-040 · AC1 · L2-033 · AC2</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(2), 'Route,')}<br>${S.words(S.beat(2.5), '', { accent: 'not URL.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(drop + S.BAR)}>An allow-list: a new tag is dropped until someone says it is safe.</p>
  </div>
  <div style="${at(880, 110, 940)};${light};padding:34px 44px">
    <p class="kicker" style="color:var(--palette-stone-600)">span · GET /health</p>
    ${tags.map(([key, value, kept], i) => `
      <div style="display:flex;gap:24px;align-items:baseline;padding:14px 0;border-bottom:2px solid var(--palette-stone-150)" ${S.rise(S.beat(1 + i * 0.25), { y: 20 })}>
        <span class="mono" style="font-size:30px;font-weight:600;${kept ? 'color:var(--palette-bordeaux-700)' : ''}" ${kept ? '' : S.ref((el, t) => { const p = enter(t, drop + (i % 4) * 0.08, 0.3); el.style.opacity = lerp(1, 0.28, p); el.style.textDecoration = p > 0.5 ? 'line-through' : 'none'; })}>${esc(key)}</span>
        <span class="mono" style="margin-left:auto;font-size:26px;color:var(--palette-stone-600)" ${kept ? '' : S.ref((el, t) => { el.style.opacity = lerp(1, 0.28, enter(t, drop, 0.3)); })}>${esc(value)}</span>
      </div>`).join('')}
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('migrate', (S) => {
  const seed = onBeat(S, part('migrate', 0, 0.45));
  const twice = onBeat(S, part('migrate', 0, 0.78));
  return `
  <div class="fill field--blush">
  <div style="${at(110, 100, 680)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-041 · cf, the command line</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Migrate,')}<br>${S.words(S.beat(2.5), 'then', { accent: 'seed.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>The API never migrates on startup.</p>
  </div>
  <div style="${at(820, 90, 1010)};${terminal};font-size:19px;white-space:pre" ${pop(S, S.beat(1), -0.5)}><span style="${dim}">$ ${esc(C.usage.command)}</span>
${esc(C.usage.output)}</div>
  <div style="${at(820, 520, 1010)};${terminal};font-size:24px" ${pop(S, seed, 0.5)}>
    <div style="${dim}">$ ${esc(C.seedMissing.command)}</div>
    <div style="${red}">${esc(C.seedMissing.output)}</div>
    <div style="${dim}">exit ${C.seedMissing.exit} · nothing written</div>
  </div>
  <div style="${at(110, 700, 680)};${light};padding:30px 40px" ${pop(S, twice, -1)}>
    <p class="kicker" style="color:var(--palette-stone-600)">SeedRunnerTests · L2-041 AC2</p>
    <div style="display:flex;gap:40px;margin-top:18px;align-items:baseline">
      <span style="font:500 30px/1.2 var(--font-family-sans)">First run</span><span style="font:italic 600 88px/1 var(--font-family-display);color:var(--palette-bordeaux-700)">1</span>
      <span style="font:500 30px/1.2 var(--font-family-sans);margin-left:24px">Second</span><span style="font:italic 600 88px/1 var(--font-family-display)">0</span>
    </div>
  </div>
  </div>`;
});

Film.scene('proof', (S) => {
  const green_ = onBeat(S, part('proof', 0, 0.6));
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Red,')}<br>${S.words(S.beat(2), 'then', { accent: 'green.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(green_)}>Each rule broken on purpose, watched failing, then restored.</p>
  </div>
  <div style="${at(840, 140, 980)};${terminal};font-size:26px" ${pop(S, S.beat(1), -1)}>
    <div style="${dim}">/health</div><div>Expected: <span style="${green}">OK</span> · Actual: <span style="${red}">NotFound</span></div>
    <div style="margin-top:16px;${dim}">/api/members/me, no session</div><div>Expected: <span style="${green}">Unauthorized</span> · Actual: <span style="${red}">NotFound</span></div>
    <div style="margin-top:16px;${dim}">seed twice, key check taken out</div><div>Expected: <span style="${green}">0</span> · Actual: <span style="${red}">1</span></div>
  </div>
  <div style="${at(960, 650, 860)};${terminal};font-size:32px" ${pop(S, green_, 1)}>
    <div><span style="${green}">Passed!</span> 8 · Application.Tests</div>
    <div><span style="${green}">Passed!</span> 13 · Api.Tests</div>
    <div style="margin-top:12px;${green}">21 passed · EF Core InMemory</div>
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
const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => Film.prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('health', 'var(--palette-bordeaux-700)');
wipeInto('telemetry', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
