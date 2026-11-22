from dslib import cf_ui, ex, mock

F = cf_ui

MICRO = [
    ("Primary action", "Register · Send request · Publish · Save · Sign in · Join", "Submit · OK · Confirm"),
    ("Busy label", "Registering… · Sending… · Publishing… · Saving…", "Please wait… · Loading…"),
    ("Cancel", "Cancel", "Never mind · Abort"),
    ("Success toast", "You're registered · Draft saved · Request sent", "Success! · Done!"),
    ("Undo toast", "You've left Easter Sunrise 5K. Your spot goes to the waitlist in 10 minutes.", "Action completed. Undo?"),
    ("Failed submit", "We couldn't save your changes. Nothing was lost. Check your connection and try again.", "Error 500 · Save failed"),
    ("Load error", "Events didn't load. We couldn't reach Christian Fitness. Check your connection and try again.", "Failed to fetch"),
    ("Empty", "No events yet. The team posts runs, workouts and gatherings every week.", "No data"),
    ("No results", "No members match “Jessica”. Check the spelling, or search by email instead.", "0 results"),
    ("Field error", "Enter an email address like name@example.com", "Invalid email"),
    ("Optional field", "Home church (optional)", "Home church *"),
    ("Retry", "Try again", "Retry request"),
    ("Back link", "All events · Back to home", "Back · Go back"),
]
TABLE = ('<table class="ds-table"><thead><tr><th scope="col">Moment</th><th scope="col">Write</th><th scope="col">Not</th></tr></thead><tbody>'
         + "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in MICRO) + "</tbody></table>")

FORMULA = F.form_alert("We couldn't register you",
                       "Your spot isn't saved yet. Check your connection and try again.").replace('tabindex="-1"', 'tabindex="-1" id="ct-alert"')

SPEC = {
    "slug": "content-and-tone",
    "lead": "We sound like a friend from church who also coaches: warm, plain, encouraging, and never preachy.",
    "overview": """<p>Christian Fitness is a community for health in body and spirit. Words should welcome people of every fitness level and every church, and never make faith a test of belonging.</p>
<ul>
<li><b>Warm</b>: "Good morning, Grace", "We've started the conversation for you".</li>
<li><b>Plain</b>: short sentences, everyday words, Canadian English (colour, centre, cheque).</li>
<li><b>Encouraging, not pushy</b>: invite ("Find your next run"), don't guilt ("You missed 3 workouts").</li>
<li><b>Faith, lightly held</b>: scripture appears in the verse band with its citation; prayer and devotion are named plainly where an event includes them ("Stretch &amp; Pray"). No jargon that assumes one tradition.</li>
</ul>""",
    "when": """<p>These rules apply to every surface: member app, admin console, e-mails and notifications. The admin console may be terser ("Couldn't publish") but stays respectful about members: describe behaviour, not character ("Shared supplement links in 3 chats", not "Spammer").</p>""",
    "structure": """<h3>The error message formula</h3>
<p><b>What happened</b> (no blame) + <b>what's safe or what it means</b> + <b>what to do</b>. Lead with "We couldn't…" or "[Thing] didn't load", never "You failed to…" or "Error".</p>"""
        + ex(FORMULA, "What happened: \"We couldn't register you\". What it means: \"Your spot isn't saved yet\". What to do: \"Check your connection and try again\".", True)
        + "<h3>Microcopy library</h3>" + TABLE,
    "states": """<p>Tone shifts with the moment:</p>
<ul>
<li><b>Success</b>: brief and glad. "You're registered."</li>
<li><b>Waiting</b>: the verb, in progress. "Saving…"</li>
<li><b>Empty</b>: hopeful, with a next step. "The first ones are on their way."</li>
<li><b>Error</b>: calm and reassuring. "Nothing was lost."</li>
<li><b>Moderation</b>: neutral and factual. "Kevin can't sign in or message anyone until you lift it."</li>
</ul>""",
    "responsive": """<p>Copy doesn't change by breakpoint; write the short version first so it fits a phone. Labels stay under three words where possible; long event titles wrap rather than truncate on detail pages and clamp to two lines on cards.</p>""",
    "accessibility": """<ul>
<li>Link and button text makes sense alone: "Edit Easter Sunrise 5K", not "Click here".</li>
<li>Write dates and times in full where they are announced: "Saturday, April 18 at 6:45 AM".</li>
<li>Don't rely on direction or colour: "the red field", "the button on the right".</li>
<li>Names, messages and errors from people or the server are rendered as text, never HTML.</li>
<li>Aim for grade 7 reading level; avoid idioms that don't translate.</li>
</ul>""",
    "content": """<ul>
<li><b>Sentence case</b> everywhere: "Request a booking", not "Request A Booking". Proper nouns keep their capitals (Easter Sunrise 5K, Martin Goodman Trail).</li>
<li><b>Numbers</b> as digits: "3 days", "142 going", "6 spots left". Prices "$10", "Free", "from $70".</li>
<li><b>Dates</b>: "Sat Apr 18" on cards, "Saturday, April 18" in sentences; times "6:45 AM".</li>
<li><b>Verbs</b> for actions: Register, Message, Publish, Approve, Decline, Suspend.</li>
<li><b>Contractions</b> are fine and friendly: "You're", "didn't", "We'll".</li>
<li><b>Faith details</b> are always optional; say "(optional)" and never imply they're needed.</li>
</ul>""",
    "do-dont": [
        ("do", '<p class="lead">Nothing was lost. Check your connection and try again.</p>', "Reassure, then say what to do."),
        ("dont", '<p class="lead">You entered something wrong. Request failed.</p>', "Don't blame or be vague."),
        ("do", '<p class="lead">Women\'s Hoops &amp; Devotion Night: basketball, then a short devotion.</p>', "Name faith content plainly."),
        ("dont", '<p class="lead">Only for true believers who are serious about their walk.</p>', "Don't gatekeep or assume one tradition."),
        ("do", '<button class="btn btn--primary" type="button">Request a booking</button>', "Sentence case, verb first."),
        ("dont", '<button class="btn btn--primary" type="button">REQUEST A BOOKING NOW!</button>', "Don't shout or add urgency."),
    ],
    "sources": {
        "mocks": [
            mock("pages/home/default", "greeting and verse band"),
            mock("pages/events/empty", "hopeful empty copy"),
            mock("dialogs/request-booking/failed", "\"Nothing was lost\""),
            mock("notifications/toast/danger", "error formula in a toast"),
            mock("notifications/admin-toast/info", "neutral moderation copy"),
            mock("pages/join/default", "home church field"),
        ],
        "drift": """<ul>
<li>The Join form labels "Home church" without "(optional)", though faith details must be optional.</li>
<li>Staff copy mixes "We couldn't…" and subjectless "Couldn't…" for the same kind of failure.</li>
<li>Error summary titles use three different formulas (see <a href="forms.html">Forms</a>).</li>
<li>Load errors say "Try again in a moment" (admin) or "Check your connection and try again" (member).</li>
</ul>""",
    },
}
