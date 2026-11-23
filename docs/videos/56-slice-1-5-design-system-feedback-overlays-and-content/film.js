// Video 56 · Slice 1.5: Design-system feedback, overlays and content. Nine scenes on a 120 BPM
// grid (one bar is two seconds). No screen uses the new components yet (slice 1.6 moves the
// screens onto them), so the film draws them in the design system's tokens, with the words and
// roles the components render. Every count, total and test line is what the commands said, set
// word for word from shots/captures.js, which shots.ts saved (docs/videos/README.md). Every
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
const dim = 'color:var(--palette-stone-400)';
const sans = (size, weight = 500) => `font:${weight} ${size}px/1.3 var(--font-family-sans)`;
/** A role or attribute the component renders, as a small mono tag. */
const tag = (text, S, when) =>
  `<span class="mono" style="display:inline-block;margin-top:14px;padding:6px 14px;border-radius:var(--radius-sm);background:var(--palette-stone-950);color:var(--palette-stone-50);font-size:24px" ${S.rise(when, { y: 12 })}>${esc(text)}</span>`;

// ── Act 1: what it is ───────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--ink">${S.aurora((t) => enter(t, 0, 1.2) * 0.6)}
  <div style="${at(120, 280, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Slice 1.5 · Feedback, overlays, content</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Built once,')}<br>${S.words(S.beat(3), '', { accent: 'reused.' })}</h1>
  </div>
  <div style="${at(1180, 330, 640)};${terminal};font-size:34px" ${slide(S, S.beat(3), -1.5)}>
    <div style="${dim}">@cf/components</div>
    <div style="margin-top:18px">${C.library.built.length} <span style="${dim}">new components</span></div>
    <div style="margin-top:10px">${C.library.exports} <span style="${dim}">exports in public-api.ts</span></div>
  </div>
  </div>
`);

Film.scene('catalogue', (S) => {
  const reuse = onBeat(S, said('catalogue', 1));
  const cols = 3;
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 120, 620)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>L2-048 · docs/design-system/components</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Twenty-one')}<br>${S.words(S.beat(2.5), '', { accent: 'components.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(reuse)}>Each under its design-system name. No duplicates.</p>
  </div>
  <div style="${at(790, 90, 1040)};display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px">
    ${C.library.built
      .map(
        (name, i) => `<div class="mono" style="${light};padding:20px 22px;font-size:27px;box-shadow:inset 0 0 0 2px var(--palette-stone-200)" ${pop(S, S.beat(1.5) + i * 0.12)}><span style="color:var(--palette-bordeaux-700)">cf-</span>${esc(name)}</div>`,
      )
      .join('')}
  </div>
  </div>`;
}, { before: 0.3 });

