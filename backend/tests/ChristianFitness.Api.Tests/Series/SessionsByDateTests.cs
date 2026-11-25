using System.Text.Json;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-009 AC1 (ADR 0080, ADR 0093): By date lists only each series' next session among those that
/// match the selection, like any other event, with its series, its number and total among all the
/// series' dates (cancelled ones included) and the cadence. A standalone event has no series. The
/// class has its store to itself, so the list is exactly these events.
/// </summary>
public sealed class SessionsByDateTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private const string Grace = "grace.series.bydate@example.org";

    [Fact]
    public async Task Given_series_and_standalone_events_When_a_member_lists_by_date_Then_each_series_shows_its_next_session_with_its_place_in_the_series()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, Grace);
        var couch = AdminSeries.NewSeries("Couch to 5K Run Club", now);
        var couchSessions = await factory.AddCouchTo5KAsync(couch);
        var hoops = AdminSeries.NewSeries("Women's Hoops & Devotion", now, category: EventCategory.Basketball);
        // Two dates three weeks apart: "2 dates"; the first (April 23) is next.
        var hoopsSessions = await factory.AddSeriesAsync(hoops, [new(new DateOnly(2026, 4, 23), StartHour: 19, StartMinute: 0), new(new DateOnly(2026, 5, 14), StartHour: 19, StartMinute: 0)]);
        var sunrise = await AddEventAsync("Easter Sunrise 5K", AdminSeries.At(new DateOnly(2026, 4, 18), 6, 45));
        var retreat = await AddEventAsync("Whole Life Retreat", AdminSeries.At(new DateOnly(2026, 5, 22), 16, 0));

        var page = await MemberSeries.EventsAsync(client, cookie);

        var events = page.GetProperty("events").EnumerateArray().ToList();
        Assert.Equal(
            [sunrise, couchSessions[2], hoopsSessions[0], retreat],
            events.Select(e => Guid.Parse(e.GetProperty("id").GetString()!)));
        Assert.Equal(JsonValueKind.Null, events[0].GetProperty("series").ValueKind);
        var tag = events[1].GetProperty("series");
        Assert.Equal(["id", "title", "number", "total", "cadence"], AdminSeries.Keys(tag));
        Assert.Equal(couch.Id.ToString(), tag.GetProperty("id").GetString());
        Assert.Equal("Couch to 5K Run Club", tag.GetProperty("title").GetString());
        // April 21 is the third of eight dates, May 12's cancelled one counted (ADR 0080).
        Assert.Equal(3, tag.GetProperty("number").GetInt32());
        Assert.Equal(8, tag.GetProperty("total").GetInt32());
        Assert.Equal(2, tag.GetProperty("cadence").GetProperty("weekday").GetInt32());
        Assert.Equal(7, tag.GetProperty("cadence").GetProperty("dates").GetInt32());
        var hoopsTag = events[2].GetProperty("series");
        Assert.Equal(1, hoopsTag.GetProperty("number").GetInt32());
        Assert.Equal(2, hoopsTag.GetProperty("total").GetInt32());
        Assert.Equal(JsonValueKind.Null, hoopsTag.GetProperty("cadence").GetProperty("weekday").ValueKind);

        // Only events I'm going to: a place at a later date only lists that date, May 19, the seventh
        // date counting the cancelled May 12.
        await RegisterAsync(couchSessions[6], Grace);
        var going = await MemberSeries.EventsAsync(client, cookie, "going=true");
        var mine = going.GetProperty("events").EnumerateArray().ToList();
        Assert.Equal([couchSessions[6]], mine.Select(e => Guid.Parse(e.GetProperty("id").GetString()!)));
        Assert.Equal(7, mine[0].GetProperty("series").GetProperty("number").GetInt32());
    }

    private async Task<Guid> AddEventAsync(string title, DateTimeOffset startsAt)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var e = Event.CreateDraft(title, EventCategory.Run, startsAt, "Martin Goodman Trail", "Waterfront, Toronto", 0, 50, "Come run with us.", factory.Time.GetUtcNow());
        e.Publish();
        db.Events.Add(e);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return e.Id;
    }

    private async Task RegisterAsync(Guid eventId, string email)
    {
        var memberId = await MemberSeries.MemberIdAsync(factory, email);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Registrations.Add(Registration.Of(eventId, memberId, 0, factory.Time.GetUtcNow()));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
