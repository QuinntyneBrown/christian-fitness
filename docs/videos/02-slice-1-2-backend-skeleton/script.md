# Transcript: Slice 1.2, Backend skeleton

The words of [`narration.json`](narration.json), scene by scene, as the captions write them. The
voice is Kokoro `af_heart`; it is given "four oh one", "five hundred" and "C F" to say.

**hook** (4 bars)

Slice one point two gives Christian Fitness its backend, closed until you sign in.

**layers** (6 bars)

Five projects, one direction. Domain holds the entities, Application the rules and the seeds, Infrastructure speaks to Postgres, and the API and the command line sit on top.

**health** (6 bars)

Health answers anyone, in one word. Live means the process runs; ready means the database answers. Here there is none, so it says unhealthy, and nothing more.

**fallback** (6 bars)

Everything else needs a session. Without one, the answer is a 401, as ProblemDetails with a code the screens can branch on, even for a path that doesn't exist.

**errors** (4 bars)

An unexpected error becomes a plain 500, code server_error: no message, no stack trace.

**telemetry** (6 bars)

Open Telemetry records each request by its route template, method and status. The path, the query string and anything personal are dropped before export.

**migrate** (6 bars)

The API never migrates. cf migrate applies the schema, and cf seed adds the first admin from settings. Run it twice, and nothing changes.

**proof** (4 bars)

Every rule failed first, then passed: twenty-one tests, and no real database.

**close** (5 bars)

That's slice one point two. Christian Fitness: a Christian community for health in body and spirit.
