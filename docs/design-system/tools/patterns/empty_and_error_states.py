from dslib import cf_ui, ex, icon, mock

F = cf_ui


def h3(html: str) -> str:
    return html.replace("<h2", "<h3").replace("</h2>", "</h3>")


FIRST = F.empty_block("No messages yet",
                      "Register for an event and you'll join its group chat. You can also message a professional from Services.",
                      '<a class="btn btn--primary btn--sm" href="#">Browse events</a>', tag="h3", tight=True)
NORESULTS = F.empty_block("No members match “Jessica”", "Check the spelling, or search by email or home church instead.",
                          '<button class="btn btn--secondary btn--sm" type="button">Clear search</button>', tag="h3", tight=True)
ERROR = h3(F.error_block("Events didn't load", "We couldn't reach Christian Fitness. Check your connection and try again.",
                         retry="#", back=("Back to home", "#"), ref="CF-E3K9"))

SPEC = {
    "slug": "empty-and-error-states",
    "lead": "When there's nothing to show, or something broke, say why in one sentence and offer the one thing that helps.",
    "overview": """<p>Empty and error states replace content inside the page, never the whole shell: the header, tabs, filters and search stay so people can change course. Each has a title, one or two sentences, and one primary action.</p>
<ul>
<li><b>First run</b>: nothing exists yet ("No events yet"). Explain what will appear and how.</li>
<li><b>No results</b>: filters or search hide everything ("Nothing here yet", "No members match “Jessica”"). Offer to clear them.</li>
<li><b>Load error</b>: the request failed ("Events didn't load"). Offer Try again, and a way elsewhere.</li>
<li><b>Partial</b>: some panels loaded, one failed; that panel shows an <a href="../components/inline-message.html">inline error</a>, the rest stay.</li>
<li><b>System</b>: 404, 403, 500 and offline get a full <a href="../components/error-page.html">error page</a>.</li>
</ul>""",
    "when": """<table class="ds-table"><thead><tr><th scope="col">Cause</th><th scope="col">Component</th><th scope="col">Primary action</th></tr></thead><tbody>
<tr><td>Nothing created yet</td><td><a href="../components/empty-state.html">Empty state</a></td><td>Create or browse ("New event", "Browse events")</td></tr>
<tr><td>Filter or search hides all</td><td>Empty state, tight</td><td>"Show all events" / "Clear search"</td></tr>
<tr><td>Region failed to load</td><td>Error state (<code>.error-state</code>)</td><td>"Try again", plus a back link</td></tr>
<tr><td>One panel of many failed</td><td>Inline error</td><td>"Try again" link</td></tr>
<tr><td>Page missing, forbidden, server down, offline</td><td>Error page</td><td>Home, or Try again</td></tr>
</tbody></table>""",
    "structure": """<p>Title (display face), text (muted, 1–2 sentences, max 60ch), actions. Errors add an icon and a reference code people can quote to the team.</p>"""
        + ex(FIRST, "First run: what will appear, and how to get there.", True)
        + ex(NORESULTS, "No results: echo the query, suggest a fix, offer to clear.", True)
        + ex(ERROR, "Load error: icon, what failed, reassurance, Try again, a way out, and a reference.", True),
    "states": """<p>A list region moves between <b>loading</b>, <b>loaded</b>, <b>empty</b>, <b>no results</b> and <b>error</b>. Keep filters visible in no-results and error so the person can change them. "Try again" returns the region to loading, not the whole page.</p>""",
    "responsive": """<p>The block is centred with a max width and stacks its actions on phones (full width below 30rem). Error pages keep the brand seal and shrink it on phones. Empty states inside cards (<code>.empty-card</code>) or lists (<code>.empty-inline</code>) use the tight size.</p>""",
    "accessibility": """<ul>
<li>Error states are <code>role="alert"</code> so the failure is announced when it replaces the skeleton.</li>
<li>The title is a real heading at the right level for where it sits (h1 when it replaces the whole main content, as in Messages).</li>
<li>After "Clear search", focus returns to the search field; after "Try again", to the region.</li>
<li>Icons are decorative; the title carries the meaning.</li>
</ul>""",
    "content": """<ul>
<li><b>Empty</b>: "No [things] yet." + what will make them appear + the action.</li>
<li><b>No results</b>: "No [things] match “query”." + one suggestion.</li>
<li><b>Error</b>: "[Thing] didn't load." + "We couldn't reach Christian Fitness." + reassurance about what's safe + what to do.</li>
<li>Never blame the person; never show raw codes or stack traces. The reference ("CF-E3K9") is for support only.</li>
</ul>""",
    "do-dont": [
        ("do", FIRST.replace("No messages yet", "No events yet"), "Explain what will appear and offer a way forward."),
        ("dont", '<p class="muted">No data.</p>', "Don't leave a bare \"No data\"."),
        ("do", h3(F.error_block("Messages didn't load", "New messages are safe and will appear when you're reconnected.", retry="#")),
         "Reassure about what's safe and offer Try again."),
        ("dont", '<p class="muted">Error 503: upstream connect error.</p>', "Don't show server errors or codes as the message."),
    ],
    "sources": {
        "mocks": [
            mock("pages/events/empty", "first run"),
            mock("pages/events/no-results", "filter hides all"),
            mock("pages/events/error", "load error with reference"),
            mock("pages/admin-members/no-results", "search echoes the query"),
            mock("pages/messages/empty", "empty state as h1"),
            mock("pages/home/partial", "one panel failed"),
            mock("pages/not-found/default", "404 page"),
            mock("pages/offline/default", "offline page"),
        ],
        "drift": """<ul>
<li>Admin load errors say "Try again in a moment" while member ones say "Check your connection and try again". Staff errors are more often server-side, so the difference may be intended; record it in content guidance or align.</li>
<li>Events no-results uses "Nothing here yet" (the prototype's copy) while admin no-results uses "No members match “Jessica”". Prefer the "No [things] match" formula.</li>
<li>Some error states offer a back link and some don't (admin errors have none).</li>
</ul>""",
    },
}
