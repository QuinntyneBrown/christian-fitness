# Transcript: Slice 1.5, Design-system feedback, overlays and content

The words of [`narration.json`](narration.json), scene by scene. The voice is Kokoro `af_heart`.

**hook** (4 bars)

Slice one point five builds the design system's feedback, overlays and content, once.

**catalogue** (6 bars)

Twenty-one components, each under its design-system name: alerts, toasts, dialogs, menus, cards, lists, tables, tabs and messages. Every screen will reuse them.

**feedback** (6 bars)

A danger alert is announced at once, with role alert. Good news waits politely, as a status. The toast region keeps one polite live region, and an alert for each failure.

**overlays** (6 bars)

The dialog and drawer are shells for the CDK Dialog a screen will open. The menu button moves with the arrow keys, Home and End, and Escape returns focus to its trigger.

**content** (6 bars)

Pagination and tabs are real links, marked with aria current, so Back and new tabs still work. The table has a caption and column headers, and scrolls in its own region.

**tests** (6 bars)

No screen uses them yet, so each is proven through the page: roles, names, focus and keys. A hundred and forty tests pass. Each key rule was broken on purpose, and its test went red.

**budget** (5 bars)

And nothing grew. Both apps start exactly as before, well inside their two hundred and seventy-five kilobyte budgets.

**next** (4 bars)

Next, slice one point six moves every built screen onto these components.

**close** (5 bars)

That's slice one point five. Christian Fitness: a Christian community for health in body and spirit.
