// Video 54 · Slice 27.1: Flag and suspend. Eleven scenes on a 120 BPM grid (one bar is two seconds).
// The pictures are screenshots of the running admin app from shots.ts, through the page object
// and the shared fixture; the requests the dialog sent are the ones the fixture recorded; the
// API's refusals and what a suspension ends are drawn from what the API tests assert; the counts and the bundle
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
// ── Act 1: flag ─────────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 27.1 · Flag and suspend</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Always with')}<br>${S.words(S.beat(3), '', { accent: 'a reason.' })}</h1>
  </div>
  ${browser('shots/admin-moderate-suspend-xl-light.png', { width: 860, title: TITLE, url: url('/members'), style: at(960, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/admin-moderate-flagged-xs-light.png', { width: 250, style: at(840, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('rows', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-029 · AC1 · AC9</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One action,')}<br>${S.words(S.beat(2.5), '', { accent: 'one note.' })}</h1>
  </div>
  ${browser('shots/admin-members-xl-light.png', { width: 1000, title: TITLE, url: url('/members'), style: at(840, 110, 1000), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/admin-members-flagged-row.png', 110, 700, 1200, pop(S, onBeat(S, part('rows', 0, 0.5)), -1))}
  </div>
`, { before: 0.3 });

Film.scene('flag', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>moderate-member · default</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Flag,')}<br>${S.words(S.beat(2.5), '', { accent: 'the milder step.' })}</h1>
  </div>
  <div style="${at(110, 600, 660)};${terminal};font-size:22px" ${pop(S, onBeat(S, part('flag', 0, 0.6)))}>
    <div style="${dim}">POST ${esc(C.flag.path)}</div>
    <div>{ "note": <span style="${green}">"${esc(C.flag.body.note)}"</span> }</div>
  </div>
  ${browser('shots/admin-moderate-flag-xl-light.png', { width: 980, title: TITLE, url: url('/members'), style: at(840, 150, 980), attrs: arrive(S, 0.2, 1, 6) })}
  </div>
`);

Film.scene('flagged', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>admin-toast · member-flagged</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Flagged,')}<br>${S.words(S.beat(2.5), '', { accent: 'and noted.' })}</h1>
  </div>
  ${browser('shots/admin-members-after-flag-xl-light.png', { width: 1000, title: TITLE, url: url('/members'), style: at(840, 110, 1000), attrs: arrive(S, 0.2, 1, 6) })}
  ${closeUp('shots/admin-flagged-toast.png', 110, 480, 560, pop(S, S.beat(3), -1))}
  ${closeUp('shots/admin-members-priya-flagged-row.png', 110, 760, 1200, pop(S, onBeat(S, part('flagged', 0, 0.5)), 1))}
  </div>
`);

// ── Act 2: suspend ──────────────────────────────────────────────────────────────────────────────
Film.scene('suspend', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-029 · AC2 · moderate-member · suspend</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Suspend')}<br>${S.words(S.beat(2.5), '', { accent: 'asks twice.' })}</h1>
  </div>
  <div style="${at(110, 620, 660)};${terminal};font-size:22px" ${pop(S, onBeat(S, part('suspend', 0, 0.55)))}>
    <div style="${dim}">POST ${esc(C.suspend.path)}</div>
    <div>{ "note": <span style="${green}">"${esc(C.suspend.body.note)}"</span>,</div>
    <div>&nbsp;&nbsp;"confirmed": <span style="${green}">${C.suspend.body.confirmed}</span> }</div>
  </div>
  ${browser('shots/admin-moderate-suspend-xl-light.png', { width: 980, title: TITLE, url: url('/members'), style: at(840, 150, 980), attrs: arrive(S, 0.2, 1, 6) })}
  </div>
`, { before: 0.3 });

Film.scene('invalid', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>L2-029 · AC5 · moderate-member · invalid</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Two things')}<br>${S.words(S.beat(2.5), '', { accent: 'to fix.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(onBeat(S, part('invalid', 0, 0.5)))}>The summary takes focus.<br>Nothing is sent.</p>
  </div>
  ${browser('shots/admin-moderate-invalid-xl-light.png', { width: 980, title: TITLE, url: url('/members'), style: at(840, 120, 980), attrs: arrive(S, 0.2, 1, 6) })}
  </div>
`);

Film.scene('ends', (S) => {
  const later = onBeat(S, part('ends', 0, 0.55));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>ADR 0023 · the API tests</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Every session')}<br>${S.words(S.beat(2.5), '', { accent: 'ends.' })}</h1>
  </div>
  <div style="${at(800, 130, 1020)};${terminal};font-size:24px" ${pop(S, S.beat(2))}>
    <div style="${dim}">one save</div>
    <div>status <span style="${green}">suspended</span> · the note kept</div>
    <div>sessions, member app and admin app: <span style="${green}">removed</span></div>
    <div>an admin sign-in waiting for its code: <span style="${green}">removed</span></div>
  </div>
  <div style="${at(800, 560, 1020)};${terminal};font-size:24px" ${pop(S, later)}>
    <div style="${dim}">afterwards, with the right password</div>
    <div>POST /api/session <span style="${rose}">403</span> <span style="${green}">"account_suspended"</span></div>
    <div>POST /api/admin/session <span style="${rose}">403</span> <span style="${green}">"account_suspended"</span></div>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('who', (S) => {
  const rows = [
    ['their own account', '403', 'cannot_moderate_self'],
    ['a Moderator, on staff', '403', 'forbidden_role'],
    ['a status that moved', '409', 'status_conflict'],
    ['nobody with that id', '404', 'member_not_found'],
  ];
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-029 · AC4 · AC6 · AC7</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Refused,')}<br>${S.words(S.beat(2.5), '', { accent: 'by code.' })}</h1>
  </div>
  <div style="${at(800, 170, 1020)};${terminal};font-size:28px">
    ${rows.map(([what, status, code], i) => `
      <div style="margin-bottom:22px" ${S.rise(S.beat(2 + i), { y: 30 })}>
        <span style="${dim}">${esc(what)}</span><br><span style="${rose}">${status}</span> <span style="${green}">"${code}"</span>
      </div>`).join('')}
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
  <div style="${at(110, 110, 720)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Red,')}<br>${S.words(S.beat(2), 'then', { accent: 'green.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>Admin first load ${C.build.raw} kB of 290.<br>The dialog, ${C.build.dialog} kB, loads on the first Moderate.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 27.2</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Then,')} ${S.words(S.beat(2), '', { accent: 'reinstate.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${chip('Flagged', 'var(--palette-bordeaux-700)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(2.5))}>${chip('Suspended', 'var(--palette-stone-950)', 'var(--palette-stone-0)')}</span>
    <span ${pop(S, S.beat(3))}>${chip('Active again', 'var(--palette-stone-0)', 'var(--palette-stone-950)')}</span>
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
wipeInto('suspend', 'var(--palette-bordeaux-700)');
wipeInto('proof', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
