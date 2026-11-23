# Transcript: Slice 1.6, Design-system layout, navigation and migration

The words of [`narration.json`](narration.json), scene by scene. The voice is Kokoro `af_heart`.

**hook** (5 bars)

Slice one point six finishes the design system, and every screen is now built from the one shared library.

**removed** (5 bars)

Fourteen screen-specific copies are gone. The form alert is now the alert, the app header is the top bar, and the admin layout is built from the sidebar navigation.

**member** (4 bars)

Every member screen starts with a skip link. Then the top bar: the lockup, your profile, and Sign out.

**admin** (5 bars)

The admin console starts with the same skip link. Its sidebar becomes a band below a thousand and twenty-four pixels, the links scrolling within it.

**profile** (5 bars)

Your profile is now container, split, avatar, lists and tags. Loading and failing use the shared skeleton and empty state.

**forms** (4 bars)

Sign in and Join take the shared alert, links and interest list. A busy button draws its own spinner.

**ready** (4 bars)

The tab bar, breadcrumb and footer wait for the screens that need them, each proven by its own tests.

**proof** (4 bars)

Every Playwright spec passes, asserting what it did before, and both apps start exactly as before.

**close** (5 bars)

That's slice one point six. Christian Fitness: a Christian community for health in body and spirit.
