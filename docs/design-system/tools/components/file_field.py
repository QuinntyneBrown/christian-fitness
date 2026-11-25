from dslib import ex, kbd, matrix, mock, themes

STATES = [("Default", ""), ("Disabled", " disabled")]


def ff(sfx, filename="", error="", hint="JPEG, PNG or WebP, up to 5 MB", opt=True, disabled=False):
    fid = f"ff-{sfx}"
    msg_id = f"{fid}-m"
    d = " disabled" if disabled else ""
    msg = (f'<span class="field__error" id="{msg_id}">{error}</span>' if error
           else f'<span class="field__hint" id="{msg_id}">{hint}</span>')
    o = ' <span class="field__optional">(optional)</span>' if opt else ""
    shown = (f'<span class="file-field__name">{filename}</span>'
             f'<button class="btn btn--ghost btn--sm" type="button"{d}>Remove<span class="visually-hidden"> image</span></button>' if filename
             else '<span class="file-field__name file-field__name--empty">No image chosen</span>')
    return (f'<div class="field file-field"><span class="field__label" id="{fid}-label">Image{o}</span>'
            f'<div class="file-field__row"><button class="btn btn--secondary btn--sm" id="{fid}" type="button" '
            f'aria-labelledby="{fid}-label {fid}" aria-describedby="{msg_id}"{d}>Choose image</button>'
            f'<input id="{fid}-input" name="image" type="file" accept="image/jpeg,image/png,image/webp" '
            f'aria-labelledby="{fid}-label" hidden>{shown}</div>{msg}</div>')


SPEC = {
    "lead": "A file field lets people choose one file from their device, such as an event's image, and shows what they chose.",
    "meta": ["Status: stable", "Native <code>&lt;input type=\"file\"&gt;</code>, hidden behind a button"],
    "overview": """<p>Use a file field when the answer is a file. For text use a <a href="text-field.html">text field</a>. It sits in the same <a href="form-field.html">form field</a> layout as every input: a label, the control, a hint and an error.</p>
<ul>
<li><b>Empty</b>: "Choose image" and "No image chosen".</li>
<li><b>Chosen</b>: the file's name and a Remove button.</li>
<li><b>Invalid</b>: the error replaces the hint and says what is allowed.</li>
</ul>""",
    "anatomy": {
        "figure": ff("anat", "park-bootcamp.jpg"),
        "callouts": [(8, 10), (40, 45), (30, 88)],
        "parts": [
            ("Label", "14px semibold; names the file, with \"(optional)\" when it may be left out."),
            ("Choose button", "A secondary small <a href=\"button.html\">button</a> that opens the system file picker; the native input stays hidden."),
            ("Name and Remove", "The chosen file's name, wrapped when long, and a ghost Remove button; before a choice, the muted \"No image chosen\"."),
            ("Hint or error", "Linked to the button with <code>aria-describedby</code>; the error replaces the hint."),
        ],
    },
    "variants": ex(ff("v1"), "Empty (event editor).", True, mod="stack")
    + ex(ff("v2", "park-bootcamp.jpg"), "Chosen, with Remove.", True, mod="stack")
    + ex(ff("v3", error="Use a JPEG, PNG or WebP image up to 5 MB"), "Invalid.", True, mod="stack"),
    "sizes": "<p>One size: the choose and Remove buttons are the small button, 36px tall with a 44px touch target. The row wraps under a long file name.</p>",
    "states": {
        "intro": "<p>The button states are the <a href=\"button.html\">button</a>'s. The field is disabled while its form saves.</p>",
        "matrix": matrix(STATES, [
            ("File field", '<div class="file-field__row"><button class="btn btn--secondary btn--sm" type="button"{a}>Choose image</button><span class="file-field__name file-field__name--empty">No image chosen</span></div>'),
        ]),
        "themes": themes(ff("th") + ff("th-e", error="Use a JPEG, PNG or WebP image up to 5 MB")),
        "notes": "<ul><li><b>Replace</b>: choosing again replaces the file; Remove clears it.</li><li><b>Busy</b>: while a file uploads, the button reads \"Uploading…\" and is disabled.</li></ul>",
    },
    "responsive": "<ul><li>Fills its column; the row wraps so the file name sits under the buttons on a phone.</li></ul>",
    "theming": "<p>Uses the button and field tokens; no tokens of its own.</p>",
    "accessibility": {
        "pattern": "<p>A visible label, a real button that opens the picker (the hidden input is not focusable, so keyboard and touch use the button, but it still carries <code>aria-labelledby</code> pointing at the field label, as the mocks do), and the hint or error linked with <code>aria-describedby</code>. The chosen name is plain text beside the button; Remove names the file kind for screen readers.</p>",
        "keys": [
            (kbd("Tab"), "Moves between Choose and Remove."),
            (kbd("Enter") + " / " + kbd("Space"), "Opens the file picker, or removes the file."),
        ],
        "focus": "<p>The buttons' own focus ring.</p>",
        "labelling": "<p>The button is labelled by the field label and its own text: \"Image Choose image\". An error is announced when it appears with the form's error summary, and is reached with <code>aria-describedby</code>.</p>",
        "pairs": [
            ("File name", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Empty note", "--color-fg-muted", "--color-bg-surface", 4.5),
            ("Error", "--color-danger-fg", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>None of its own.</p>",
        "touch": "<p>Both buttons keep a 44px touch target.</p>",
    },
    "content": "<ul><li>Name the file: \"Image\", \"Photo\".</li><li>Hints say what is allowed: \"JPEG, PNG or WebP, up to 5 MB\".</li><li>Errors say the fix: \"Use a JPEG, PNG or WebP image up to 5 MB\".</li></ul>",
    "dodont": [
        ("do", ff("dd1"), "Say the allowed types and size before people choose."),
        ("dont", '<input class="input" type="file" aria-label="Image">', "The browser's own file input looks different in every browser and says nothing of limits."),
    ],
    "tokens": [
        ("Row gap", "--space-3", "value"),
        ("Name text", "--font-size-md / --color-fg-default", "value"),
        ("Empty note", "--color-fg-muted", "color"),
        ("Error", "--color-danger-fg", "color"),
    ],
    "code": {
        "snippet": '''<div class="field file-field">
  <span class="field__label" id="f-image-label">Image <span class="field__optional">(optional)</span></span>
  <div class="file-field__row">
    <button class="btn btn--secondary btn--sm" id="f-image" type="button" aria-labelledby="f-image-label f-image" aria-describedby="f-image-hint">Choose image</button>
    <input id="f-image-input" name="image" type="file" accept="image/jpeg,image/png,image/webp" aria-labelledby="f-image-label" hidden>
    <span class="file-field__name file-field__name--empty">No image chosen</span>
  </div>
  <span class="field__hint" id="f-image-hint">JPEG, PNG or WebP, up to 5 MB</span>
</div>''',
        "classes": [
            ("<code>.file-field__row</code>", "The button, name and Remove, wrapping."),
            ("<code>.file-field__name</code>", "The chosen file's name; <code>--empty</code> is the muted note."),
        ],
    },
    "sources": {
        "mocks": [
            mock("dialogs/event-editor/default", "Image, optional, empty"),
            mock("dialogs/event-editor/edit", "Image chosen, with Remove"),
            mock("dialogs/event-editor/image-invalid", "Invalid image"),
        ],
        "drift": "New with slice 10.2: no mock had a file input before the event editor's image. The page's examples left the hidden native input unnamed; it now carries an id and <code>aria-labelledby</code> pointing at the field label, as the mocks' input does (the mocks also add a <code>.file-field__input</code> class, which has no rule in components.css).",
    },
}
