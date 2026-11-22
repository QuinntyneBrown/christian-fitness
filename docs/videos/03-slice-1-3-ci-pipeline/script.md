# Transcript: Slice 1.3, CI pipeline

The words of [`narration.json`](narration.json), scene by scene, as the captions write them. The
voice is Kokoro `af_heart`.

**hook** (4 bars)

Slice one point three checks every change to Christian Fitness before it reaches main.

**trigger** (5 bars)

Push to main, or open a pull request, and GitHub Actions starts two jobs side by side. Each checks out only its own folder, and needs no secret.

**frontend** (6 bars)

The frontend job installs, lints, checks the format and builds both apps within their budgets. Then the Playwright behaviour specs run in Chromium, with the shared fixture answering every request.

**backend** (5 bars)

The backend job builds with warnings as errors, then runs the acceptance tests through the API, on an in-memory database.

**fast** (5 bars)

Caches keep npm, NuGet and the browser between runs. Warm, the whole run takes under forty seconds, and each job stops at five minutes.

**lint** (5 bars)

To prove it, lint was broken on purpose. The run failed at the lint step, naming the line, and stopped there.

**more** (6 bars)

Then a compiler warning, a wrong page title and a closed health check. Each failed at its own step, and nothing was retried.

**green** (4 bars)

Put back, both jobs are green again.

**close** (5 bars)

That's slice one point three. Christian Fitness: a Christian community for health in body and spirit.
