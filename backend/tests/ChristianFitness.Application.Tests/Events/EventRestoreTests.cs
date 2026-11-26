using System.Globalization;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// ADR 0103: <see cref="Event.Restore"/> makes a cancelled series date published again only while
/// its start is after now, and bumps the registrations token; a standalone event's cancellation
/// stays final (L2-023). One case per row. Now is April 15, 2026, noon in Toronto.
/// </summary>
public sealed class EventRestoreTests
{
    private static readonly DateTimeOffset Now = At("2026-04-15", "12:00");

    private static DateTimeOffset At(string date, string time = "18:30") =>
        EventSchedule.StartOf(DateOnly.Parse(date, CultureInfo.InvariantCulture), TimeOnly.Parse(time, CultureInfo.InvariantCulture));

    public static TheoryData<string, bool, bool, string, bool> Rows() => new()
    {
        // why, a session, cancelled, its start, restored
        { "a cancelled session to come", true, true, "2026-05-12@18:30", true },
        { "a cancelled session one minute ahead", true, true, "2026-04-15@12:01", true },
        { "a cancelled session starting now", true, true, "2026-04-15@12:00", false },
        { "a cancelled session that has started", true, true, "2026-04-14@18:30", false },
        { "a published session", true, false, "2026-05-12@18:30", false },
        { "a cancelled standalone event", false, true, "2026-05-12@18:30", false },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public void Given_an_event_When_it_is_restored_Then_it_follows_the_table(string why, bool session, bool cancelled, string start, bool restored)
    {
        var parts = start.Split('@');
        var startsAt = At(parts[0], parts[1]);
        var series = EventSeries.Create("Couch to 5K", EventCategory.Run, "Eight weeks.", null, Domain.Directory.DirectoryListing.TeamListingId, 0, 0, 40, "Humber Bay", "Etobicoke", Now.AddDays(-30));
        var e = session
            ? Event.CreateSession(series, startsAt, startsAt.AddHours(1), null, Now.AddDays(-30))
            : Event.CreateDraft("Retreat", EventCategory.Retreat, startsAt, "Muskoka", "Muskoka", 0, 40, "Rest.", Now.AddDays(-30));
        if (!session)
        {
            e.Publish();
        }

        if (cancelled)
        {
            e.Cancel();
        }

        var version = e.RegistrationVersion;

        if (restored)
        {
            e.Restore(Now);
            Assert.Equal((EventStatus.Published, version + 1), (e.Status, e.RegistrationVersion));
        }
        else
        {
            var status = e.Status;
            Assert.Throws<InvalidOperationException>(() => e.Restore(Now));
            Assert.Equal((status, version), (e.Status, e.RegistrationVersion));
        }

        _ = why;
    }
}
