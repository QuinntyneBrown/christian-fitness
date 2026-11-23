// Video 55 · Slice 1.4: Design-system primitives and form controls. Ten scenes on a 120 BPM grid
// (one bar is two seconds). The app pictures are screenshots of the running member app from
// shots.ts, through the page objects and the shared fixture: the two library components screens
// already use, the text field (now composed of the form field) and the button. No screen uses
// the other components until slice 1.6, so they are drawn here from their design-system pages,
// with the attributes their component tests assert. The counts and the initial totals are what the
// runners and the build printed (shots/captures.js). Every position is a pure function of the
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
const closeUp = (src, x, y, w, attrs, bg = light) =>
  `<div style="${at(x, y, w)};${bg};padding:28px" ${attrs}><img src="${src}" style="display:block;width:100%;height:auto"></div>`;
const dim = 'color:var(--palette-stone-400)';
const green = 'color:var(--palette-green-300)';
const url = (path) => `localhost:4310${path}`;

// ── Drawn parts, after their design-system pages ───────────────────────────────────────────────
const brand = 'var(--palette-bordeaux-700)';
const ink = 'var(--palette-stone-950)';
const paper = 'var(--palette-stone-0)';
const line = 'var(--palette-stone-300)';
const btn = (text, bg, fg, border = bg, extra = '') =>
  `<span style="display:inline-flex;align-items:center;gap:12px;padding:18px 34px;border-radius:var(--radius-full);background:${bg};color:${fg};border:3px solid ${border};font:600 30px/1 var(--font-family-sans);white-space:nowrap;${extra}">${text}</span>`;
const pill = (text, bg, fg, border = bg) =>
  `<span style="display:inline-block;padding:12px 24px;border-radius:var(--radius-full);background:${bg};color:${fg};border:2px solid ${border};font:600 26px/1 var(--font-family-sans);white-space:nowrap">${esc(text)}</span>`;
/** An attribute the component tests assert, in a mono tag under its part. */
const attr = (text) => `<div style="margin-top:14px;font:500 22px/1.2 var(--font-family-mono);color:var(--palette-stone-500)">${esc(text)}</div>`;
const panel = (x, y, w, inner, attrs) => `<div style="${at(x, y, w)};${light};padding:36px 40px" ${attrs}>${inner}</div>`;
const box = (checked) =>
  `<span style="display:inline-grid;place-items:center;width:40px;height:40px;border-radius:8px;border:3px solid ${checked ? brand : ink};background:${checked ? brand : paper};color:${paper};font:700 28px/1 var(--font-family-sans)">${checked ? '✓' : ''}</span>`;
const radio = (on) =>
  `<span style="display:inline-grid;place-items:center;width:40px;height:40px;border-radius:50%;border:3px solid ${on ? brand : ink}"><span style="width:20px;height:20px;border-radius:50%;background:${on ? brand : 'transparent'}"></span></span>`;
const toggle = (on) =>
  `<span style="display:inline-block;position:relative;width:76px;height:42px;border-radius:21px;background:${on ? brand : line}"><span style="position:absolute;top:5px;left:${on ? 39 : 5}px;width:32px;height:32px;border-radius:50%;background:${paper}"></span></span>`;
const row = (control, text) =>
  `<div style="display:flex;align-items:center;gap:20px;font:500 30px/1.2 var(--font-family-sans);margin-top:18px">${control}<span>${esc(text)}</span></div>`;
const avatar = (initials, bg, size = 88) =>
  `<span style="display:inline-grid;place-items:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:${paper};font:700 ${size * 0.38}px/1 var(--font-family-sans);border:4px solid ${paper}">${esc(initials)}</span>`;

// ── Act 1: built once ──────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 260, 820)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 1.4 · Design-system primitives</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Built once,')}<br>${S.words(S.beat(3), '', { accent: 'used everywhere.' })}</h1>
  </div>
  ${browser('shots/web-sign-in-xl-light.png', { width: 860, title: 'Sign in · Christian Fitness', url: url('/sign-in'), style: at(980, 150, 860), attrs: arrive(S, S.beat(2), 2, 9) })}
  ${phone('shots/web-sign-in-xs-light.png', { width: 250, style: at(860, 560, 250), attrs: arrive(S, S.beat(4), -4, -10) })}
  </div>
