// Video 12 · Slice 29.1: Admin and Moderator roles. Ten scenes on a 120 BPM grid (one bar is two
// seconds). The pictures are screenshots of the running admin app from shots.ts, through the page
// objects and the shared fixture; the API's answers are the rows the API tests passed, and the
// counts and the initial total are what the runners and the build printed (shots/captures.js).
// Every position is a pure function of the scene's time (docs/videos/README.md).
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
/** A close-up of the top of a tall shot, cropped to `h` pixels, on a dark card. */
const cropped = (src, x, y, w, h, attrs) =>
  `<div style="${at(x, y, w)};height:${h}px;overflow:hidden;${card};background:var(--palette-stone-950)" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
/** A close-up shot on a card. */
const closeUp = (src, x, y, w, attrs, bg = light, pad = 28) =>
  `<div style="${at(x, y, w)};${bg};padding:${pad}px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:16px 28px;border-radius:var(--radius-full);background:${bg};color:${fg};font:600 36px/1 var(--font-family-mono);white-space:nowrap">${esc(text)}</span>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const rose = 'color:var(--palette-bordeaux-300)';
const url = (path) => `localhost:4311${path}`;
const status = { OK: '200', NoContent: '204', Forbidden: '403' };

// ── Act 1: what a Moderator sees ────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 29.1 · Admin and Moderator roles</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Two roles,')}<br>${S.words(S.beat(3), '', { accent: 'one console.' })}</h1>
  </div>
  ${browser('shots/admin-admin-xl-light.png', { width: 820, title: 'Dashboard · Christian Fitness Admin', url: url('/'), style: at(960, 120, 820), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${browser('shots/admin-moderator-xl-dark.png', { width: 700, title: 'Dashboard · Christian Fitness Admin', url: url('/'), style: at(880, 560, 700), attrs: arrive(S, S.beat(4), -2, -9) })}
  </div>
`);

Film.scene('nav', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-019 · AC5 · ${esc(C.moderator.role)}</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Only their')}<br>${S.words(S.beat(2.5), '', { accent: 'areas.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('nav', 0, 0.5)))}>${esc(C.moderator.items.join(' · '))}</p>
  </div>
  ${cropped('shots/admin-admin-sidebar.png', 760, 160, 400, 600, pop(S, S.beat(1), -2))}
  ${cropped('shots/admin-moderator-sidebar.png', 1200, 220, 400, 600, pop(S, onBeat(S, part('nav', 0, 0.2)), 2))}
  ${phone('shots/admin-moderator-xs-light.png', { width: 220, style: at(1620, 360, 220), attrs: arrive(S, S.beat(3), 4, 10) })}
  </div>
`, { before: 0.3 });

Film.scene('adminsonly', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 660)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-019 · AC5 · ADR 0020</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Admins')}<br>${S.words(S.beat(2.5), '', { accent: 'only.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('adminsonly', 0, 0.6)))}>The address bar keeps ${esc(C.adminsOnly.location)}.</p>
  </div>
  ${browser('shots/admin-admins-only-xl-light.png', { width: 900, title: C.adminsOnly.title, url: url(C.adminsOnly.location), style: at(880, 160, 900), attrs: arrive(S, 0.2, 1, 6) })}
  ${tablet('shots/admin-admins-only-m-light.png', { width: 330, style: at(520, 560, 330), attrs: arrive(S, S.beat(3), -3, -10) })}
  </div>
`, { before: 0.3 });

Film.scene('back', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Touch or keyboard · 44 px</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Back to')}<br>${S.words(S.beat(2.5), '', { accent: 'work.' })}</h1>
  </div>
  ${closeUp('shots/admin-admins-only-card.png', 110, 470, 620, pop(S, S.beat(2), -1))}
  ${browser('shots/admin-moderator-xl-light.png', { width: 760, title: 'Dashboard · Christian Fitness Admin', url: url('/'), style: at(860, 180, 760), attrs: arrive(S, onBeat(S, part('back', 0, 0.5)), 1, 6) })}
  ${phone('shots/admin-admins-only-xs-light.png', { width: 220, style: at(1640, 460, 220), attrs: arrive(S, S.beat(3), 4, 10) })}
  </div>
`);