// ── Act 2: what they do ─────────────────────────────────────────────────────────────────────────
Film.scene('feedback', (S) => {
  const status = onBeat(S, part('feedback', 0, 0.55));
  const toasts = onBeat(S, said('feedback', 1));
  return `
  <div class="fill field--borealis">
  <div style="${at(110, 110, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Alert · banner · toast</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Heard,')}<br>${S.words(S.beat(2.5), '', { accent: 'not just seen.' })}</h1>
  </div>
  <div style="${at(820, 100, 1000)};${light};padding:30px 36px;background:var(--palette-bordeaux-50);color:var(--palette-bordeaux-800)" ${pop(S, S.beat(1.5), -0.6)}>
    <div style="${sans(34, 700)}">Check 2 fields</div>
    <div style="${sans(28)};margin-top:8px;text-decoration:underline">Enter your email address</div>
    <div style="${sans(28)};text-decoration:underline">Choose a date</div>
    ${tag('role="alert" · takes focus', S, S.beat(2.5))}
  </div>
  <div style="${at(820, 430, 1000)};${light};padding:26px 36px;background:var(--palette-green-50);color:var(--palette-green-950)" ${pop(S, status, 0.5)}>
    <div style="${sans(32, 700)}">Your profile is saved.</div>
    ${tag('role="status"', S, status + S.BEAT / 2)}
  </div>
  <div style="${at(110, 560, 640)};display:flex;flex-direction:column;gap:18px">
    <div style="${light};padding:22px 28px" ${slide(S, toasts)}>
      <div style="${sans(30, 700)}">You’re registered</div>
      <div style="${sans(24)};color:var(--palette-stone-600)">Open chat</div>
    </div>
    <div style="${light};padding:22px 28px;box-shadow:inset 6px 0 0 var(--palette-bordeaux-700),0 30px 60px -24px rgb(0 0 0 / 0.35)" ${slide(S, toasts + S.BEAT)}>
      <div style="${sans(30, 700)}">We couldn’t register you</div>
      <div style="${sans(24)};color:var(--palette-stone-600)">Try again</div>
    </div>
    <div ${S.rise(toasts + S.BEAT * 2)}>${tag('one polite status region · an alert per failure', S, toasts + S.BEAT * 2)}</div>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('overlays', (S) => {
  const menuAt = onBeat(S, said('overlays', 1));
  const items = ['Edit event', 'Duplicate', 'Cancel event'];
  const keys = ['↓', '↑', 'Home', 'End', 'Esc'];
  // The roving focus walks down the items as the keys are named.
  const focusOf = (t) => Math.min(items.length - 1, Math.max(0, Math.floor((t - menuAt - S.BEAT) / S.BEAT)));
  return `
  <div class="fill field--bordeaux">
  <div style="${at(110, 110, 640)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Dialog · drawer · menu</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Overlays that')}<br>${S.words(S.beat(2.5), '', { accent: 'return focus.' })}</h1>
  </div>
  <div style="${at(110, 560, 700)};${light};padding:0;overflow:hidden" ${pop(S, S.beat(1.5), -0.8)}>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:26px 32px;border-bottom:2px solid var(--palette-stone-200)">
      <span style="${sans(34, 700)}">Edit profile</span><span style="${sans(34)};color:var(--palette-stone-600)">✕</span>
    </div>
    <div style="padding:26px 32px;${sans(26)};color:var(--palette-stone-600)">Body projected by the screen</div>
    <div style="padding:0 32px 28px">${tag('h2 id → CDK ariaLabelledBy', S, S.beat(2.5))}</div>
  </div>
  <div style="${at(960, 120, 860)}">
    <div style="${light};display:inline-flex;gap:14px;align-items:center;padding:18px 28px;${sans(32, 600)}" ${pop(S, menuAt)}>Actions ▾</div>
    <div style="${light};margin-top:14px;padding:12px 0;width:520px" ${pop(S, menuAt + S.BEAT / 2)}>
      ${items
        .map(
          (item, i) => `<div style="padding:18px 30px;${sans(32)};${i === 2 ? 'color:var(--palette-bordeaux-700)' : ''}" ${S.ref((el, t) => {
            const on = t >= menuAt + S.BEAT && focusOf(t) === i;
            el.style.background = on ? 'var(--palette-stone-150)' : 'transparent';
            el.style.outline = on ? '4px solid var(--palette-borealis-800)' : 'none';
            el.style.outlineOffset = '-4px';
          })}>${esc(item)}</div>`,
        )
        .join('')}
    </div>
    <div style="display:flex;gap:14px;margin-top:30px">
      ${keys.map((k, i) => `<span class="mono" style="padding:12px 20px;border-radius:var(--radius-md);background:var(--palette-stone-0);color:var(--palette-stone-950);font-size:30px;box-shadow:0 6px 0 var(--palette-stone-400)" ${pop(S, menuAt + S.BEAT * (1 + i * 0.5))}>${k}</span>`).join('')}
    </div>
    <div style="margin-top:6px">${tag('role="menu" · roving tabindex', S, menuAt + S.BEAT * 4)}</div>
  </div>
  </div>`;
});

Film.scene('content', (S) => {
  const table = onBeat(S, said('content', 1));
  const page = (n, current) =>
    `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:64px;height:64px;border-radius:999px;${sans(28, 600)};${current ? 'background:var(--palette-stone-950);color:var(--palette-stone-0)' : 'color:var(--palette-stone-600)'}">${n}</span>`;
  const rows = [
    ['Easter Sunrise 5K', 'Sat, Apr 18', '142 / 200'],
    ['Saturday Park Bootcamp', 'Sat, Apr 25', '38 / 40'],
  ];
  return `
  <div class="fill field--canvas">
  <div style="${at(110, 110, 640)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Pagination · tabs · table</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Real links,')}<br>${S.words(S.beat(2.5), '', { accent: 'real tables.' })}</h1>
  </div>
  <div style="${at(840, 90, 980)};${light};padding:24px 32px" ${pop(S, S.beat(1.5), -0.5)}>
    <div style="display:flex;gap:44px;border-bottom:2px solid var(--palette-stone-200);${sans(30, 600)}">
      <span style="padding-bottom:14px;border-bottom:5px solid var(--palette-bordeaux-700)">All <span style="color:var(--palette-stone-500)">5</span></span>
      <span style="padding-bottom:14px;color:var(--palette-stone-500)">Published 3</span>
      <span style="padding-bottom:14px;color:var(--palette-stone-500)">Drafts 2</span>
    </div>
    ${tag('aria-current="page"', S, S.beat(2.5))}
  </div>
  <div style="${at(840, 330, 980)};${light};padding:22px 32px;display:flex;align-items:center;gap:8px" ${pop(S, S.beat(2.5), 0.4)}>
    ${page('‹')}${page(1)}${page(2, true)}${page(3)}<span style="${sans(28)};color:var(--palette-stone-500);padding:0 10px">…</span>${page(8)}${page('›')}
    <span class="mono" style="margin-left:auto;font-size:24px;color:var(--palette-stone-600)">href="?page=2"</span>
  </div>
  <div style="${at(110, 560, 1710)};${light};padding:0;overflow:hidden" ${slide(S, table, 0)}>
    <div style="padding:22px 36px 0;${sans(30, 700)}">Events <span class="mono" style="font-size:22px;color:var(--palette-stone-500);font-weight:500">&lt;caption&gt;</span></div>
    <div style="display:grid;grid-template-columns:2fr 1.2fr 1fr 0.6fr;padding:16px 36px;border-bottom:2px solid var(--palette-stone-200);${sans(24, 600)};color:var(--palette-stone-600)">
      <span>Event</span><span>Date</span><span>Registered</span><span style="text-align:right"><span class="mono" style="font-size:20px">th scope="col"</span></span>
    </div>
    ${rows
      .map(
        (r, i) => `<div style="display:grid;grid-template-columns:2fr 1.2fr 1fr 0.6fr;padding:20px 36px;${i ? 'border-top:2px solid var(--palette-stone-150);' : ''}${sans(28)}" ${S.rise(table + S.BEAT * (1 + i * 0.5))}>
          <span style="font-weight:600">${esc(r[0])}</span><span>${esc(r[1])}</span><span class="mono">${esc(r[2])}</span><span style="text-align:right;color:var(--palette-bordeaux-700);font-weight:600">Edit</span></div>`,
      )
      .join('')}
  </div>
  </div>`;
}, { before: 0.3 });

