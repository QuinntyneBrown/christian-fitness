using System.Net;
using ChristianFitness.Api.Tests.Events;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>L2-071 AC1 (ADR 0080): the list holds at most 100 series, the soonest first; its own store.</summary>
public sealed class ListSeriesCapTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_101_series_When_staff_list_them_Then_the_100_with_the_soonest_sessions_answer()
    {
        var now = factory.Time.GetUtcNow();
        var first = new DateOnly(2026, 4, 16);
        for (var n = 0; n < 101; n++)
        {
            await factory.AddSeriesAsync(AdminSeries.NewSeries($"Series {n:000}", now), [new(first.AddDays(n))]);
        }

        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.cap@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/series", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var titles = (await AdminSeries.JsonAsync(response)).GetProperty("series").EnumerateArray().Select(r => r.GetProperty("title").GetString()).ToList();
        Assert.Equal(100, titles.Count);
        Assert.Equal("Series 000", titles[0]);
        Assert.Equal("Series 099", titles[^1]);
    }
}