`);

Film.scene('why', (S) => {
  const names = ['button', 'link', 'text-field', 'textarea', 'select', 'checkbox', 'radio-group', 'switch', 'form-field', 'form-layout', 'chip', 'badge', 'avatar', 'divider', 'spinner', 'progress-bar', 'tooltip', 'skip-link', 'brand-lockup'];
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-038 · AC7 · ADR 0018</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One name,')}<br>${S.words(S.beat(2.5), '', { accent: 'one component.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(onBeat(S, part('why', 0, 0.55)))}>components/src/&lt;name&gt;</p>
  </div>
  <div style="${at(820, 150, 1000)};display:flex;flex-wrap:wrap;gap:20px">
    ${names.map((n, i) => `<span ${pop(S, 0.4 + i * 0.12)}>${pill(n, i % 3 === 0 ? brand : paper, i % 3 === 0 ? paper : ink, i % 3 === 0 ? brand : line)}</span>`).join('')}
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('actions', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>cf-button · cf-link</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Eight variants,')}<br>${S.words(S.beat(2.5), '', { accent: 'five sizes.' })}</h1>
  </div>
  ${panel(110, 520, 700, `
    <div style="display:flex;flex-wrap:wrap;gap:18px">
      ${btn('Register', brand, paper)}${btn('Save draft', paper, ink, ink)}${btn('Cancel', 'transparent', ink, 'transparent')}${btn('Delete', 'var(--palette-red-700, #a4161a)', paper)}
    </div>
    <div style="margin-top:26px;font:500 30px/1.3 var(--font-family-sans)"><span style="color:${brand};text-decoration:underline">Community guidelines ↗</span></div>
    ${attr('external → target=_blank, "(opens in a new tab)"')}`, pop(S, S.beat(2), -1))}
  ${closeUp('shots/web-sign-in-busy.png', 980, 110, 640, pop(S, onBeat(S, part('actions', 0, 0.55)), 1))}
  <div style="${at(980, 790, 820)};font:500 26px/1.3 var(--font-family-mono);color:var(--palette-stone-700)" ${S.rise(onBeat(S, part('actions', 0, 0.7)))}>aria-busy="true" · a second press does nothing</div>
  </div>
`, { before: 0.3 });

// ── Act 2: form controls ───────────────────────────────────────────────────────────────────────
Film.scene('fields', (S) => `
  <div class="fill field--borealis">
  <div style="${at(110, 120, 660)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>cf-form-field · cf-text-field</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Label, hint')}<br>${S.words(S.beat(2.5), '', { accent: 'and error.' })}</h1>
  </div>
  ${closeUp('shots/web-join-password-error.png', 110, 500, 660, pop(S, S.beat(2), -1))}
  <div style="${at(110, 820, 760)};${terminal};font-size:24px;padding:22px 30px" ${pop(S, onBeat(S, part('fields', 0, 0.6)))}>
    <div>aria-invalid="true"</div>
    <div>aria-describedby=<span style="${green}">"${esc(C.describedBy)}"</span></div>
  </div>
  ${browser('shots/web-join-invalid-xl-light.png', { width: 760, title: 'Join · Christian Fitness', url: url('/join'), style: at(900, 180, 760), attrs: arrive(S, 0.2, 1, 6) })}
  ${phone('shots/web-join-invalid-xs-light.png', { width: 230, style: at(1640, 420, 230), attrs: arrive(S, S.beat(3), 4, 10) })}
  </div>
`, { before: 0.3 });

Film.scene('choices', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Checkbox · radio · switch · interest</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'State as')}<br>${S.words(S.beat(2.5), '', { accent: 'attributes.' })}</h1>
  </div>
  ${panel(110, 520, 560, `${row(box(true), 'Email me reminders')}${row(box(false), 'Text me reminders')}${attr('checked · indeterminate · aria-invalid')}`, pop(S, S.beat(2), -1))}
  ${panel(760, 200, 520, `${row(radio(true), 'Beginner')}${row(radio(false), 'Intermediate')}${attr('every radio aria-invalid with the error')}`, pop(S, S.beat(2.5), 1))}
  ${panel(760, 600, 520, `${row(toggle(true), 'Show my profile')}${attr('role="switch" · aria-busy while saving')}`, pop(S, S.beat(3), -1))}
  ${panel(1360, 380, 460, `<div style="display:flex;flex-wrap:wrap;gap:14px">${pill('✓ Running', brand, paper)}${pill('Strength', paper, ink, line)}${pill('✓ Yoga', brand, paper)}</div>${attr('aria-pressed="true"')}`, pop(S, S.beat(3.5), 1))}
  </div>
