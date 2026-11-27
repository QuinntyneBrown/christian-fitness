using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// The API on a clock the attendance tests hold (ADR 0106), with events and registrations put
/// straight in the store, since a member cannot register for an event that has started.
/// </summary>
public class AttendanceFactory : ApiFactory
{
    public static readonly DateTimeOffset Now = new(2026, 4, 18, 13, 0, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }

    /// <summary>A published event starting <paramref name="startsIn"/> from the clock's time now.</summary>
    public async Task<Guid> AddEventAsync(string title, TimeSpan startsIn)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = Time.GetUtcNow();
        var e = Event.CreateDraft(title, EventCategory.Mobility, now + startsIn, "Trinity Bellwoods Park", "West End, Toronto", 0, 30, "Stretch and pray together.", now - TimeSpan.FromDays(7));
        e.Publish(e.CreatedAt);
        db.Events.Add(e);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return e.Id;
    }

    /// <summary>Gives <paramref name="memberId"/> a place at <paramref name="eventId"/>, as registering before the start did.</summary>
    public async Task RegisterAsync(Guid eventId, Guid memberId)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Registrations.Add(Registration.Of(eventId, memberId, 0, Time.GetUtcNow() - TimeSpan.FromDays(1)));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>The id of the member who joined with <paramref name="email"/>.</summary>
    public async Task<Guid> MemberIdAsync(string email)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        return await db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
    }
}

/// <summary>
/// L2-080 AC1, AC5, AC6 and AC9 (ADR 0106): staff, Admin or Moderator, open an event's attendance
/// and see everyone registered by name with whether they came; before the start nobody is listed
/// and the page says when it opens; an unknown event, a member and nobody are refused.
/// </summary>
public sealed class EventAttendanceTests(AttendanceFactory factory) : IClassFixture<AttendanceFactory>
{
    private static string AttendancePath(Guid id) => $"/api/admin/events/{id}/attendance";

    private async Task<(HttpClient Client, string Cookie, Guid Id)> MemberAsync(string email, string name)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        return (client, cookie, await factory.MemberIdAsync(email));
    }

    private async Task<(HttpClient Client, string Cookie)> StaffAsync(string email, StaffRoleName role = StaffRoleName.Admin)
    {
        var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return (client, Staff.Cookie(signedIn));
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string cookie, HttpMethod method, string path, HttpStatusCode expected, object? body = null)
    {
        using var response = await AdminEvents.SendAsync(client, method, path, cookie, body);
        Assert.Equal(expected, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_a_started_event_with_two_registered_When_an_Admin_opens_its_attendance_Then_everyone_registered_is_listed_by_name_and_none_came_yet()
    {
        var id = await factory.AddEventAsync("Stretch & Pray: Mobility Morning", startsIn: TimeSpan.FromMinutes(-30));
        var other = await factory.AddEventAsync("Other Morning", startsIn: TimeSpan.FromMinutes(-30));
        var (_, _, marcus) = await MemberAsync("marcus.attendance@example.org", "Marcus Bell");
        var (_, _, grace) = await MemberAsync("grace.attendance@example.org", "Grace Thompson");
        var (_, _, hannah) = await MemberAsync("hannah.attendance@example.org", "Hannah Kim");
        await factory.RegisterAsync(id, marcus);
        await factory.RegisterAsync(id, grace);
        await factory.RegisterAsync(other, hannah);
        var (staff, cookie) = await StaffAsync("dana.attendance@example.org");

        var answer = await ReadAsync(staff, cookie, HttpMethod.Get, AttendancePath(id), HttpStatusCode.OK);

        Assert.Equal(["came", "eventId", "items", "registered", "started", "startsAt", "title"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            (id, "Stretch & Pray: Mobility Morning", AttendanceFactory.Now - TimeSpan.FromMinutes(30), true, 2, 0),
            (answer.GetProperty("eventId").GetGuid(), answer.GetProperty("title").GetString(), answer.GetProperty("startsAt").GetDateTimeOffset(), answer.GetProperty("started").GetBoolean(), answer.GetProperty("registered").GetInt32(), answer.GetProperty("came").GetInt32()));
        var items = answer.GetProperty("items").EnumerateArray().ToArray();
        Assert.All(items, item => Assert.Equal(["came", "memberId", "name"], item.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        Assert.Equal(
            [(grace, "Grace Thompson", false), (marcus, "Marcus Bell", false)],
            items.Select(i => (i.GetProperty("memberId").GetGuid(), i.GetProperty("name").GetString(), i.GetProperty("came").GetBoolean())));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_open_a_started_events_attendance_Then_it_answers_and_the_event_itself_stays_Admins_only()
    {
        var id = await factory.AddEventAsync("Moderated Morning", startsIn: TimeSpan.FromMinutes(-5));
        var (moderator, cookie) = await StaffAsync("mo.attendance@example.org", StaffRoleName.Moderator);

        var answer = await ReadAsync(moderator, cookie, HttpMethod.Get, AttendancePath(id), HttpStatusCode.OK);
        var registrations = await ReadAsync(moderator, cookie, HttpMethod.Get, $"/api/admin/events/{id}/registrations", HttpStatusCode.Forbidden);

        Assert.Equal((0, 0), (answer.GetProperty("registered").GetInt32(), answer.GetProperty("items").GetArrayLength()));
        Assert.Equal("forbidden_role", registrations.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_an_event_that_has_not_started_When_staff_open_its_attendance_Then_nobody_is_listed_and_it_says_how_many_are_registered()
    {
        var id = await factory.AddEventAsync("Later Morning", startsIn: TimeSpan.FromMinutes(1));
        var (_, _, ruth) = await MemberAsync("ruth.notstarted@example.org", "Ruth Adeyemi");
        await factory.RegisterAsync(id, ruth);
        var (staff, cookie) = await StaffAsync("dana.notstarted@example.org");

        var answer = await ReadAsync(staff, cookie, HttpMethod.Get, AttendancePath(id), HttpStatusCode.OK);

        Assert.Equal((false, 1, 0, 0), (answer.GetProperty("started").GetBoolean(), answer.GetProperty("registered").GetInt32(), answer.GetProperty("came").GetInt32(), answer.GetProperty("items").GetArrayLength()));
    }

    [Fact]
    public async Task Given_an_unknown_event_When_staff_open_its_attendance_Then_it_answers_404_event_not_found()
    {
        var (staff, cookie) = await StaffAsync("dana.attendanceunknown@example.org");

        var refusal = await ReadAsync(staff, cookie, HttpMethod.Get, AttendancePath(Guid.NewGuid()), HttpStatusCode.NotFound);

        Assert.Equal("event_not_found", refusal.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_member_or_nobody_When_attendance_is_asked_for_Then_they_are_refused_like_nobody()
    {
        var id = await factory.AddEventAsync("Private Morning", startsIn: TimeSpan.FromMinutes(-5));
        var (member, cookie, _) = await MemberAsync("grace.attendancemember@example.org", "Grace Thompson");
        using var anonymous = Browser.CreateClient(factory);

        using var asMember = await AdminEvents.SendAsync(member, HttpMethod.Get, AttendancePath(id), cookie);
        using var asNobody = await AdminEvents.SendAsync(anonymous, HttpMethod.Get, AttendancePath(id), cookie: null);

        // A member session is not a staff session: the admin area answers it as it answers nobody (ADR 0011).
        Assert.Equal((HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized), (asMember.StatusCode, asNobody.StatusCode));
    }
}
