# Transcript: Slice 9.3, Idle expiry and forbidden

The words of [`narration.json`](narration.json), scene by scene. The voice is Kokoro `af_heart`.

**hook** (5 bars)

Leave the admin console alone for half an hour, and it signs you out. Come back, and it tells you why.

**idle** (5 bars)

Every request keeps a staff session open for thirty more minutes. The first one after thirty quiet minutes is refused, and the session ends on the server.

**notice** (5 bars)

Moving to another area checks the session. If it has expired, Staff sign in opens and says so. A first visit, or a reload, says nothing.

**forbidden** (5 bars)

When the API refuses something staff may not see, the Staff only screen takes its place. Its heading takes focus, and the address bar keeps where they were going.

**signout** (4 bars)

Sign out ends that session. While it waits, the button says Signing out.

**paused** (5 bars)

Five wrong passwords in fifteen minutes now pause staff sign-in too, counted together with the member app.

**api** (5 bars)

On the server, the session renews on every request, not only after half its lifetime. A refused attempt is never counted, so nobody can stretch the pause.

**proof** (3 bars)

Every test failed first. Now they all pass.

**left** (3 bars)

Next, Admin and Moderator roles.

**close** (5 bars)

That's slice nine point three. Christian Fitness: a Christian community for health in body and spirit.
