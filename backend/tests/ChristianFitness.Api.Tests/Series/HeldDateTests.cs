using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-052 AC10 (ADR 0103): when staff cancel a date a member holds a place at, the member's series
/// page reads it "cancelled" and their place there ends; when staff restore it, it is upcoming and
/// their place is held again. Today is April 15, 2026; the member holds May 5.
/// </summary>
public sealed class HeldDateTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private const int May5 = 4;

    private static async Task<JsonElement> May5Async(HttpClient client, string cookie, Guid seriesId)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{MemberSeries.Path}/{seriesId}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("sessions")[May5];
    }

    private static (string?, bool) Read(JsonElement session) =>
        (session.GetProperty("state").GetString(), session.GetProperty("held").GetBoolean());

    [Fact]
    public async Task Given_a_member_holding_May_5_When_staff_cancel_then_restore_it_Then_their_page_reads_cancelled_with_no_place_then_upcoming_with_it_held()
    {
        const string email = "ivy.series.held@example.org";
        var (member, memberCookie) = await MemberSeries.MemberAsync(factory, email);
        var series = AdminSeries.NewSeries("Couch Held", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        await MemberSeries.EnrolAsync(factory, series, email);
        await factory.AddRegistrationsAsync([(sessions[May5], await MemberSeries.MemberIdAsync(factory, email))]);
        using var staff = Browser.CreateClient(factory);
        var staffCookie = await AdminSeries.SignInAsync(factory, staff, "dana.series.held@example.org");
        Assert.Equal(("upcoming", true), Read(await May5Async(member, memberCookie, series.Id)));

        using (var cancel = await AdminEvents.SendAsync(staff, HttpMethod.Post, $"/api/admin/series/{series.Id}/sessions/{sessions[May5]}/cancel", staffCookie))
        {
            Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
        }

        Assert.Equal(("cancelled", false), Read(await May5Async(member, memberCookie, series.Id)));

        using (var restore = await AdminEvents.SendAsync(staff, HttpMethod.Post, $"/api/admin/series/{series.Id}/sessions/{sessions[May5]}/restore", staffCookie))
        {
            Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
        }

        Assert.Equal(("upcoming", true), Read(await May5Async(member, memberCookie, series.Id)));
        member.Dispose();
    }
}
