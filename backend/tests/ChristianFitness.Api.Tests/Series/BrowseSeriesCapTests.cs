namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-050 AC5 (ADR 0093): at most 100 series are listed, the soonest, with no paging. The class has
/// its store to itself.
/// </summary>
public sealed class BrowseSeriesCapTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_101_listed_series_When_a_member_lists_them_Then_the_100_soonest_come()
    {
        var now = factory.Time.GetUtcNow();
        // One a day from April 16, added latest first, so the order is the API's, not the store's.
        foreach (var n in Enumerable.Range(1, 101).Reverse())
        {
            await factory.AddSeriesAsync(AdminSeries.NewSeries($"Series {n:000}", now), [new(new DateOnly(2026, 4, 15).AddDays(n))]);
        }

        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.cap@example.org");

        var list = await MemberSeries.ListAsync(client, cookie);

        Assert.Equal([.. Enumerable.Range(1, 100).Select(n => $"Series {n:000}")], MemberSeries.TitlesOf(list));
        Assert.Equal(101, await MemberSeries.CountAsync(client, cookie));
    }
}
