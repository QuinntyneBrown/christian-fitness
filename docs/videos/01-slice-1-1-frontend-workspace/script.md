# Transcript: Slice 1.1, Frontend workspace

The words of [`narration.json`](narration.json), scene by scene. The voice is Kokoro `af_heart`.

**hook** (4 bars)

Christian Fitness starts here: one Angular workspace for both apps.

**tree** (6 bars)

Two apps side by side, one for members and one for staff, with three libraries: components for presentation, domain for pure rules, and api for contracts.

**direction** (6 bars)

Dependencies point one way. The apps use the libraries, components see only api types, and no library imports an app. Break the rule, and lint fails.

**boot** (6 bars)

Both apps boot to one empty main landmark, titled Christian Fitness, and Christian Fitness Admin. Light or dark, the canvas comes from the design system.

**foundations** (5 bars)

Each app carries its own copy of the tokens, and of Barlow and Barlow Condensed, self-hosted, never fetched from another site.

**budget** (5 bars)

Every route loads lazily. The first load is two hundred and twelve kilobytes, under a budget of two hundred and fifty.

**fixture** (6 bars)

No backend runs in a spec. The shared fixture answers the API itself, and fails on an unanswered request, a request off localhost, or a page error.

**proof** (4 bars)

Both boot specs failed first, reading Web and Admin. Then they passed.

**close** (5 bars)

That's slice one point one. Christian Fitness: a Christian community for health in body and spirit.
