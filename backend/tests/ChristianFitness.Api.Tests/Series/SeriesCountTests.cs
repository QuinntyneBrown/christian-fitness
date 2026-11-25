using System.Net;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-050 AC6 and L2-009 AC11 (ADR 0093): "Series (<count>)" counts the series the Series view
/// lists with no filter: those with a published session still to come. The class has its store to
/// itself, and the test measures the count before and after, so each kind of series moves it or not.
/// </summary>
public sealed class SeriesCountTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_series_with_and_without_a_session_to_come_When_a_member_asks_for_the_count_Then_only_listed_ones_count()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.count@example.org");
        var before = await MemberSeries.CountAsync(client, cookie);

        // Listed: Couch to 5K has Tuesdays to come; a Workshop with one date to come counts too, whatever its category.
        await factory.AddCouchTo5KAsync(AdminSeries.NewSeries("Couch to 5K Run Club", now));
        await factory.AddSeriesAsync(AdminSeries.NewSeries("Prayer Walk Workshop", now, category: EventCategory.Workshop), [new(new DateOnly(2026, 5, 2))]);
        // Not listed: every date past, every date to come cancelled, or no dates at all.
        await factory.AddSeriesAsync(AdminSeries.NewSeries("Winter Hoops", now), [new(new DateOnly(2026, 1, 29)), new(new DateOnly(2026, 2, 26))]);
        await factory.AddSeriesAsync(AdminSeries.NewSeries("Called Off", now), [new(new DateOnly(2026, 4, 1)), new(new DateOnly(2026, 4, 22), Cancelled: true)]);
        await factory.AddSeriesAsync(AdminSeries.NewSeries("No Dates Yet", now), []);

        var after = await MemberSeries.CountAsync(client, cookie);

        Assert.Equal(before + 2, after);
    }

    [Fact]
    public async Task Given_a_visitor_When_they_ask_for_the_count_Then_they_are_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{MemberSeries.Path}/count", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
