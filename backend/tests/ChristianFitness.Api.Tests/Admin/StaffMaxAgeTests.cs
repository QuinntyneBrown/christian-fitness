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
/// L2-018 AC9 (ADR 0062, ADR 0100): a staff session lasts at most 12 hours from sign-in, however busy,
/// so Google is asked again; the first request after is refused <c>session_expired</c> with 401, the
/// cookie is expired and the session is gone from the server. A session with no recorded sign-in
/// time (one started before the rule) counts as past the maximum (issue 148). The clock is a
/// <see cref="Microsoft.Extensions.Time.Testing.FakeTimeProvider"/> shared by the class: each test
/// signs in its own staff account and moves the clock only forward, never sleeping.
/// </summary>
public sealed class StaffMaxAgeTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    private static readonly TimeSpan Step = TimeSpan.FromMinutes(20);

    [Fact]
    public async Task Given_a_staff_session_in_use_every_20_minutes_When_a_request_arrives_11_hours_40_minutes_after_sign_in_Then_it_is_answered()
    {
        var (client, cookie) = await SignedInAsync("dana.max1140@example.org");

        using var response = await KeepBusyAsync(client, cookie, steps: 35);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        client.Dispose();
    }

    [Fact]
    public async Task Given_a_staff_session_in_use_every_20_minutes_When_a_request_arrives_12_hours_after_sign_in_Then_it_is_refused_with_session_expired_and_the_session_ends()
    {
        var (client, cookie) = await SignedInAsync("dana.max12@example.org");

        using var response = await KeepBusyAsync(client, cookie, steps: 36);

        await AssertExpiredAsync(response, "dana.max12@example.org");
        client.Dispose();
    }

    [Fact]
    public async Task Given_a_staff_session_with_no_recorded_sign_in_time_When_the_next_request_arrives_Then_it_is_refused_with_session_expired()
    {
        var (client, cookie) = await SignedInAsync("dana.unrecorded@example.org");
        await ForgetSignInTimeAsync("dana.unrecorded@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);

        await AssertExpiredAsync(response, "dana.unrecorded@example.org");
        client.Dispose();
    }

    /// <summary>Sends a request every 20 minutes, <paramref name="steps"/> times; answers the last, every earlier one having been answered.</summary>
    private async Task<HttpResponseMessage> KeepBusyAsync(HttpClient client, string cookie, int steps)
    {
        for (var i = 1; i < steps; i++)
        {
            factory.Time.Advance(Step);
            using var busy = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);
            Assert.Equal(HttpStatusCode.OK, busy.StatusCode);
        }

        factory.Time.Advance(Step);
        return await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/session", cookie);
    }

    private async Task AssertExpiredAsync(HttpResponseMessage response, string email)
    {
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("session_expired", problem.GetProperty("code").GetString());
        Assert.Equal("max_age", problem.GetProperty("reason").GetString());
        var attributes = Browser.Attributes(Assert.IsType<string>(Staff.SetCookie(response)));
        Assert.Contains("expires=thu, 01 jan 1970 00:00:00 gmt", attributes);
        Assert.Empty(await StaffSessionsOfAsync(email));
    }

    /// <summary>A new staff account signed in at the fixture's time; its client and cookie.</summary>
    private async Task<(HttpClient Client, string Cookie)> SignedInAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        return (client, Staff.Cookie(signedIn));
    }

    /// <summary>Rewrites the staff session of <paramref name="email"/> as one started before sign-in times were recorded.</summary>
    private async Task ForgetSignInTimeAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var record = Assert.Single(await StaffSessionsOfAsync(email, db));
        var ticket = TicketSerializer.Default.Deserialize(record.Ticket)!;
        Assert.True(ticket.Properties.Items.Remove(StaffSessionAge.SignedInAtItem));
        record.Ticket = TicketSerializer.Default.Serialize(ticket);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<List<SessionRecord>> StaffSessionsOfAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        return await StaffSessionsOfAsync(email, scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    /// <summary>The staff sessions the store holds for <paramref name="email"/>; joining also left a member one.</summary>
    private static async Task<List<SessionRecord>> StaffSessionsOfAsync(string email, AppDbContext db)
    {
        var normalized = Member.NormalizeEmail(email);
        var id = await db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var records = await db.Sessions.Where(s => s.MemberId == id).ToListAsync(TestContext.Current.CancellationToken);
        return [.. records.Where(record => TicketSerializer.Default.Deserialize(record.Ticket)?.AuthenticationScheme == SessionSchemes.Staff)];
    }
}
