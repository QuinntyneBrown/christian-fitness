# Transcript: Slice 29.2, Audit staff changes

The words of [`narration.json`](narration.json), scene by scene. The voice is Kokoro `af_heart`.

**hook** (5 bars)

Every staff change now leaves a record: who made it, what it was, which record it changed, and when.

**signin** (5 bars)

Starting a staff session is the first change on the books. When the code is right, one audit entry is written, with the time from the server's clock.

**signout** (4 bars)

Signing out is audited too. The staff member is read before the session ends.

**refused** (4 bars)

A wrong password, a wrong code, or a sign-in left halfway records nothing.

**pipeline** (6 bars)

Behind it is one step in the command pipeline. A staff command carries a marker, its handler names the person and the record, and the change is saved with its entry.

**forget** (4 bars)

Forget to name the record, and the command fails, so nothing changes unaudited.

**table** (4 bars)

The entry keeps identifiers only. No name, no email, no field values.

**telemetry** (4 bars)

Telemetry hears the action's name, and never who, or which record.

**proof** (3 bars)

Every test failed first. Now they all pass.

**left** (3 bars)

Next, creating an event joins the trail.

**close** (5 bars)

That's slice twenty-nine point two. Christian Fitness: a Christian community for health in body and spirit.
