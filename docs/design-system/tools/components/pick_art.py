from dslib import INTERACTIVE, ex, icon, image, kbd, matrix, mock, themes

NOTE = "Flat, stroller-friendly, and you finish as the sun comes up."
CUR = ' aria-current="page"'


def art(shape="square", note=True):
    n = f'<p class="pick-art__note">{NOTE}</p>' if note else ""
    return (f'<div class="pick-art pick-art--{shape}" role="img" aria-label="Community Pick graphic: Easter Sunrise 5K, Sat Apr 18">'
            f'{image("run", "pick-art__photo")}<div class="pick-art__shade"></div><p class="pick-art__label">Community Pick</p>'
            f'<div class="pick-art__body"><p class="pick-art__title">Easter Sunrise 5K</p>'
            f'<p class="pick-art__when">Sat Apr 18 · 6:45 AM · Waterfront</p>{n}</div></div>')


def asset(label, file, shape, a=""):
    return (f'<figure class="asset">{art(shape)}<figcaption class="asset__caption"><span class="asset__label">{label}</span>'
            f'<button class="btn btn--secondary btn--xs" type="button"{a}>{icon("download")}PNG<span class="visually-hidden">: {file}</span></button>'
            '</figcaption></figure>')


def caption(text, hint="", a=""):
    h = f'<p class="caption__hint">{hint}</p>' if hint else ""
    return (f'<div class="caption"><div class="caption__head"><h3 class="caption__title">Caption</h3>'
            f'<button class="btn btn--neutral btn--xs" type="button"{a}>{icon("copy")}Copy<span class="visually-hidden"> caption</span></button></div>'
            f'<pre class="caption__text">{text}</pre>{h}</div>')


def platforms(cur="Instagram", label="Platform"):
    opts = "".join(f'<a class="segmented__option segmented__option--ink" href="#"{CUR if p == cur else ""}>{p}</a>'
                   for p in ["Instagram", "Facebook", "WhatsApp", "Slack"])
    return f'<nav class="segmented segmented--flush" aria-label="{label}">{opts}</nav>'


INSTA_CAP = ("Community Pick: Easter Sunrise 5K\n\n" + NOTE + "\n\nSat, Apr 18 at 6:45 AM\nMartin Goodman Trail, Marilyn Bell Park\n"
             "Free. Register at the link in bio.\n\n#ChristianFitness #CommunityPick #TorontoFitness #FaithAndFitness")
WA_CAP = ("*Community Pick: Easter Sunrise 5K*\n_" + NOTE + "_\n\nSat, Apr 18 at 6:45 AM\nMartin Goodman Trail, Marilyn Bell Park\nFree\n\n"
          "Register: https://christianfitness.ca/e/sunrise-5k")
SLACK_CAP = ("*Community Pick:* &lt;https://christianfitness.ca/e/sunrise-5k|Easter Sunrise 5K&gt;\n" + NOTE
             + "\nSat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park")
F = "community-pick-sunrise-5k"

INSTA = (platforms() + '<div class="pick-assets"><div class="assets assets--insta">'
         + asset("Post · 1080 × 1080", f"{F}-instagram-post.png", "square") + asset("Story · 1080 × 1920", f"{F}-instagram-story.png", "story")
         + "</div>" + caption(INSTA_CAP) + "</div>")
FACEBOOK = (platforms("Facebook", "Platform (Facebook)") + '<div class="pick-assets">' + asset("Link image · 1200 × 630", f"{F}-facebook.png", "landscape")
            + caption("This week’s Community Pick: Easter Sunrise 5K.\n\n" + NOTE + "\n\nSat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park\n"
                      "Free, 58 spots left.\n\nRegister: https://christianfitness.ca/e/sunrise-5k") + "</div>")
WHATSAPP = (platforms("WhatsApp", "Platform (WhatsApp)") + '<div class="pick-assets"><div class="assets assets--pair">'
            + asset("Image · 1080 × 1080", f"{F}-whatsapp.png", "square")
            + caption(WA_CAP, "Asterisks and underscores format as bold and italic in WhatsApp.") + "</div></div>")
SLACK_PREVIEW = ('<div class="card card--pad-sm slack-preview" aria-label="How the post will look in Slack">'
                 '<span class="avatar avatar--group" aria-hidden="true">CF</span><div class="slack-preview__body">'
                 '<p><strong>Christian Fitness</strong> <span class="muted">9:02 AM</span></p>'
                 '<p><strong>Community Pick:</strong> <span class="slack-preview__link">Easter Sunrise 5K</span></p>'
                 f'<p>{NOTE}</p><p>Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park</p>'
                 f'<div class="slack-preview__unfurl"><p class="slack-preview__site">christianfitness.ca</p>{art("landscape")}</div></div></div>')