Film.scene('demoted', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 660)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-019 · AC4</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'The next')}<br>${S.words(S.beat(2.5), '', { accent: 'move.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(onBeat(S, part('demoted', 0, 0.5)))}>No new sign-in.</p>
  </div>
  ${browser('shots/admin-admin-xl-light.png', { width: 640, title: 'Dashboard · Christian Fitness Admin', url: url('/'), style: at(800, 120, 640), attrs: arrive(S, 0.2, -1, -6) })}
  ${browser('shots/admin-demoted-xl-light.png', { width: 640, title: C.adminsOnly.title, url: url(C.demoted.location), style: at(1180, 470, 640), attrs: arrive(S, onBeat(S, part('demoted', 0, 0.45)), 2, 8) })}
  </div>
`, { before: 0.3 });

// ── Act 2: on the server ────────────────────────────────────────────────────────────────────────
Film.scene('api', (S) => {
  const rows = ['moderator.console', 'moderator.members', 'moderator.events', 'moderator.services', 'moderator.unlisted', 'admin.events']
    .map((who) => C.backend.rows.find((row) => row.who === who));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-019 · AC1 · AC4</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'A rule')}<br>${S.words(S.beat(2.5), '', { accent: 'per area.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-100)" ${S.rise(onBeat(S, part('api', 0, 0.6)))}>The role is read from the database on every request.</p>
  </div>
  <div style="${at(800, 150, 1020)};${terminal};font-size:26px">
    ${rows.map((row, i) => `
      <div style="white-space:pre" ${S.rise(S.beat(2 + i * 0.5), { y: 20 })}><span style="${dim}">${esc(row.role.padEnd(10))}</span>${esc(row.path.padEnd(28))}<span style="${row.expected === 'Forbidden' ? rose : green}">${status[row.expected]}</span></div>`).join('')}
    <div style="${dim};margin-top:20px" ${S.rise(S.beat(5.5))}>403 carries "forbidden_role"</div>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('table', (S) => {
  const areas = ['Session', 'Dashboard', 'Members', 'Events', 'Services', 'Unnamed'];
  const moderator = [true, true, true, false, false, false];
  const cell = (ok) => `<td style="padding:14px 26px;text-align:center;font:700 34px/1 var(--font-family-mono);${ok ? 'color:var(--palette-green-800)' : 'color:var(--palette-bordeaux-700)'}">${ok ? '✓ yes' : '✕ no'}</td>`;
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>StaffAccess · canManage</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One')}<br>${S.words(S.beat(2.5), '', { accent: 'table.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('table', 0, 0.6)))}>Unnamed areas stay closed to Moderators.</p>
  </div>
  <div style="${at(740, 130, 1080)};${light};padding:36px 48px" ${pop(S, S.beat(1))}>
    <table style="border-collapse:collapse;width:100%;font:500 36px/1.3 var(--font-family-sans)">
      <tr style="${dim}"><th style="text-align:left;padding:14px 0">Area</th><th>Admin</th><th>Moderator</th></tr>
      ${areas.map((area, i) => `<tr style="border-top:1px solid var(--palette-stone-200)" ${S.rise(S.beat(1.5 + i * 0.5), { y: 16 })}><td style="padding:14px 0;font-weight:600">${area}</td>${cell(true)}${cell(moderator[i])}</tr>`).join('')}
    </table>
  </div>
  </div>`;
});

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
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>Admin first load ${C.build.raw} kB of 275.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 29.2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Audit every')} ${S.words(S.beat(2), '', { accent: 'change.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('who', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('what', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('which record', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
    <span ${pop(S, S.beat(3.5))}>${chip('when', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
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
wipeInto('api', 'var(--palette-bordeaux-700)');
wipeInto('proof', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
