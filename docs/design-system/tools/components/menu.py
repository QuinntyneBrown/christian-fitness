from dslib import ex, icon, kbd, matrix, themes

CHECK = icon("check", "menu__check")


def items(prefix: str) -> str:
    return (f'<div class="menu__section" role="none">'
            f'<button class="menu__item" type="button" role="menuitem">{icon("pencil")}Edit event</button>'
            f'<button class="menu__item" type="button" role="menuitem" tabindex="-1">Duplicate</button>'
            f'<button class="menu__item" type="button" role="menuitem" tabindex="-1" aria-disabled="true">Message attendees</button></div>'
            f'<div class="menu__section" role="none">'
            f'<button class="menu__item menu__item--danger" type="button" role="menuitem" tabindex="-1">Cancel event</button></div>')


def open_menu(sfx: str) -> str:
    return (f'<div class="menu-anchor"><button class="btn btn--secondary btn--sm" type="button" id="menu-btn-{sfx}" '
            f'aria-haspopup="menu" aria-expanded="true" aria-controls="menu-{sfx}">Actions</button>'
            f'<div class="menu menu--static" id="menu-{sfx}" role="menu" aria-labelledby="menu-btn-{sfx}">{items(sfx)}</div></div>')


SORT = (f'<div class="menu menu--static" role="menu" aria-label="Sort events">'
        f'<p class="menu__heading" role="presentation">Sort by</p>'
        f'<button class="menu__item" type="button" role="menuitemradio" aria-checked="true">Soonest first{CHECK}</button>'
        f'<button class="menu__item" type="button" role="menuitemradio" aria-checked="false" tabindex="-1">Newest added{CHECK}</button>'
        f'<button class="menu__item" type="button" role="menuitemradio" aria-checked="false" tabindex="-1">Most seats left{CHECK}</button></div>')