SLACK = (platforms("Slack", "Platform (Slack)") + '<div class="pick-assets">' + SLACK_PREVIEW + '<div class="assets assets--pair">'
         + asset("Unfurl image · 1200 × 630", f"{F}-slack.png", "landscape")
         + caption(SLACK_CAP, "Slack formatting: the title becomes a link.") + "</div></div>")
BOX = '<div style="width: 100%;">{c}</div>'
SM = '<div style="width: 100%; max-width: 14rem;">{c}</div>'

SPEC = {
    "lead": "Pick art is the Community Pick graphic in each platform's size, with a download per file and a caption to copy; Slack also gets a preview of the post.",
    "meta": ["Status: new", "Admin console", "Rendered to PNG by the product"],
    "overview": """<p>Once staff choose an event (see <a href="pick-list.html">pick list</a>), the right side of Community Pick shows what to post, one platform at a time, switched with an ink <a href="segmented-control.html">segmented control</a>:</p>
<ul>
<li><b>Pick art</b> (<code>.pick-art</code>): the branded graphic: photo, a brand shade from the bottom, the \"Community Pick\" label, the title, when and where, and the note. Shapes: <code>--square</code> (1080 × 1080), <code>--story</code> (1080 × 1920), <code>--landscape</code> (1200 × 630). Its type is sized in container units, so it scales with the box and renders the same at any size.</li>
<li><b>Asset</b> (<code>.asset</code>): one graphic with its size label and a PNG download, laid out in <code>.assets</code> (<code>--insta</code>: post and story side by side; <code>--pair</code>: image and caption side by side).</li>
<li><b>Caption</b> (<code>.caption</code>): the text to paste, pre-formatted for the platform, with Copy and a hint about formatting.</li>
<li><b>Slack preview</b> (<code>.slack-preview</code>): how the post will look in a channel, with the unfurl.</li>
</ul>
<p>The HTML graphic is the preview; the product renders it to the PNG at the size in the label.</p>""",
    "anatomy": {
        "figure": SM.format(c=art("square")),
        "callouts": [(50, 50), (22, 10), (40, 64), (50, 77), (50, 88)],
        "parts": [
            ("Photo and shade", "<code>__photo</code> covers the box; <code>__shade</code> fades <code>--color-bg-brand</code> up from the bottom."),
            ("Label", "<code>__label</code>: \"Community Pick\" pill in the inverse brand colours."),
            ("Title", "<code>__title</code>: Barlow Condensed italic caps, 9% of the width."),
            ("When", "<code>__when</code>: date, time and area in <code>--color-fg-on-brand-highlight</code>."),
            ("Note", "<code>__note</code>: the one-line reason it is a pick."),
        ],
    },
    "variants": "<h3>Shapes</h3>" + ex(SM.format(c=art("square")) + '<div style="width: 100%; max-width: 9rem;">' + art("story") + "</div>"
                                       + '<div style="width: 100%; max-width: 20rem;">' + art("landscape") + "</div>",
                                       "Square, story and landscape; the type scales with the box.", True)
    + "<h3>Instagram</h3>" + ex(BOX.format(c=INSTA), "Post and story side by side, then the caption (Community Pick default).", mod="stack")
    + "<h3>Facebook</h3>" + ex(BOX.format(c=FACEBOOK), "One link image and a caption with the link and spots left.", mod="stack")
    + "<h3>WhatsApp</h3>" + ex(BOX.format(c=WHATSAPP), "Image beside the caption, with WhatsApp's bold and italic marks.", mod="stack")
    + "<h3>Slack</h3>" + ex(BOX.format(c=SLACK), "A preview of the post in a channel, the unfurl image and the caption in Slack's link format.", mod="stack"),
    "sizes": "<p>The graphic has no fixed size: it fills its column and keeps the platform's aspect ratio (<code>1</code>, <code>9 / 16</code>, <code>1200 / 630</code>). Every text size inside is in container query units (<code>cqw</code>), so the label is 3.2%, the title 9% (6.5% landscape) and the when line 3.4% (2.6% landscape) of the width at any size.</p>",
    "states": {
        "intro": "<p>The graphic, the caption and the preview are static. Their controls are buttons: PNG (<code>.btn--secondary.btn--xs</code>) and Copy (<code>.btn--neutral.btn--xs</code>); the platform switch is links with <code>aria-current</code>. Pointer and focus are forced with <code>data-state</code>.</p>",
        "matrix": matrix(INTERACTIVE, [
            ("Download", '<button class="btn btn--secondary btn--xs" type="button"{a}>' + icon("download") + 'PNG<span class="visually-hidden">: post</span></button>', {}),
            ("Copy", '<button class="btn btn--neutral btn--xs" type="button"{a}>' + icon("copy") + 'Copy<span class="visually-hidden"> caption</span></button>', {}),
        ]) + "<h3>Before anything is made</h3><p>The right side shows the <a href=\"pick-list.html\">pick empty</a> preview; while assets are created the button reads \"Creating…\" and the event and note are read-only; if creating fails, an inline error sits above the button and nothing on the right changes.</p>",
        "themes": themes(SM.format(c=art("square")) + BOX.format(c=caption(WA_CAP, "Asterisks and underscores format as bold and italic in WhatsApp."))),
        "notes": "<ul><li>The graphic does not change with the theme: it is brand artwork that is posted as an image.</li><li>Copied: the product confirms with a <a href=\"toast.html\">toast</a> (\"Caption copied\"); the mocks do not show it.</li></ul>",
    },
    "responsive": """<ul>
<li>Below 640px every asset stacks full width; the story graphic is then very tall, so it follows the post.</li>
<li>From 640px <code>.assets--insta</code> puts the post and the story side by side (1fr and 0.5fr, so their heights roughly match); <code>.assets--pair</code> puts the image beside the caption (0.8fr and 1fr).</li>
<li>From 1024px the assets sit in the right column of <code>.split--pick</code> (21.25rem picker on the left).</li>
<li>The platform switch scrolls sideways inside itself when it does not fit (<code>.segmented--flush</code>).</li>
</ul>""",
    "theming": "<p>The graphic uses the brand pair in both themes: <code>--color-bg-brand</code>/<code>--color-fg-on-brand</code>, the label <code>--color-bg-brand-inverse</code>/<code>--color-fg-brand-inverse</code> and the when line <code>--color-fg-on-brand-highlight</code>, with <code>--shadow-2</code>. Captions are surface boxes (<code>--color-bg-surface</code>, <code>--color-border-default</code> ring); the Slack link uses <code>--color-info-fg</code>, standing in for Slack's blue.</p>",
    "accessibility": {
        "pattern": "<p>Each graphic is <code>role=\"img\"</code> with an <code>aria-label</code> naming the event and date, so its inner text is not read twice. Each asset is a <code>&lt;figure&gt;</code> whose <code>&lt;figcaption&gt;</code> names the size. The caption is a <code>&lt;pre&gt;</code> so line breaks survive copying. The Slack preview is labelled \"How the post will look in Slack\".</p>",
        "keys": [
            (kbd("Tab"), "Platform links, then each PNG button, then Copy."),
            (kbd("Enter"), "Switches platform; downloads; copies."),
        ],
        "focus": "<p>The shared ring on every button and platform link.</p>",
        "labelling": "<p>PNG buttons add the file name in visually hidden text (\"PNG: community-pick-sunrise-5k-instagram-post.png\"); Copy adds \"caption\".</p>",
        "pairs": [
            ("Text on the graphic", "--color-fg-on-brand", "--color-bg-brand", 4.5),
            ("When line", "--color-fg-on-brand-highlight", "--color-bg-brand", 4.5),
            ("Label pill", "--color-fg-brand-inverse", "--color-bg-brand-inverse", 4.5),
            ("Asset label and hint", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Caption text", "--color-fg-default", "--color-bg-surface", 4.5),
            ("Slack link", "--color-info-fg", "--color-bg-surface", 4.5),
        ],
        "motion": "<p>None.</p>",
        "touch": "<p>PNG and Copy are extra-small buttons (36px) that extend to 44 × 44px on coarse pointers.</p>",
    },
    "content": """<ul>
<li>Size labels name the use and the pixels: \"Post · 1080 × 1080\", \"Link image · 1200 × 630\".</li>
<li>Captions start with \"Community Pick:\" and the event, then the note, when, where, price and how to register, in each platform's own marks.</li>
<li>The note is one line of at most 70 characters, the same on every graphic and caption.</li>
<li>File names: <code>community-pick-&lt;event&gt;-&lt;platform&gt;.png</code>.</li>
</ul>""",
    "dodont": [
        ("do", SM.format(c=art("square")), "One label on the graphic, so the inner text is read once."),
        ("dont", SM.format(c=art("square").replace('role="img" aria-label="Community Pick graphic: Easter Sunrise 5K, Sat Apr 18"', "")),
         "A graphic with no <code>role=\"img\"</code> or name: its fragments are read as loose text."),
        ("do", BOX.format(c=caption(WA_CAP, "Asterisks and underscores format as bold and italic in WhatsApp.")), "Say what the platform's marks do, under the caption."),
        ("dont", BOX.format(c=caption(INSTA_CAP).replace("Community Pick:", "<b>Community Pick:</b>")),
         "Bold in the caption box: it is lost on paste; Instagram has no formatting."),
    ],
    "tokens": [
        ("Graphic", "--color-bg-brand / --color-fg-on-brand", "color"),
        ("Label pill", "--color-bg-brand-inverse / --color-fg-brand-inverse", "color"),
        ("When", "--color-fg-on-brand-highlight", "color"),
        ("Caption box", "--color-bg-surface / --color-border-default", "color"),
        ("Slack link", "--color-info-fg", "color"),
        ("Graphic shadow", "--shadow-2", "value"),
        ("Graphic radius / caption radius", "--radius-md / --radius-lg", "value"),
        ("Assets gap", "--space-6 / --space-8", "value"),
        ("Title face", "--font-family-display", "value"),
    ],
    "code": {
        "snippet": '''<div class="assets assets--insta">
  <figure class="asset">
    <div class="pick-art pick-art--square" role="img" aria-label="Community Pick graphic: Easter Sunrise 5K, Sat Apr 18">
      <img class="pick-art__photo" src="run.jpg" alt="">
      <div class="pick-art__shade"></div>
      <p class="pick-art__label">Community Pick</p>
      <div class="pick-art__body"><p class="pick-art__title">Easter Sunrise 5K</p>
        <p class="pick-art__when">Sat Apr 18 · 6:45 AM · Waterfront</p><p class="pick-art__note">…</p></div>
    </div>
    <figcaption class="asset__caption"><span class="asset__label">Post · 1080 × 1080</span>
      <button class="btn btn--secondary btn--xs" type="button">…PNG<span class="visually-hidden">: community-pick-sunrise-5k-instagram-post.png</span></button></figcaption>
  </figure>
</div>
<div class="caption">
  <div class="caption__head"><h3 class="caption__title">Caption</h3><button class="btn btn--neutral btn--xs" type="button">…Copy<span class="visually-hidden"> caption</span></button></div>
  <pre class="caption__text">Community Pick: Easter Sunrise 5K …</pre>
</div>''',
        "classes": [
            ("<code>.pick-assets</code> <code>.assets</code> <code>--insta</code> <code>--pair</code>", "The right side's stack and the asset grids."),
            ("<code>.asset</code> <code>__caption</code> <code>__label</code>", "One file with its label and download."),
            ("<code>.pick-art</code> <code>--square</code> <code>--story</code> <code>--landscape</code>", "The graphic and its shapes."),
            ("<code>.pick-art__photo</code> <code>__shade</code> <code>__label</code> <code>__body</code> <code>__title</code> <code>__when</code> <code>__note</code>", "Graphic layers and text."),
            ("<code>.caption</code> <code>__head</code> <code>__title</code> <code>__text</code> <code>__hint</code>", "Caption to copy."),
            ("<code>.slack-preview</code> <code>__body</code> <code>__link</code> <code>__unfurl</code> <code>__site</code>", "The Slack post preview."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/admin-community-pick/default", "Instagram: post, story, caption"),
            mock("pages/admin-community-pick/facebook", "landscape link image"),
            mock("pages/admin-community-pick/whatsapp", "image and caption pair"),
            mock("pages/admin-community-pick/slack", "Slack preview and unfurl"),
            mock("pages/admin-community-pick/pick", "square graphic in the empty preview"),
        ],
        "drift": """<ul>
<li>The graphic's type sizes and insets are percentages of its width (<code>cqw</code>) rather than tokens, by design: they must scale with the PNG. They are the only non-token sizes in the block.</li>
<li>The Slack link reuses <code>--color-info-fg</code> for Slack's link blue; the preview is an approximation, not Slack's own styling.</li>
</ul>""",
    },
}
