from dslib import ex, kbd, matrix, mock, themes, na


def bar(label, value, pct, mod="", extra=""):
    m = f" progress--{mod}" if mod else ""
    v = f'<span class="progress__value">{value}</span>' if value else ""
    aria = f' aria-valuenow="{pct}" aria-valuemin="0" aria-valuemax="100"' if pct is not None else ""
    style = f' style="--progress: {pct}%"' if pct is not None else ""
    return (f'<div class="progress{m}"><div class="progress__head"><span class="progress__label">{label}</span>{v}</div>'
            f'<div class="progress__track" role="progressbar" aria-label="{label}"{aria}{extra}><div class="progress__bar"{style}></div></div></div>')


UPLOAD = bar("Uploading cover photo", "64%", 64)
DONE = bar("Cover photo uploaded", "100%", 100, "success")
FAIL = bar("Upload stopped", "38%", 38, "danger")
INDET = bar("Preparing your export", "", None, "indeterminate")
METER = '<meter class="fill__meter" min="0" max="200" value="142" aria-label="Easter Sunrise 5K: 142 of 200 registered"></meter>'

SPEC = {
    "lead": "A progress bar shows how far along a task is; a meter shows how full something is, like an event's spots.",
    "meta": ["Status: stable", '<code>role="progressbar"</code> · native <code>&lt;meter&gt;</code>'],
    "overview": """<p>Use a <b>progress bar</b> for a task the person started that takes more than a couple of seconds and whose length is known (uploading a cover photo or professional credentials). Use the <b>indeterminate</b> bar when the length isn't known. Use a <b>meter</b> (<code>.fill__meter</code>) for a measurement, not a task: how many of an event's spots are taken on the admin dashboard.</p>
<p>For waits under a few seconds use a <a href="spinner.html">spinner</a> or a busy <a href="button.html">button</a>; for content loading, a <a href="skeleton.html">skeleton</a>.</p>""",
    "anatomy": {
        "figure": UPLOAD,
        "callouts": [(20, 20), (92, 20), (50, 75)],
        "parts": [
            ("Label", "<code>.progress__label</code>, 14px semibold; also the bar's accessible name."),
            ("Value", "<code>.progress__value</code>, tabular, muted. Optional."),
            ("Track and bar", "6px (<code>--size-meter</code>) pill track; the bar's width is <code>--progress</code>."),
        ],
    },
    "variants": ex(UPLOAD + INDET, "Determinate and indeterminate.", True, mod="stack")
    + "<h3>Meter</h3>" + ex(METER, "Admin dashboard fill: native <code>&lt;meter&gt;</code>, named with the event and the count.", True, mod="stack"),
    "sizes": na("One height, <code>--size-meter</code>; the bar fills its container's width."),
    "states": {
        "intro": "<p>States are tones applied to the whole bar, plus the indeterminate mode. Set <code>aria-valuenow</code> with the width; a finished or failed bar keeps its label in words.</p>",
        "matrix": matrix([("Example", "")], [
            ("In progress", UPLOAD.replace("Uploading cover photo", "Uploading")),
            ("Complete", DONE.replace("Cover photo uploaded", "Uploaded")),
            ("Failed", FAIL),
            ("Indeterminate", INDET.replace("Preparing your export", "Preparing")),
        ]),
        "themes": themes(UPLOAD + METER, mod="stack"),
        "notes": "<ul><li><b>Complete</b> turns green and changes the label (\"Cover photo uploaded\"); the bar then leaves or the next step appears.</li><li><b>Failed</b> turns red and is paired with an <a href=\"inline-message.html\">inline message</a> offering a retry.</li><li><b>Indeterminate</b> slides a 40% bar; it omits <code>aria-valuenow</code>.</li></ul>",
    },
    "responsive": "<p>The bar is fluid. On phones the label and value stay on one row; a long label wraps and the value stays right-aligned.</p>",
    "theming": "<p>The bar uses <code>--color-accent</code> (or <code>--color-success-solid</code> / <code>--color-danger-solid</code>) on a <code>--color-border-default</code> track. Dark values brighten the accent so the bar keeps 3:1 against the track's surface.</p>",
    "accessibility": {
        "pattern": '<p>The track carries <code>role="progressbar"</code> with <code>aria-label</code>, <code>aria-valuemin</code>, <code>aria-valuemax</code> and <code>aria-valuenow</code>. A meter is the native <code>&lt;meter&gt;</code> with an <code>aria-label</code> stating the count in words. Announce completion through the page\'s polite status region, not by every percent.</p>',
        "keys": [(kbd("Tab"), "Not focusable; the label and value are read in reading order.")],
        "focus": na("Progress bars and meters are not interactive."),
        "labelling": "<p>The label says what is progressing (\"Uploading cover photo\"); the value is visible text too, so colour and length are never the only carriers.</p>",
        "pairs": [
            ("Bar on surface", "--color-accent", "--color-bg-surface", 3),
            ("Success bar on surface", "--color-success-solid", "--color-bg-surface", 3),
            ("Danger bar on surface", "--color-danger-solid", "--color-bg-surface", 3),
            ("Value text", "--color-fg-muted", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>Width changes ease over <code>--duration-base</code>. The indeterminate slide runs over <code>--duration-deliberate</code>; under reduced motion it stops and shows a full, faded bar.</p>",
        "touch": na("Not interactive."),
    },
    "content": "<ul><li>Label in the present participle while running (\"Uploading cover photo\"), past tense when done (\"Cover photo uploaded\").</li><li>Value as a percentage, or a count for meters (\"142 of 200\").</li><li>Never only a percentage with no label.</li></ul>",
    "dodont": [
        ("do", UPLOAD, "Name the task and show the value."),
        ("dont", '<div class="progress"><div class="progress__track" role="progressbar" aria-label="Progress" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100"><div class="progress__bar" style="--progress: 64%"></div></div></div>', "A bare bar called \"Progress\" tells nobody what is happening."),
        ("do", METER, "Use a meter for how full an event is."),
        ("dont", bar("Spots taken", "71%", 71), "A progress bar for capacity implies a task that will finish."),
    ],
    "tokens": [
        ("Bar / success / danger", "--color-accent / --color-success-solid / --color-danger-solid", "color"),
        ("Track", "--color-border-default", "color"),
        ("Value text", "--color-fg-muted", "color"),
        ("Height", "--size-meter", "value"),
        ("Radius", "--radius-full", "value"),
        ("Motion", "--duration-base / --duration-deliberate / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<div class="progress">
  <div class="progress__head">
    <span class="progress__label">Uploading cover photo</span>
    <span class="progress__value">64%</span>
  </div>
  <div class="progress__track" role="progressbar" aria-label="Uploading cover photo"
       aria-valuenow="64" aria-valuemin="0" aria-valuemax="100">
    <div class="progress__bar" style="--progress: 64%"></div>
  </div>
</div>

<meter class="fill__meter" min="0" max="200" value="142"
       aria-label="Easter Sunrise 5K: 142 of 200 registered"></meter>''',
        "classes": [
            ("<code>.progress</code> <code>.progress__head</code> <code>.progress__label</code> <code>.progress__value</code>", "Wrapper and heading row."),
            ("<code>.progress__track</code> <code>.progress__bar</code> <code>--progress</code>", "Track and bar; set the width with the custom property."),
            ("<code>.progress--success</code> <code>.progress--danger</code> <code>.progress--indeterminate</code>", "Tones and mode."),
            ("<code>.fill__meter</code>", "Native meter for capacity."),
        ],
    },
    "sources": {
        "mocks": [mock("pages/admin-dashboard/default", "event fill meters")],
        "drift": "No mock has a task progress bar; the determinate, indeterminate, success and danger bars were added from the core set to match the meter's track and height.",
    },
}