`, { before: 0.3 });

Film.scene('display', (S) => `
  <div class="fill field--blush">
  <div style="${at(110, 120, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Chip · badge · avatar · divider</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Say it')}<br>${S.words(S.beat(2.5), '', { accent: 'in words.' })}</h1>
  </div>
  ${panel(110, 520, 760, `<div style="display:flex;flex-wrap:wrap;gap:14px">${pill('All', ink, paper)}${pill('Runs', paper, ink, line)}${pill('Workouts', paper, ink, line)}${pill('Retreats', paper, ink, line)}</div>${attr('role="group" · aria-current="page"')}`, pop(S, S.beat(2), -1))}
  ${panel(960, 200, 420, `<div style="display:flex;gap:14px;flex-wrap:wrap">${pill('Active', 'var(--palette-green-100, #dcfce7)', 'var(--palette-green-800, #166534)')}${pill('Flagged', 'var(--palette-amber-100, #fef3c7)', 'var(--palette-amber-800, #92400e)')}</div><div style="margin-top:22px">${pill('99+', brand, paper)}</div>${attr('aria-label="140 unread"')}`, pop(S, S.beat(2.5), 1))}
  ${panel(960, 600, 520, `<div style="display:flex">${avatar('GT', brand)}<span style="margin-left:-22px">${avatar('DO', 'var(--palette-borealis-700, #0f5d5e)')}</span><span style="margin-left:-22px">${avatar('MA', ink)}</span><span style="margin-left:-22px">${avatar('+4', 'var(--palette-stone-500)')}</span></div>${attr('photo fails → initials')}`, pop(S, onBeat(S, part('display', 0, 0.6)), -1))}
  </div>
`, { before: 0.3 });

Film.scene('feedback', (S) => `
  <div class="fill field--ink">
  <div style="${at(110, 120, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Spinner · progress · tooltip · skip link</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Wait, show,')}<br>${S.words(S.beat(2.5), '', { accent: 'skip.' })}</h1>
  </div>
  <div style="${at(110, 500, 760)};${terminal};font-size:26px" ${pop(S, S.beat(2))}>
    <div style="${dim}">cf-spinner</div><div>appears after <span style="${green}">300 ms</span></div>
    <div style="${dim};margin-top:14px">cf-progress-bar</div><div>role="progressbar" · aria-valuenow="60"</div>
  </div>
  ${panel(960, 200, 820, `<div style="display:flex;align-items:center;gap:24px"><span style="display:inline-grid;place-items:center;width:64px;height:64px;border-radius:50%;background:${brand};color:${paper};font:700 30px/1 var(--font-family-sans)">➤</span><span style="padding:14px 22px;border-radius:12px;background:${ink};color:${paper};font:600 26px/1 var(--font-family-sans)">Send message <span style="opacity:.7">Enter</span></span></div>${attr('role="tooltip" · Escape hides, focus stays')}`, pop(S, onBeat(S, part('feedback', 0, 0.35)), 1))}
  ${panel(960, 560, 820, `<span style="display:inline-block;padding:16px 26px;border-radius:12px;background:${ink};color:${paper};font:600 28px/1 var(--font-family-sans);outline:4px solid var(--palette-borealis-300);outline-offset:4px">Skip to content</span>${attr('focuses <main> · no reload')}`, pop(S, onBeat(S, part('feedback', 0, 0.7)), -1))}
  </div>
`, { before: 0.3 });

// ── Act 3: what it proves ───────────────────────────────────────────────────────────────────────
Film.scene('proof', (S) => {
  const rows = [
    [`${C.unit.components} component tests in ${C.unit.componentFiles} files`, 'ng test components'],
    [`${C.unit.domain} domain tests`, 'ng test domain'],
    [`${C.specs.tests} Playwright tests`, C.specs.command],
  ];
  return `
  <div class="fill field--ink">
  <div style="${at(110, 110, 700)}">
    <p class="kicker" style="color:var(--palette-borealis-300)" ${S.rise(S.beat(1))}>Seen to fail first</p>
    <h1 class="headline" style="margin-top:24px">${S.words(S.beat(1.5), 'Red,')}<br>${S.words(S.beat(2), 'then', { accent: 'green.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(S.beat(4))}>First load: member ${C.build.web} kB,<br>admin ${C.build.admin} kB. Unchanged.</p>
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
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slices 1.5 and 1.6</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Then the')} ${S.words(S.beat(2), '', { accent: 'screens.' })}</h1>
  </div>
  <div style="${at(110, 520, 1700)};display:flex;flex-wrap:wrap;gap:26px">
    <span ${pop(S, S.beat(2))}>${pill('Alerts, dialogs, cards, tables', paper, ink, line)}</span>
    <span ${pop(S, S.beat(2.5))}>${pill('Layout, navigation, every screen moved', brand, paper)}</span>
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
wipeInto('fields', 'var(--palette-bordeaux-700)');
wipeInto('proof', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
