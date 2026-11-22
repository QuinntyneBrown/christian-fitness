from dslib import ex, icon, kbd, matrix, mock, themes

SEND = icon("send", "icon--lg")


def msg(text, author="", time="8:40 AM", mine=False, failed=False):
    cls = "message" + (" message--mine" if mine else "") + (" message--failed" if failed else "")
    au = f'<p class="message__author">{author}</p>' if author else ""
    tail = (f'<p class="message__error" role="alert">{icon("alert-circle", "icon--xs")}Not sent. <button type="button">Try again</button></p>'
            if failed else f'<p class="message__time">{time}</p>')
    return f'<li class="{cls}"><div class="message__wrap">{au}<p class="message__bubble">{text}</p>{tail}</div></li>'


THREAD = ('<ol class="thread__messages">'
          '<li class="thread__day">Today</li>'
          + msg("Morning team! Saturday forecast is 6° and clear. Bring a layer you can tie around your waist.", "Danielle Okafor", "7:58 AM")
          + msg("I&#x27;ll drive from Scarborough, I have room for three.", time="8:41 AM", mine=True)
          + '</ol>')


def composer(uid, value="", disabled=True):
    v = f' value="{value}"' if value else ""
    d = " disabled" if disabled else ""
    return (f'<form class="composer"><label class="visually-hidden" for="{uid}">Message Sunrise 5K Crew</label>'
            f'<input class="composer__input" id="{uid}" placeholder="Message Sunrise 5K Crew" autocomplete="off"{v}>'
            f'<button class="composer__send" type="submit" aria-label="Send"{d}>{SEND}</button></form>')