// ── Act 3: proven ───────────────────────────────────────────────────────────────────────────────
Film.scene('tests', (S) => {
  const pass = onBeat(S, said('tests', 1));
  const broken = [
    'danger alert → role="status"',
    'menu chooses a disabled item',
    'ArrowDown stops at the last item',
    '90% no longer nearly full',
    'composer sends untrimmed text',
    'focus between toasts resumes timers',
  ];
  return `
  <div class="fill field--ink">
  <div style="${at(110, 110, 700)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Vitest · TestBed · ADR 0017</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Proven')}<br>${S.words(S.beat(2.5), '', { accent: 'through the page.' })}</h1>
    <p class="lede" style="margin-top:40px;color:var(--palette-stone-300)" ${S.rise(onBeat(S, part('tests', 0, 0.55)))}>Roles, names, focus, keys, outputs.</p>
  </div>
  <div style="${at(880, 110, 940)};${terminal};font-size:32px" ${slide(S, S.beat(1), -1)}>
    <div style="${dim};font-size:26px">$ ng test components</div>
    ${C.tests.summary.map((line, i) => `<div style="margin-top:14px;${green}" ${S.rise(pass + i * S.BEAT / 2)}>✓ ${esc(line)}</div>`).join('')}
  </div>
  <div style="${at(880, 470, 940)};${light};padding:26px 36px" ${pop(S, pass + S.BEAT, 0.5)}>
    <div class="kicker" style="color:var(--palette-stone-600)">Broken on purpose · test went red</div>
    ${broken.map((b, i) => `<div class="mono" style="margin-top:12px;font-size:26px" ${S.rise(pass + S.BEAT * (1.5 + i * 0.5), { y: 12 })}><span style="color:var(--palette-bordeaux-700)">✗</span> ${esc(b)}</div>`).join('')}
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('budget', (S) => {
  const limit = 275;
  const scale = 1100 / 300;
  const bar = (y, label, value, when) => `
    <div style="${at(110, y, 1700)}" ${S.rise(when)}>
      <span class="kicker" style="color:var(--palette-stone-600)">${label}</span>
      <div style="display:flex;align-items:center;gap:30px;margin-top:14px">
        <div style="height:70px;border-radius:var(--radius-md);background:var(--palette-bordeaux-700)" ${S.ref((el, t) => { el.style.width = `${value * scale * enter(t, when, 0.8, ease.outExpo)}px`; })}></div>
        <span style="position:absolute;left:1260px;font:italic 600 80px/1 var(--font-family-display)">${value} kB</span>
      </div>
    </div>`;
  return `
  <div class="fill field--blush">
  <div style="${at(110, 90, 1500)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Initial total · production build</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Nothing')} ${S.words(S.beat(2.5), '', { accent: 'grew.' })}</h1>
  </div>
  ${bar(400, 'Member app · unchanged', C.bundles.web, S.beat(3))}
  ${bar(620, 'Admin app · unchanged', C.bundles.admin, S.beat(4))}
  <div style="position:absolute;left:${110 + limit * scale}px;top:370px;height:420px;border-left:6px dashed var(--palette-bordeaux-700)" ${S.rise(S.beat(5))}>
    <span class="kicker accent" style="position:absolute;left:-150px;top:440px;width:300px;text-align:center">budget · ${esc(C.bundles.webLimit.replace('kB', ' kB'))}</span>
  </div>
  </div>`;
});

Film.scene('next', (S) => `
  <div class="fill field--canvas">
  <div style="${at(110, 150, 900)}">
    <p class="kicker accent" ${S.rise(S.beat(1))}>Next · slice 1.6</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1.5), 'Screens use')}<br>${S.words(S.beat(2), '', { accent: 'the components.' })}</h1>
  </div>
  <div style="${at(1080, 170, 740)};display:flex;flex-direction:column;gap:22px">
    ${['Every built screen composes them', 'The first dialog brings the CDK', 'The first toast brings its store']
      .map((text, i) => `<div style="${light};padding:28px 34px;${sans(32, 600)}" ${pop(S, S.beat(2 + i * 0.75), i % 2 ? 0.6 : -0.6)}>${esc(text)}</div>`)
      .join('')}
  </div>
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
wipeInto('feedback', 'var(--palette-bordeaux-700)');
wipeInto('tests', 'var(--palette-borealis-300)');
wipeInto('close', 'var(--palette-bordeaux-700)');

Film.start();