SPEC = {
    "lead": "A menu button gathers several actions behind one trigger, so a busy row or header stays calm. Open it, pick one, and it closes.",
    "meta": ["Status: new", "APG Menu button"],
    "overview": f"""<p>Use a menu when one object has three or more secondary actions that do not fit in its row: an admin event row (Edit, Duplicate, Message attendees, Cancel event) or the profile button in the top bar. With one or two actions, show <a href="button.html">buttons</a>. For choosing a value in a form, use a <a href="select.html">select</a> or <a href="radio-group.html">radio group</a>; a menu runs actions, it does not hold a value (except a sort or view choice with <code>menuitemradio</code>).</p>
<ul>
<li><b>Action menu</b>: plain <code>menuitem</code>s, grouped in sections, destructive last in danger colour.</li>
<li><b>Choice menu</b>: <code>menuitemradio</code> with a check on the selected option, under a heading.</li>
</ul>""",
    "anatomy": {
        "figure": open_menu("anat"),
        "callouts": [(20, 10), (60, 40), (60, 75), (60, 90)],
        "parts": [
            ("Trigger", "A button with <code>aria-haspopup=\"menu\"</code> and <code>aria-expanded</code>; its label names the set."),
            ("Menu surface", "Raised surface, <code>--radius-lg</code>, <code>--shadow-2</code> plus a hairline, at <code>--z-dropdown</code>."),
            ("Item", "Full-width button, icon optional, 44px min-height; <code>aria-disabled</code> when unavailable."),
            ("Section divider and danger item", "Sections split by a hairline; the destructive item sits alone at the end."),
        ],
    },
    "variants": ex(open_menu("v1"), "Action menu from an admin event row.", True)
    + ex(SORT, "Choice menu: one option checked.", True),
    "sizes": "<p>One size. Items are 15px with at least 44px height (<code>--target-comfortable</code>); the surface is at least 192px wide and grows to its longest label.</p>",
    "states": {
        "intro": "<p>The trigger is a button and takes its states. Items are shown with forced <code>data-state</code>; real menus move focus with the arrow keys and style <code>:focus-visible</code>.</p>",
        "matrix": matrix([("Default", ""), ("Hover", ' data-state="hover"'), ("Focus", ' data-state="focus"'),
                          ("Disabled", ' aria-disabled="true"'), ("Checked", ' role="menuitemradio" aria-checked="true"')], [
            ("Item", '<div class="menu menu--static" role="menu" aria-label="Example"><button class="menu__item" type="button" role="menuitem"{a}>Duplicate</button></div>',
             {"Checked": None}),
            ("Danger item", '<div class="menu menu--static" role="menu" aria-label="Example"><button class="menu__item menu__item--danger" type="button" role="menuitem"{a}>Cancel event</button></div>',
             {"Checked": None, "Disabled": None}),
            ("Choice item", '<div class="menu menu--static" role="menu" aria-label="Example"><button class="menu__item" type="button" role="menuitemradio" aria-checked="false"{a}>Soonest first' + CHECK + '</button></div>',
             {"Checked": ' aria-checked="true"'}),
        ]) + "<h3>Trigger closed and open</h3>" + ex(
            '<div class="menu-anchor"><button class="btn btn--secondary btn--sm" type="button" aria-haspopup="menu" aria-expanded="false">Actions</button></div>',
            "Closed: <code>aria-expanded=\"false\"</code>, menu <code>hidden</code>.", True),
        "themes": themes(SORT),
        "notes": "<ul><li><b>Open</b> sets <code>aria-expanded=\"true\"</code> on the trigger and removes <code>hidden</code> from the menu.</li><li><b>Disabled</b> items stay focusable with <code>aria-disabled</code> so people learn they exist; activating does nothing.</li></ul>",
    },
    "responsive": "<ul><li>The menu aligns to the trigger's inline end and flips upward when there is no room below.</li><li>Under 640px a long menu may open as a bottom sheet <a href=\"dialog.html\">dialog</a> instead.</li><li>Labels wrap rather than truncate.</li></ul>",
    "theming": "<p>The surface reads <code>--color-bg-surface-raised</code>, which lifts in the dark theme so the menu separates from the page without a heavier shadow. Item hover uses <code>--color-bg-subtle</code>; danger uses <code>--color-danger-fg</code>.</p>",
    "accessibility": {
        "pattern": '<p><a href="https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/">APG Menu button</a>: trigger with <code>aria-haspopup="menu"</code>, <code>aria-expanded</code>, <code>aria-controls</code>; the list has <code>role="menu"</code> labelled by the trigger; items are <code>menuitem</code> or <code>menuitemradio</code> with roving <code>tabindex</code>.</p>',
        "keys": [
            (kbd("Enter") + ", " + kbd("Space") + ", " + kbd("↓"), "On the trigger: opens the menu and focuses the first item."),
            (kbd("↑"), "On the trigger: opens and focuses the last item."),
            (kbd("↓") + " / " + kbd("↑"), "Moves between items, wrapping."),
            (kbd("Home") + " / " + kbd("End"), "First or last item."),
            (kbd("Enter") + ", " + kbd("Space"), "Activates the item and closes the menu."),
            (kbd("Esc"), "Closes and returns focus to the trigger."),
            (kbd("Tab"), "Closes the menu and moves on."),
        ],
        "focus": "<p>Focused items get the subtle background plus an inset 2px <code>--color-focus-ring</code>, so focus never depends on the background alone. Closing returns focus to the trigger.</p>",
        "labelling": "<p>The menu is labelled by its trigger (<code>aria-labelledby</code>). Icon-only triggers name the object: <code>aria-label=\"Actions for Saturday run\"</code>.</p>",
        "pairs": [
            ("Item on raised surface", "--color-fg-default", "--color-bg-surface-raised", 4.5),
            ("Danger item", "--color-danger-fg", "--color-bg-surface-raised", 4.5),
            ("Heading", "--color-fg-muted", "--color-bg-surface-raised", 4.5),
            ("Focus ring on subtle", "--color-focus-ring", "--color-bg-subtle", 3),
        ],
        "motion": "<p>Opens with a 4px fade-down over <code>--duration-base</code> (<code>--ease-enter</code>); reduced motion zeroes it. Closing is instant.</p>",
        "touch": "<p>Items are at least 44px tall. Tapping outside closes the menu.</p>",
    },
    "content": "<ul><li>Items are verbs: \"Edit event\", \"Duplicate\", \"Cancel event\".</li><li>Destructive items name what is lost and open a confirmation.</li><li>Choice headings are short: \"Sort by\".</li><li>Trigger label names the set (\"Actions\") or, if icon-only, the object.</li></ul>",
    "dodont": [
        ("do", SORT, "Choice menus show the current option with a check and <code>aria-checked</code>."),
        ("dont", '<div class="menu menu--static" role="menu" aria-label="Example"><button class="menu__item" type="button" role="menuitem">Edit event</button></div>',
         "A menu for a single action hides it; show a button."),
        ("do", '<div class="menu menu--static" role="menu" aria-label="Example"><button class="menu__item" type="button" role="menuitem">Duplicate</button><div class="menu__section" role="none"><button class="menu__item menu__item--danger" type="button" role="menuitem">Cancel event</button></div></div>',
         "Destructive action last, in its own section."),
        ("dont", '<div class="menu menu--static" role="menu" aria-label="Example"><button class="menu__item menu__item--danger" type="button" role="menuitem">Cancel event</button><button class="menu__item" type="button" role="menuitem">Duplicate</button></div>',
         "A destructive first item is one slip away from harm."),
    ],
    "tokens": [
        ("Surface", "--color-bg-surface-raised", "color"),
        ("Surface border", "--color-border-default", "color"),
        ("Item hover / focus", "--color-bg-subtle", "color"),
        ("Item focus ring", "--color-focus-ring", "color"),
        ("Danger item", "--color-danger-fg", "color"),
        ("Disabled item", "--color-fg-disabled", "color"),
        ("Check / icon", "--color-fg-accent / --color-fg-muted", "color"),
        ("Shadow", "--shadow-2", "value"),
        ("Radius", "--radius-lg", "value"),
        ("Stacking", "--z-dropdown", "value"),
        ("Item height", "--target-comfortable", "value"),
        ("Open motion", "--duration-base / --ease-enter", "value"),
    ],
    "code": {
        "snippet": '''<div class="menu-anchor">
  <button class="btn btn--secondary btn--sm" type="button" id="row-actions"
          aria-haspopup="menu" aria-expanded="false" aria-controls="row-menu">Actions</button>
  <div class="menu" id="row-menu" role="menu" aria-labelledby="row-actions" hidden>
    <div class="menu__section" role="none">
      <button class="menu__item" type="button" role="menuitem">Edit event</button>
      <button class="menu__item" type="button" role="menuitem" tabindex="-1">Duplicate</button>
    </div>
    <div class="menu__section" role="none">
      <button class="menu__item menu__item--danger" type="button" role="menuitem" tabindex="-1">Cancel event</button>
    </div>
  </div>
</div>''',
        "classes": [
            ("<code>.menu-anchor</code>", "Positions the menu relative to its trigger."),
            ("<code>.menu</code> <code>.menu--static</code>", "The surface; static for documentation and inline use."),
            ("<code>.menu__section</code> <code>.menu__heading</code>", "Groups with a hairline between; overline heading."),
            ("<code>.menu__item</code> <code>.menu__item--danger</code>", "An action; destructive action."),
            ("<code>.menu__check</code> <code>.menu__shortcut</code>", "Check shown when <code>aria-checked=\"true\"</code>; trailing shortcut hint."),
            ("<code>aria-expanded</code> · <code>aria-disabled</code> · <code>aria-checked</code>", "Open trigger; unavailable item; selected choice."),
        ],
    },
    "sources": {
        "mocks": [],
        "drift": "No mock uses a menu yet. It was added from the core component set for admin row actions and the profile button; rules follow the APG menu button pattern.",
    },
}