SPEC = {
    "lead": "Messages keep event groups and friends talking between events: bubbles, day separators and a composer.",
    "meta": ["Status: stable", "Real-time via SignalR", "<code>&lt;ol&gt;</code> of messages"],
    "overview": """<ul>
<li><b>Received</b> (<code>.message</code>): surface bubble on the left, with the author's name in group chats.</li>
<li><b>Mine</b> (<code>.message--mine</code>): bordeaux bubble on the right, no author.</li>
<li><b>Failed</b> (<code>.message--failed</code>): faded bubble with \"Not sent. Try again\".</li>
<li><b>Day separator</b> (<code>.thread__day</code>): \"Today\", \"Yesterday\", \"Mon, Apr 13\".</li>
<li><b>Composer</b> (<code>.composer</code>): pill input and round send button at the foot of the thread.</li>
</ul>
<p>Conversation lists are documented under <a href="list.html">List</a>.</p>""",
    "anatomy": {
        "figure": '<ol class="thread__messages">' + msg("Parking at Marilyn Bell fills up by 6:30, so carpool or take the 504 King.", "Michael Chen") + '</ol>',
        "callouts": [(8, 20), (30, 50), (8, 85)],
        "parts": [
            ("Author", "12px semibold muted; group chats only, never on your own messages."),
            ("Bubble", "<code>--radius-lg</code> with a <code>--radius-sm</code> tail corner toward the sender; 15px text."),
            ("Time", "12px muted under the bubble, aligned with it."),
        ],
    },
    "variants": ex(THREAD, "A day separator, a received message with author, and one of mine.", True)
    + "<h3>Composer</h3>" + ex(composer("composer-v"), "Empty: send is disabled until there is text.", True),
    "sizes": "<p>One size. Bubbles grow to 80% of the thread width on phones and 65% from <code>--layout-breakpoint-sm</code>.</p>",
    "states": {
        "intro": "<p>Bubbles are text, not controls; they have no hover or focus. The composer's input and send button have the interactive states. Sending and failed belong to my messages.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'), ("Active", ' data-state="active"'), ("Disabled", " disabled"), ("Failed", "")], [
            ("My message", '<ol class="thread__messages">' + msg("See you Saturday!", mine=True) + '</ol>',
             {"Hover": None, "Focus": None, "Active": None, "Disabled": None}),
            ("Composer input", '<input class="composer__input" aria-label="Message Sunrise 5K Crew" placeholder="Message Sunrise 5K Crew"{a}>',
             {"Hover": None, "Active": None, "Failed": None}),
            ("Send button", f'<button class="composer__send" type="submit" aria-label="Send"{{a}}>{SEND}</button>', {"Failed": None}),
        ]).replace('<td><ol class="thread__messages">' + msg("See you Saturday!", mine=True) + '</ol></td></tr>',
                   '<td><ol class="thread__messages">' + msg("See you Saturday!", mine=True, failed=True) + '</ol></td></tr>'),
        "themes": themes(THREAD),
        "notes": """<ul>
<li><b>Failed</b> fades the bubble and adds a <code>role="alert"</code> line with an icon, \"Not sent.\" and a \"Try again\" button; the text is kept so nothing is lost.</li>
<li><b>Draft</b>: with text in the input, send is enabled; leaving keeps the draft (messages draft).</li>
<li><b>Loading</b> draws bubble skeletons (<code>.skeleton--bubble</code>); <b>empty</b> shows \"No messages yet. Say hello.\"</li>
</ul>""",
    },
    "responsive": "<ul><li>Phones show the thread full screen with a back button; from <code>--layout-breakpoint-md</code> it sits beside the conversation list.</li><li>The composer stays pinned to the bottom of the panel; the message list scrolls above it.</li><li>Long words and links wrap inside the bubble.</li></ul>",
    "theming": "<p>Received: <code>--color-bg-surface</code> with a <code>--color-border-default</code> ring on the <code>--color-bg-canvas</code> thread. Mine: <code>--color-accent</code>/<code>--color-fg-on-accent</code>. Failed text: <code>--color-danger-fg</code>. Composer focus border: <code>--color-accent</code>.</p>",
    "accessibility": {
        "pattern": "<p>The thread is an <code>&lt;ol&gt;</code> in a labelled section; new messages are announced through a polite live region owned by the real-time client, not by each bubble. The composer is a <code>&lt;form&gt;</code> with a visually hidden label.</p>",
        "keys": [
            (kbd("Enter"), "Sends the message from the input."),
            (kbd("Tab"), "Moves from the input to Send, then to any Try again."),
        ],
        "focus": "<p>The composer input shows an accent border on focus in addition to the shared ring on the send button.</p>",
        "labelling": "<p>Input label: \"Message Sunrise 5K Crew\". Send button: <code>aria-label=\"Send\"</code>. Failed: the alert reads \"Not sent. Try again\". Message text is rendered as text, never HTML.</p>",
        "pairs": [
            ("Received text", "--color-fg-default", "--color-bg-surface", 4.5),
            ("My text", "--color-fg-on-accent", "--color-accent", 4.5),
            ("Time and author", "--color-fg-muted", "--color-bg-canvas", 4.5),
            ("Failed line", "--color-danger-fg", "--color-bg-canvas", 4.5),
            ("Placeholder", "--color-fg-subtle", "--color-bg-canvas", 4.5),
        ],
        "motion": "<p>The list scrolls to the newest message instantly; no slide-in animation. Send fades between enabled and disabled over <code>--duration-fast</code>.</p>",
        "touch": "<p>Send is 44 × 44px (<code>--control-height-md</code>); Try again extends to 44px on coarse pointers.</p>",
    },
    "content": "<ul><li>Placeholder names the conversation: \"Message Sunrise 5K Crew\".</li><li>Times: \"8:42 AM\". Day separators: \"Today\", \"Yesterday\", then \"Mon, Apr 13\".</li><li>Failure: \"Not sent. Try again\", never an error code.</li></ul>",
    "dodont": [
        ("do", '<ol class="thread__messages">' + msg("Yes! I&#x27;ll bring my Bluetooth speaker.", mine=True, failed=True) + '</ol>', "Keep the text and offer Try again (send failed)."),
        ("dont", '<ol class="thread__messages"><li class="message message--mine"><div class="message__wrap"><p class="message__error" role="alert">Error 503</p></div></li></ol>', "Discarding the message and showing a code."),
        ("do", composer("composer-do"), "A labelled input and a named send button."),
        ("dont", f'<form class="composer"><input class="composer__input" placeholder="Type here" aria-label="Type here"><button class="composer__send" type="submit" aria-label="Button">{SEND}</button></form>', "Generic placeholder and an unnamed action."),
    ],
    "tokens": [
        ("Received bubble / ring", "--color-bg-surface / --color-border-default", "color"),
        ("My bubble / text", "--color-accent / --color-fg-on-accent", "color"),
        ("Thread background", "--color-bg-canvas", "color"),
        ("Failed line", "--color-danger-fg", "color"),
        ("Composer border / focus", "--color-border-strong / --color-accent", "color"),
        ("Bubble radius / tail", "--radius-lg / --radius-sm", "value"),
        ("Bubble padding", "--space-2-5 / --space-4", "value"),
        ("Send size", "--control-height-md", "value"),
        ("Failed opacity / disabled send", "--opacity-disabled / --opacity-unavailable", "value"),
    ],
    "code": {
        "snippet": '''<ol class="thread__messages">
  <li class="thread__day">Today</li>
  <li class="message"><div class="message__wrap">
    <p class="message__author">Danielle Okafor</p>
    <p class="message__bubble">Morning team!</p><p class="message__time">7:58 AM</p>
  </div></li>
</ol>
<form class="composer">
  <label class="visually-hidden" for="composer">Message Sunrise 5K Crew</label>
  <input class="composer__input" id="composer" placeholder="Message Sunrise 5K Crew" autocomplete="off">
  <button class="composer__send" type="submit" aria-label="Send" disabled>…</button>
</form>''',
        "classes": [
            ("<code>.message</code> <code>--mine</code> <code>--failed</code>", "Message row and its variants."),
            ("<code>.message__wrap</code> <code>__author</code> <code>__bubble</code> <code>__time</code> <code>__error</code>", "Parts."),
            ("<code>.thread__messages</code> <code>.thread__day</code>", "The list and day separators."),
            ("<code>.composer</code> <code>__input</code> <code>__send</code>", "The composer."),
        ],
    },
    "sources": {
        "mocks": [
            mock("pages/messages/default", "group thread, composer"),
            mock("pages/messages/direct", "direct thread without authors"),
            mock("pages/messages/send-failed", "failed message"),
            mock("pages/messages/draft", "composer with text"),
            mock("pages/messages/loading", "bubble skeletons"),
            mock("pages/messages/empty", "no messages"),
        ],
        "drift": "The bubble's 16px radius is now named <code>--radius-lg</code> (was 2xl).",
    },
}
