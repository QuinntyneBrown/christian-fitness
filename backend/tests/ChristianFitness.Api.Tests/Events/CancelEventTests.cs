using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-023 AC2 (ADR 0035): staff cancel a published event; it leaves the member lists, registered
/// members still see it in their Profile marked cancelled, anything but a published event is refused
/// <c>event_not_published</c>, and the change is a staff change that leaves one audit entry.
/// </summary>
public sealed class CancelEventTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static string CancelPath(Guid id) => $"/api/admin/events/{id}/cancel";

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    private async Task<(HttpClient Client, string Cookie)> StaffAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, email, Domain.Members.StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return (client, Staff.Cookie(signedIn));
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string cookie, HttpMethod method, string path, HttpStatusCode expected)
    {
        using var response = await AdminEvents.SendAsync(client, method, path, cookie);
        Assert.Equal(expected, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static string[] IdsOf(JsonElement list) =>
        [.. list.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetString()!)];

    [Fact]
    public async Task Given_a_published_event_with_a_registered_member_When_staff_cancel_it_Then_members_lists_drop_it_and_their_profile_marks_it_cancelled()
    {
        var cancelledId = await factory.AddEventAsync("Cancelled Run");
        var keptId = await factory.AddEventAsync("Kept Run");
        var (grace, graceCookie) = await MemberAsync("grace.cancelevent@example.org");
        foreach (var id in new[] { cancelledId, keptId })
        {
            await ReadAsync(grace, graceCookie, HttpMethod.Post, $"/api/events/{id}/registrations", HttpStatusCode.OK);
        }

        var (staff, staffCookie) = await StaffAsync("dana.cancelevent@example.org");

        var answer = await ReadAsync(staff, staffCookie, HttpMethod.Post, CancelPath(cancelledId), HttpStatusCode.OK);
        var memberList = await ReadAsync(grace, graceCookie, HttpMethod.Get, "/api/events", HttpStatusCode.OK);
        var detail = await ReadAsync(grace, graceCookie, HttpMethod.Get, $"/api/events/{cancelledId}", HttpStatusCode.NotFound);
        var profile = await ReadAsync(grace, graceCookie, HttpMethod.Get, "/api/profile/me", HttpStatusCode.OK);
        var all = await ReadAsync(staff, staffCookie, HttpMethod.Get, "/api/admin/events", HttpStatusCode.OK);
        var published = await ReadAsync(staff, staffCookie, HttpMethod.Get, "/api/admin/events?status=published", HttpStatusCode.OK);

        Assert.Equal((cancelledId.ToString(), "cancelled"), (answer.GetProperty("id").GetString(), answer.GetProperty("status").GetString()));
        Assert.DoesNotContain(cancelledId.ToString(), IdsOf(memberList));
        Assert.Contains(keptId.ToString(), IdsOf(memberList));
        Assert.Equal("event_not_found", detail.GetProperty("code").GetString());
        var going = profile.GetProperty("upcomingEvents").EnumerateArray()
            .Where(e => e.GetProperty("eventId").GetString() is { } id && (id == cancelledId.ToString() || id == keptId.ToString()))
            .ToDictionary(e => e.GetProperty("eventId").GetString()!, e => e.GetProperty("cancelled").GetBoolean());
        Assert.Equal(new Dictionary<string, bool> { [cancelledId.ToString()] = true, [keptId.ToString()] = false }, going);
        Assert.Equal("cancelled", all.GetProperty("events").EnumerateArray().Single(e => e.GetProperty("id").GetString() == cancelledId.ToString()).GetProperty("status").GetString());
        Assert.DoesNotContain(cancelledId.ToString(), IdsOf(published));
    }

    [Fact]
    public async Task Given_a_cancelled_event_When_a_member_registers_Then_it_is_not_found()
    {
        var id = await factory.AddEventAsync("Late Run");
        var (staff, staffCookie) = await StaffAsync("dana.cancelregister@example.org");
        var (grace, graceCookie) = await MemberAsync("grace.cancelregister@example.org");
        await ReadAsync(staff, staffCookie, HttpMethod.Post, CancelPath(id), HttpStatusCode.OK);

        var refusal = await ReadAsync(grace, graceCookie, HttpMethod.Post, $"/api/events/{id}/registrations", HttpStatusCode.NotFound);

        Assert.Equal("event_not_found", refusal.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_draft_or_an_already_cancelled_event_When_staff_cancel_it_Then_it_is_refused_event_not_published()
    {
        var draft = await factory.AddEventAsync("Draft To Cancel", published: false);
        var twice = await factory.AddEventAsync("Cancelled Twice");
        var (staff, staffCookie) = await StaffAsync("dana.canceltwice@example.org");
        await ReadAsync(staff, staffCookie, HttpMethod.Post, CancelPath(twice), HttpStatusCode.OK);

        var forDraft = await ReadAsync(staff, staffCookie, HttpMethod.Post, CancelPath(draft), HttpStatusCode.Conflict);
        var again = await ReadAsync(staff, staffCookie, HttpMethod.Post, CancelPath(twice), HttpStatusCode.Conflict);

        Assert.Equal(("event_not_published", "event_not_published"), (forDraft.GetProperty("code").GetString(), again.GetProperty("code").GetString()));
    }

    [Fact]
    public async Task Given_an_unknown_event_When_staff_cancel_it_Then_it_answers_404_not_found()
    {
        var (staff, staffCookie) = await StaffAsync("dana.cancelunknown@example.org");

        var refusal = await ReadAsync(staff, staffCookie, HttpMethod.Post, CancelPath(Guid.NewGuid()), HttpStatusCode.NotFound);

        Assert.Equal("not_found", refusal.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_an_event_is_cancelled_Then_it_is_unauthorized()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, CancelPath(Guid.NewGuid()), cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_cancelled_event_When_it_is_read_back_Then_one_audit_entry_names_who_cancelled_which_event()
    {
        var id = await factory.AddEventAsync("Audited Run");
        var (staff, staffCookie) = await StaffAsync("dana.cancelaudit@example.org");
        await ReadAsync(staff, staffCookie, HttpMethod.Post, CancelPath(id), HttpStatusCode.OK);
        await ReadAsync(staff, staffCookie, HttpMethod.Post, CancelPath(id), HttpStatusCode.Conflict);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.cancelaudit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == id && e.Action == "event.cancelled").ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "Event"), (entry.ActorMemberId, entry.RecordType));
    }
}
