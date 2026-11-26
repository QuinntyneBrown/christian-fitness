using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-080 AC2, AC4, AC5, AC8 and AC9 (ADR 0106): staff, Admin or Moderator, tick or clear a
/// registered member's Came box on a started event; it is saved for that member at that event
/// only, can be changed later, leaves the registrations alone and is audited once per change. An
/// event not started, a member not registered, an unknown event, a member and nobody are refused,
/// and a refusal records nothing.
/// </summary>
public sealed class RecordAttendanceTests(AttendanceFactory factory) : IClassFixture<AttendanceFactory>
{
    private static string AttendancePath(Guid id) => $"/api/admin/events/{id}/attendance";

    private static string MarkPath(Guid id, Guid memberId) => $"/api/admin/events/{id}/attendance/{memberId}";

    private async Task<(HttpClient Client, string Cookie, Guid Id)> MemberAsync(string email, string name)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        return (client, cookie, await factory.MemberIdAsync(email));
    }

    private async Task<(HttpClient Client, string Cookie, Guid Id)> StaffAsync(string email, StaffRoleName role = StaffRoleName.Admin)
    {
        var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, email, role));
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return (client, Staff.Cookie(signedIn), id);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string cookie, string path)
    {
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static Task<HttpResponseMessage> MarkAsync(HttpClient client, string? cookie, Guid id, Guid memberId, bool came) =>
        AdminEvents.SendAsync(client, HttpMethod.Put, MarkPath(id, memberId), cookie, new { came });

    private static async Task<string?> CodeOfAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString();

    /// <summary>The audit entries of <paramref name="eventId"/>, oldest first, as (actor, action, record type).</summary>
    private async Task<List<(Guid Actor, string Action, string RecordType)>> AuditOfAsync(Guid eventId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entries = await db.AuditEntries.AsNoTracking().Where(e => e.RecordId == eventId).ToListAsync(TestContext.Current.CancellationToken);
        return [.. entries.OrderBy(e => e.OccurredAt).ThenBy(e => e.Id).Select(e => (e.ActorMemberId, e.Action, e.RecordType))];
    }

    /// <summary>Every attendance row of <paramref name="eventId"/>, as (member, came, recorded by, recorded at).</summary>
    private async Task<List<(Guid Member, bool Came, Guid By, DateTimeOffset At)>> RowsOfAsync(Guid eventId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rows = await db.Attendances.AsNoTracking().Where(a => a.EventId == eventId).ToListAsync(TestContext.Current.CancellationToken);
        return [.. rows.OrderBy(a => a.RecordedAt).Select(a => (a.MemberId, a.Came, a.RecordedBy, a.RecordedAt))];
    }

    [Fact]
    public async Task Given_a_started_event_When_an_Admin_ticks_a_registered_member_Then_it_is_saved_for_them_at_that_event_only_and_audited()
    {
        var id = await factory.AddEventAsync("Ticked Morning", startsIn: TimeSpan.FromMinutes(-10));
        var other = await factory.AddEventAsync("Other Ticked Morning", startsIn: TimeSpan.FromMinutes(-10));
        var (_, _, grace) = await MemberAsync("grace.tick@example.org", "Grace Thompson");
        var (_, _, marcus) = await MemberAsync("marcus.tick@example.org", "Marcus Bell");
        await factory.RegisterAsync(id, grace);
        await factory.RegisterAsync(id, marcus);
        await factory.RegisterAsync(other, grace);
        var (staff, cookie, dana) = await StaffAsync("dana.tick@example.org");
        var registrationsBefore = await ReadAsync(staff, cookie, $"/api/admin/events/{id}/registrations");

        using var response = await MarkAsync(staff, cookie, id, grace, came: true);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var answer = await ReadAsync(staff, cookie, AttendancePath(id));
        Assert.Equal((2, 1), (answer.GetProperty("registered").GetInt32(), answer.GetProperty("came").GetInt32()));
        Assert.Equal(
            [("Grace Thompson", true), ("Marcus Bell", false)],
            answer.GetProperty("items").EnumerateArray().Select(i => (i.GetProperty("name").GetString(), i.GetProperty("came").GetBoolean())));
        Assert.Equal(0, (await ReadAsync(staff, cookie, AttendancePath(other))).GetProperty("came").GetInt32());
        Assert.Equal([(grace, true, dana, factory.Time.GetUtcNow())], await RowsOfAsync(id));
        Assert.Equal([(dana, "event.attendance_recorded", "Event")], await AuditOfAsync(id));
        // Registrations and going do not move when attendance does (AC8).
        var registrationsAfter = await ReadAsync(staff, cookie, $"/api/admin/events/{id}/registrations");
        Assert.Equal(registrationsBefore.GetRawText(), registrationsAfter.GetRawText());
    }

    [Fact]
    public async Task Given_a_tick_When_a_Moderator_clears_it_later_Then_the_member_is_recorded_as_not_come_and_each_change_is_audited()
    {
        var id = await factory.AddEventAsync("Cleared Morning", startsIn: TimeSpan.FromMinutes(-10));
        var (_, _, hannah) = await MemberAsync("hannah.clear@example.org", "Hannah Kim");
        await factory.RegisterAsync(id, hannah);
        var (admin, adminCookie, dana) = await StaffAsync("dana.clear@example.org");
        var (moderator, moderatorCookie, joel) = await StaffAsync("joel.clear@example.org", StaffRoleName.Moderator);
        using (var ticked = await MarkAsync(admin, adminCookie, id, hannah, came: true))
        {
            Assert.Equal(HttpStatusCode.NoContent, ticked.StatusCode);
        }

        factory.Time.Advance(TimeSpan.FromMinutes(5));
        using var cleared = await MarkAsync(moderator, moderatorCookie, id, hannah, came: false);

        Assert.Equal(HttpStatusCode.NoContent, cleared.StatusCode);
        var answer = await ReadAsync(moderator, moderatorCookie, AttendancePath(id));
        Assert.Equal((0, false), (answer.GetProperty("came").GetInt32(), answer.GetProperty("items")[0].GetProperty("came").GetBoolean()));
        Assert.Equal([(hannah, false, joel, factory.Time.GetUtcNow())], await RowsOfAsync(id));
        Assert.Equal([(dana, "event.attendance_recorded", "Event"), (joel, "event.attendance_recorded", "Event")], await AuditOfAsync(id));
    }

    [Fact]
    public async Task Given_a_member_already_recorded_as_came_When_staff_tick_them_again_Then_nothing_changes_and_nothing_more_is_audited()
    {
        var id = await factory.AddEventAsync("Repeated Morning", startsIn: TimeSpan.FromMinutes(-10));
        var (_, _, ruth) = await MemberAsync("ruth.repeat@example.org", "Ruth Adeyemi");
        await factory.RegisterAsync(id, ruth);
        var (staff, cookie, dana) = await StaffAsync("dana.repeat@example.org");
        using (var first = await MarkAsync(staff, cookie, id, ruth, came: true))
        {
            Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        }

        var recorded = await RowsOfAsync(id);
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var again = await MarkAsync(staff, cookie, id, ruth, came: true);

        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal(recorded, await RowsOfAsync(id));
        Assert.Equal([(dana, "event.attendance_recorded", "Event")], await AuditOfAsync(id));
    }

    [Fact]
    public async Task Given_an_event_that_has_not_started_When_staff_tick_a_member_Then_it_is_refused_with_event_not_started_and_nothing_is_recorded()
    {
        var id = await factory.AddEventAsync("Early Morning", startsIn: TimeSpan.FromSeconds(1));
        var (_, _, naomi) = await MemberAsync("naomi.early@example.org", "Naomi Wright");
        await factory.RegisterAsync(id, naomi);
        var (staff, cookie, _) = await StaffAsync("dana.early@example.org");

        using var response = await MarkAsync(staff, cookie, id, naomi, came: true);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("event_not_started", await CodeOfAsync(response));
        Assert.Empty(await RowsOfAsync(id));
        Assert.Empty(await AuditOfAsync(id));
    }

    [Fact]
    public async Task Given_a_member_not_registered_at_the_event_When_staff_tick_them_Then_it_is_refused_with_not_registered()
    {
        var id = await factory.AddEventAsync("Unregistered Morning", startsIn: TimeSpan.FromMinutes(-10));
        var other = await factory.AddEventAsync("Elsewhere Morning", startsIn: TimeSpan.FromMinutes(-10));
        var (_, _, isaac) = await MemberAsync("isaac.unregistered@example.org", "Isaac Foster");
        await factory.RegisterAsync(other, isaac);
        var (staff, cookie, _) = await StaffAsync("dana.unregistered@example.org");

        using var response = await MarkAsync(staff, cookie, id, isaac, came: true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_registered", await CodeOfAsync(response));
        Assert.Empty(await RowsOfAsync(id));
        Assert.Empty(await AuditOfAsync(id));
    }

    [Fact]
    public async Task Given_an_unknown_event_When_staff_tick_a_member_Then_it_is_refused_with_event_not_found()
    {
        var (_, _, lydia) = await MemberAsync("lydia.unknown@example.org", "Lydia Brooks");
        var (staff, cookie, _) = await StaffAsync("dana.tickunknown@example.org");

        using var response = await MarkAsync(staff, cookie, Guid.NewGuid(), lydia, came: true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("event_not_found", await CodeOfAsync(response));
    }

    [Fact]
    public async Task Given_a_member_or_nobody_When_they_tick_Then_they_are_refused_and_nothing_is_recorded()
    {
        var id = await factory.AddEventAsync("Self Check-in Morning", startsIn: TimeSpan.FromMinutes(-10));
        var (member, memberCookie, peter) = await MemberAsync("peter.self@example.org", "Peter Nguyen");
        await factory.RegisterAsync(id, peter);
        using var anonymous = Browser.CreateClient(factory);

        using var asMember = await MarkAsync(member, memberCookie, id, peter, came: true);
        using var asNobody = await MarkAsync(anonymous, null, id, peter, came: true);

        // A member session is not a staff session: the admin area answers it as it answers nobody (ADR 0011).
        Assert.Equal((HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized), (asMember.StatusCode, asNobody.StatusCode));
        Assert.Empty(await RowsOfAsync(id));
    }
}
