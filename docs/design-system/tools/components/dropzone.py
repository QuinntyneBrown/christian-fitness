from dslib import ex, icon, image, kbd, matrix, mock, themes

PLUS = icon("image-plus", "dropzone__icon")


def zone(a=""):
    return (f'<button class="dropzone" type="button"{a}>{PLUS}<span class="dropzone__title">Add a lead image</span>'
            '<span class="dropzone__hint">16:9, at least 1600 px wide</span></button>')


WRAP = '<div class="auth__form">{}</div>'
CHOSEN = ('<div class="editor__image">' + image("stretch", "editor__photo")
          + '<button class="btn btn--secondary btn--sm editor__replace" type="button">Replace image</button></div>')

STATES = [("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Disabled", " disabled")]

SPEC = {
    "lead": "A dropzone is the empty place for an image: a dashed 16:9 frame that opens the file picker when pressed and takes a file dropped on it.",
    "meta": ["Status: new", "Native <code>&lt;button&gt;</code>", "Admin: story editor"],
    "overview": f"""<p>Use a dropzone where an image belongs and none has been added yet, and the image is the first thing the page shows: the lead image at the top of a new story in the story editor. It is drawn at the image's own shape (16:9), so the writer sees the space the photo will fill. Once an image is added, the dropzone gives way to the photo with a <b>Replace image</b> button on it.</p>
<p>For an image inside a form among other fields (an event's image, a feedback screenshot), use the <a href="file-field.html">file field</a>: a label, a Choose button, the file's name and a hint.</p>""",
    "anatomy": {
        "figure": WRAP.format(zone()),
        "callouts": [(56, 35), (64, 44), (68, 53), (15, 18)],
        "parts": [
            ("Icon", "<code>.dropzone__icon</code>: the 28px (<code>--space-7</code>) <code>image-plus</code> icon, <code>aria-hidden</code>."),
            ("Title", "<code>.dropzone__title</code>: semibold, the action: \"Add a lead image\"."),
            ("Hint", "<code>.dropzone__hint</code>: 14px, what fits: \"16:9, at least 1600 px wide\"."),
            ("Frame", "Full width, 16:9, <code>--radius-lg</code>, a 2px dashed <code>--color-border-default</code> border; content centred, 8px apart, in <code>--color-fg-muted</code>."),
        ],
    },
    "variants": ex(WRAP.format(zone()), "Empty: no lead image yet (story editor, new).", True, mod="stack")
    + ex(WRAP.format(CHOSEN), "Filled: the dropzone gives way to the photo and Replace image (story editor, default).", True, mod="stack"),
    "sizes": "<p>One size: the full width of its column at 16:9, so its height follows its width (about 180px in a 320px column, 400px in the editor's 720px column). The icon is 28px.</p>",
    "states": {
        "intro": "<p>Hover is forced here with <code>data-state</code> (live: <code>:hover</code>); focus with <code>data-state</code> (live: the shared <code>:focus-visible</code> ring); disabled is the real attribute. The stylesheet has no disabled, drag-over, uploading or invalid style for the block yet: a disabled dropzone looks like a default one, and a file dragged over it gets no feedback.</p>",
        "matrix": matrix(STATES, [("Lead image", f'<div class="auth__form">{zone("{a}")}</div>')]),
        "themes": themes(WRAP.format(zone()), "stack"),
        "notes": """<ul>
<li><b>Disabled</b>: while the story saves (\"Saving…\"), with the rest of the editor read-only. Because the block has no disabled style, it needs one (for example <code>--opacity-disabled</code>, as buttons use) before it ships.</li>
<li><b>Drag over</b>: proposed <code>.dropzone[data-state="dragover"]</code> with the hover border and the accent colour, set while a file is over it.</li>
<li><b>Uploading and failed</b>: not drawn in the mocks. Proposed: the frame keeps its place with a spinner and \"Uploading…\"; a rejected file shows a field error under it (\"Use a JPEG, PNG or WebP image, 16:9\") with <code>aria-describedby</code>.</li>
</ul>""",
    },
    "responsive": """<ul>
<li>Full width of the editor's writing column at every width; the 16:9 ratio keeps its height in proportion.</li>
<li>The text is centred and wraps inside the frame; at 360px the title and hint each fit on one line.</li>
<li>On phones, where dragging files is rare, it is simply a large button that opens the picker (and the camera roll).</li>
</ul>""",
    "theming": "<p>Border <code>--color-border-default</code>, hover <code>--color-border-strong</code>; content <code>--color-fg-muted</code>, hover <code>--color-fg-default</code>; no fill, so it shows the surface it sits on. Both follow the theme.</p>",
    "accessibility": {
        "pattern": "<p>A native <code>&lt;button type=\"button\"&gt;</code> that opens the system file picker (a hidden file input behind it), so keyboard and touch users never need to drag (WCAG 2.5.7). Dropping a file is an extra for pointer users.</p>",
        "keys": [
            (kbd("Tab"), "Moves focus to the dropzone."),
            (kbd("Enter") + ", " + kbd("Space"), "Opens the file picker."),
        ],
        "focus": "<p>The shared 2px <code>--color-focus-ring</code> at 2px offset around the rounded frame.</p>",
        "labelling": "<p>The button's text is its name, so it is read as \"Add a lead image 16:9, at least 1600 px wide\". Proposed: keep only the title in the name and link the hint with <code>aria-describedby</code>, so the name is the action alone. The icon is decorative.</p>",
        "pairs": [
            ("Title and hint", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Title and hint, hover", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Dashed border (non-text)", "--color-border-default", "--color-bg-surface", 1),
            ("Dashed border, hover (non-text)", "--color-border-strong", "--color-bg-surface", 3),
            ("Focus ring on surface", "--color-focus-ring", "--color-bg-surface", 3),
        ],
        "motion": "<p>Border and text colour change over <code>--duration-fast</code>; instant under reduced motion.</p>",
        "touch": "<p>The whole frame is the target, the column's width and at least 180px tall.</p>",
    },
    "content": """<ul>
<li>The title is the action, verb first: \"Add a lead image\".</li>
<li>The hint gives the shape and the minimum size: \"16:9, at least 1600 px wide\".</li>
<li>No \"Drag and drop or click to upload\": the frame and the button say it, and \"click\" assumes a mouse.</li>
</ul>""",
    "dodont": [
        ("do", WRAP.format(zone()), "Drawn at the image's ratio, with the action and the size it needs."),
        ("dont", WRAP.format('<div class="dropzone"><span class="dropzone__title">Drop an image here</span></div>'),
         "A drop-only target: not a button, so keyboard and touch users cannot add an image at all."),
        ("do", WRAP.format(CHOSEN), "Once added, show the photo and offer Replace image on it."),
        ("dont", WRAP.format(zone() + '<p class="field__hint">stretch.jpg</p>'),
         "Keeping the empty frame after a file is chosen, with only its name under it: the writer cannot see the image."),
    ],
    "tokens": [
        ("Border / hover", "--color-border-default / --color-border-strong", "color"),
        ("Content / hover", "--color-fg-muted / --color-fg-default", "color"),
        ("Focus ring", "--color-focus-ring", "color"),
        ("Border width", "--border-width-thick", "value"),
        ("Radius", "--radius-lg", "value"),
        ("Gap", "--space-2", "value"),
        ("Icon size", "--space-7", "value"),
        ("Hint size / title weight", "--font-size-sm / --font-weight-semibold", "value"),
        ("Transition", "--duration-fast / --ease-standard", "value"),
    ],
    "code": {
        "snippet": '''<button class="dropzone" type="button">
  <svg class="icon dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">…</svg>
  <span class="dropzone__title">Add a lead image</span>
  <span class="dropzone__hint">16:9, at least 1600 px wide</span>
</button>

<!-- Once an image is added -->
<div class="editor__image">
  <img class="editor__photo" src="…" alt="">
  <button class="btn btn--secondary btn--sm editor__replace" type="button">Replace image</button>
</div>''',
        "classes": [
            ("<code>.dropzone</code>", "Dashed 16:9 button frame."),
            ("<code>.dropzone__icon</code> <code>.dropzone__title</code> <code>.dropzone__hint</code>", "Icon, action, size hint."),
            ("<code>.editor__image</code> <code>.editor__photo</code> <code>.editor__replace</code>", "What replaces it once filled (story editor)."),
            ("<code>data-state=\"hover|focus\"</code>", "Documentation only: forces a state."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-story-editor/new", "empty lead image"),
            mock("pages/admin-story-editor/default", "filled: photo with Replace image"),
        ],
        "drift": "New with the story editor. The block has no disabled, drag-over, uploading or invalid style, and its dashed border (<code>--color-border-default</code>) is under 3:1 against the surface; proposed: a <code>:disabled</code> rule, a drag-over hook, and <code>--color-border-strong</code> for the resting border.",
    },
}
