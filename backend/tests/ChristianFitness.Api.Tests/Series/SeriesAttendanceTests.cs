using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-051 AC3, L2-052 AC3 and L2-080 AC7 (ADR 0106): a member's series page reads, for each
/// session, whether staff recorded that they came (<c>true</c>), that they did not (<c>false</c>), or
/// nothing yet (<c>null</c>), from their own attendance only. Today is April 15, 2026, so April 7 and
/// 14 are done.
/// </summary>
public sealed class SeriesAttendanceTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private static async Task<JsonElement[]> SessionsAsync(HttpClient client, string cookie, Guid seriesId)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{MemberSeries.Path}/{seriesId}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return [.. (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("sessions").EnumerateArray()];
    }

    private static bool? AttendedOf(JsonElement session) =>
        session.GetProperty("attended").ValueKind == JsonValueKind.Null ? null : session.GetProperty("attended").GetBoolean();

    private static async Task MarkAsync(HttpClient staff, string cookie, Guid sessionId, Guid memberId, bool came)
    {
        using var response = await AdminEvents.SendAsync(staff, HttpMethod.Put, $"/api/admin/events/{sessionId}/attendance/{memberId}", cookie, new { came });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Given_staff_recorded_one_session_came_and_one_missed_When_the_member_opens_the_series_Then_each_reads_as_recorded_and_the_rest_unrecorded()
    {
        const string email = "ivy.series.attended@example.org";
        const string otherEmail = "omar.series.attended@example.org";
        var (member, cookie) = await MemberSeries.MemberAsync(factory, email);
        var (other, otherCookie) = await MemberSeries.MemberAsync(factory, otherEmail);
        var series = AdminSeries.NewSeries("Couch Attended", factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var ivy = await MemberSeries.MemberIdAsync(factory, email);
        var omar = await MemberSeries.MemberIdAsync(factory, otherEmail);
        await factory.AddRegistrationsAsync([(sessions[0], ivy), (sessions[1], ivy), (sessions[2], ivy), (sessions[0], omar)]);
        Assert.All(await SessionsAsync(member, cookie, series.Id), session => Assert.Null(AttendedOf(session)));
        using var staff = Browser.CreateClient(factory);
        var staffCookie = await AdminSeries.SignInAsync(factory, staff, "dana.series.attended@example.org");

        await MarkAsync(staff, staffCookie, sessions[0], ivy, came: true);
        await MarkAsync(staff, staffCookie, sessions[1], ivy, came: false);
        await MarkAsync(staff, staffCookie, sessions[0], omar, came: false);

        var mine = await SessionsAsync(member, cookie, series.Id);
        Assert.Contains("attended", mine[0].EnumerateObject().Select(p => p.Name));
        Assert.Equal([true, false, null, null, null, null, null, null], mine.Select(AttendedOf));
        Assert.Equal([false, null, null, null, null, null, null, null], (await SessionsAsync(other, otherCookie, series.Id)).Select(AttendedOf));
        member.Dispose();
        other.Dispose();
    }
}
