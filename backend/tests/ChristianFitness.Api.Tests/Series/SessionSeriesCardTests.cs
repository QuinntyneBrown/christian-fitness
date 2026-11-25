using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-010 AC5 (ADR 0080, ADR 0096): a session's event page carries its series: its number of the
/// total (cancelled dates included), the cadence, the title, whether the member joined it, and up to
/// the next three dates after this one, a cancelled date included and counted. The register and
/// cancel answers carry it too.
/// </summary>
public sealed class SessionSeriesCardTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    [Fact]
    public async Task Given_the_third_of_Couch_to_5K_When_a_member_opens_it_Then_it_carries_the_series_and_the_next_three_dates_a_cancelled_one_included()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "ada.session.card@example.org");
        var couch = AdminSeries.NewSeries("Couch to 5K Card", now);
        var ids = await factory.AddCouchTo5KAsync(couch);

        var e = await OpenAsync(client, cookie, ids[2]);

        var series = e.GetProperty("series");
        Assert.Equal(["id", "title", "number", "total", "cadence", "joined", "next"], AdminSeries.Keys(series));
        Assert.Equal(couch.Id.ToString(), series.GetProperty("id").GetString());
        Assert.Equal("Couch to 5K Card", series.GetProperty("title").GetString());
        Assert.Equal((3, 8), (series.GetProperty("number").GetInt32(), series.GetProperty("total").GetInt32()));
        Assert.Equal(2, series.GetProperty("cadence").GetProperty("weekday").GetInt32());
        Assert.Equal(7, series.GetProperty("cadence").GetProperty("dates").GetInt32());
        Assert.False(series.GetProperty("joined").GetBoolean());
        var next = series.GetProperty("next").EnumerateArray().ToList();
        Assert.Equal(["id", "startsAt", "topic", "cancelled"], AdminSeries.Keys(next[0]));
        Assert.Equal([ids[3].ToString(), ids[4].ToString(), ids[5].ToString()], next.Select(n => n.GetProperty("id").GetString()));
        Assert.Equal(AdminSeries.At(new DateOnly(2026, 4, 28)), next[0].GetProperty("startsAt").GetDateTimeOffset());
        Assert.Equal(["First 5-minute run", "Two 8-minute runs", "No class: Victoria Day week"], next.Select(n => n.GetProperty("topic").GetString()));
        Assert.Equal([false, false, true], next.Select(n => n.GetProperty("cancelled").GetBoolean()));
    }

    [Fact]
    public async Task Given_the_last_but_one_date_When_a_member_who_joined_opens_it_Then_one_date_follows_and_joined_is_true()
    {
        var now = factory.Time.GetUtcNow();
        const string email = "bea.session.card@example.org";
        var (client, cookie) = await MemberSeries.MemberAsync(factory, email);
        var couch = AdminSeries.NewSeries("Couch to 5K Joined Card", now);
        var ids = await factory.AddCouchTo5KAsync(couch);
        await MemberSeries.EnrolAsync(factory, couch, email);

        var series = (await OpenAsync(client, cookie, ids[6])).GetProperty("series");

        Assert.Equal(7, series.GetProperty("number").GetInt32());
        Assert.True(series.GetProperty("joined").GetBoolean());
        Assert.Equal([ids[7].ToString()], series.GetProperty("next").EnumerateArray().Select(n => n.GetProperty("id").GetString()));
    }

    [Fact]
    public async Task Given_a_session_When_a_member_registers_and_cancels_Then_both_answers_carry_its_series()
    {
        var now = factory.Time.GetUtcNow();
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "cy.session.card@example.org");
        var couch = AdminSeries.NewSeries("Couch to 5K Register Card", now);
        var ids = await factory.AddCouchTo5KAsync(couch);

        using var registered = await Browser.SendAsync(client, HttpMethod.Post, $"/api/events/{ids[3]}/registrations", cookie);
        Assert.Equal(HttpStatusCode.OK, registered.StatusCode);
        var afterRegister = await registered.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        using var cancelled = await Browser.SendAsync(client, HttpMethod.Delete, $"/api/events/{ids[3]}/registrations/me", cookie);
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        var afterCancel = await cancelled.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

        Assert.Equal(4, afterRegister.GetProperty("series").GetProperty("number").GetInt32());
        Assert.Equal(4, afterCancel.GetProperty("series").GetProperty("number").GetInt32());
    }

    private static async Task<JsonElement> OpenAsync(HttpClient client, string cookie, Guid id)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/events/{id}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}
