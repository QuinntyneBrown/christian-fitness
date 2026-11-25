using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using ChristianFitness.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-018 AC5 (ADR 0016): a staff session ends 30 minutes after its last request. Every request
/// within 30 minutes of the one before keeps it open; the first one after is refused with
/// <c>session_expired</c> and 401, the cookie is expired and the session is gone from the server.
/// The clock is a <see cref="Microsoft.Extensions.Time.Testing.FakeTimeProvider"/> shared by the
/// class: each test uses its own staff account and moves the clock only forward, never sleeping.
/// </summary>
public sealed class StaffIdleExpiryTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    [Fact]
    public async Task Given_a_staff_session_idle_for_29_minutes_When_the_next_request_arrives_Then_it_is_answered()
    {
        var (client, cookie) = await SignedInAsync("dana.idle29@example.org");

        factory.Time.Advance(TimeSpan.FromMinutes(29));
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        client.Dispose();
    }

    [Fact]
    public async Task Given_a_staff_session_idle_for_30_minutes_When_the_next_request_arrives_Then_it_is_refused_with_session_expired_and_the_session_ends()
    {
        var (client, cookie) = await SignedInAsync("dana.idle30@example.org");

        factory.Time.Advance(TimeSpan.FromMinutes(30));
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("session_expired", problem.GetProperty("code").GetString());
        var attributes = Browser.Attributes(Assert.IsType<string>(Staff.SetCookie(response)));
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", attributes);
        Assert.Equal(0, await StaffSessionsOfAsync("dana.idle30@example.org"));
        client.Dispose();
    }

    // The cookie handler's own sliding rule renews only after half the lifetime; a request at
    // minute 10 would not move the expiry, and the session would end at minute 30, idle for 20.
    [Fact]
    public async Task Given_a_request_10_minutes_after_sign_in_When_another_arrives_25_minutes_later_Then_the_session_is_still_open()
    {
        var (client, cookie) = await SignedInAsync("dana.sliding@example.org");

        factory.Time.Advance(TimeSpan.FromMinutes(10));
        using (var early = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie))
        {
            Assert.Equal(HttpStatusCode.OK, early.StatusCode);
        }

        factory.Time.Advance(TimeSpan.FromMinutes(25));
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        client.Dispose();
    }

    [Fact]
    public async Task Given_requests_every_20_minutes_for_two_hours_When_the_last_arrives_Then_the_session_is_still_open()
    {
        var (client, cookie) = await SignedInAsync("dana.busy@example.org");

        for (var i = 0; i < 6; i++)
        {
            factory.Time.Advance(TimeSpan.FromMinutes(20));
            using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        client.Dispose();
    }

    // L2-018 AC9: activity must not extend a staff session beyond its original sign-in.
    [Fact]
    public async Task Given_an_active_staff_session_When_it_reaches_12_hours_Then_it_expires_on_the_server()
    {
        var (client, cookie) = await SignedInAsync("dana.maximum@example.org");
        for (var i = 0; i < 35; i++)
        {
            factory.Time.Advance(TimeSpan.FromMinutes(20));
            using var active = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);
            Assert.Equal(HttpStatusCode.OK, active.StatusCode);
        }

        factory.Time.Advance(TimeSpan.FromMinutes(20));
        using var expired = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
        var problem = await expired.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("session_expired", problem.GetProperty("code").GetString());
        Assert.Equal(0, await StaffSessionsOfAsync("dana.maximum@example.org"));
        client.Dispose();
    }

    // L2-018 AC9: a pre-release staff ticket has no original sign-in time and must be ended.
    [Fact]
    public async Task Given_a_legacy_staff_session_without_a_sign_in_time_When_it_is_used_Then_it_expires()
    {
        var (client, cookie) = await SignedInAsync("dana.legacy@example.org");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var normalized = Member.NormalizeEmail("dana.legacy@example.org");
            var id = await db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
            var sessions = await db.Sessions.Where(s => s.MemberId == id).ToListAsync(TestContext.Current.CancellationToken);
            var record = sessions.Single(s => TicketSerializer.Default.Deserialize(s.Ticket)?.AuthenticationScheme == SessionSchemes.Staff);
            var ticket = TicketSerializer.Default.Deserialize(record.Ticket)!;
            ticket.Properties.Items.Remove("cf.staff.signed-in-at");
            record.Ticket = TicketSerializer.Default.Serialize(ticket);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        using var expired = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
        var problem = await expired.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("session_expired", problem.GetProperty("code").GetString());
        Assert.Equal(0, await StaffSessionsOfAsync("dana.legacy@example.org"));
        client.Dispose();
    }

    /// <summary>A new staff account signed in with both steps at the fixture's time; its client and cookie.</summary>
    private async Task<(HttpClient Client, string Cookie)> SignedInAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(client, email, factory.Time.GetUtcNow());
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        return (client, Staff.Cookie(signedIn));
    }

    /// <summary>The staff sessions the store holds for <paramref name="email"/>; joining also left a member one.</summary>
    private async Task<int> StaffSessionsOfAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var id = await db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var tickets = await db.Sessions.Where(s => s.MemberId == id).Select(s => s.Ticket).ToListAsync(TestContext.Current.CancellationToken);
        return tickets.Count(ticket => TicketSerializer.Default.Deserialize(ticket)?.AuthenticationScheme == SessionSchemes.Staff);
    }
}
