using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Services;

/// <summary>
/// L2-027 AC2 (slice 23.2; ADR 0000): an Admin removes a live listing with <c>DELETE</c>; it is gone
/// from the staff list and from the Services list of members, whose detail, contact, message and booking
/// calls answer 404; the conversation a member already holds with the professional stays; the removal
/// leaves one audit entry that holds no text; an unknown or already removed listing is refused 404
/// <c>service_not_found</c>; and a Moderator, a member and nobody are refused and nothing is removed.
/// </summary>
public sealed class RemoveListingTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string Base = "/api/admin/services/listings";

    private async Task<(Guid Listing, Guid Professional, HttpClient Client, string Cookie)> ListedAsync(string email, string name)
    {
        var applicant = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(applicant, JoinTests.Details(email) with { FullName = name });
        var body = new { role = "Personal trainer", category = "Training", credentials = "NASM-CPT", where = "East York", price = "$70", about = $"About {name}." };
        using var applied = await AdminEvents.SendAsync(applicant, HttpMethod.Post, "/api/professional-applications", cookie, body);
        Assert.Equal(HttpStatusCode.Created, applied.StatusCode);
        var application = (await applied.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
        var (staff, staffCookie, _) = await StaffAsync($"dana.{application:N}@example.org", StaffRoleName.Admin);
        using var _ = staff;
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var approved = await AdminEvents.SendAsync(staff, HttpMethod.Post, $"/api/admin/services/applications/{application}/approve", staffCookie);
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);
        var listing = (await approved.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("listingId").GetGuid();
        var professional = await InDbAsync(db => db.ServiceListings.Where(l => l.Id == listing).Select(l => l.MemberId).SingleAsync(TestContext.Current.CancellationToken));
        return (listing, professional, applicant, cookie);
    }

    private async Task<(HttpClient Client, string Cookie, Guid Id)> StaffAsync(string email, StaffRoleName role)
    {
        var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, email, role));
        using var signedIn = await Staff.SignInWithCodeAsync(client, email, factory.Time.GetUtcNow());
        return (client, Staff.Cookie(signedIn), id);
    }

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        return (client, await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email)));
    }

    private async Task<T> InDbAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private static async Task<(HttpStatusCode Status, JsonElement Body)> SendAsync(HttpClient client, string? cookie, HttpMethod method, string path, object? body = null)
    {
        using var response = body is null
            ? await Browser.SendAsync(client, method, path, cookie)
            : await AdminEvents.SendAsync(client, method, path, cookie, body);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return (response.StatusCode, text.Length == 0 ? default : JsonSerializer.Deserialize<JsonElement>(text));
    }

    [Fact]
    public async Task Given_a_live_listing_When_an_Admin_removes_it_Then_Services_no_longer_shows_it_and_one_audit_entry_is_kept()
    {
        var (listing, _, pro, _) = await ListedAsync("danielle.remove1@example.org", "Danielle Removable");
        using var _1 = pro;
        var (staff, cookie, adminId) = await StaffAsync("dana.remove1@example.org", StaffRoleName.Admin);
        using var _2 = staff;
        var (member, memberCookie) = await MemberAsync("grace.remove1@example.org");
        using var _3 = member;
        var before = await SendAsync(member, memberCookie, HttpMethod.Get, "/api/services?q=Removable");
        Assert.Contains(listing, before.Body.GetProperty("services").EnumerateArray().Select(s => s.GetProperty("id").GetGuid()));
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var now = factory.Time.GetUtcNow();

        var removed = await SendAsync(staff, cookie, HttpMethod.Delete, $"{Base}/{listing}");

        Assert.Equal(HttpStatusCode.NoContent, removed.Status);
        var staffList = await SendAsync(staff, cookie, HttpMethod.Get, Base);
        Assert.DoesNotContain(listing, staffList.Body.GetProperty("listings").EnumerateArray().Select(l => l.GetProperty("id").GetGuid()));
        var services = await SendAsync(member, memberCookie, HttpMethod.Get, "/api/services?q=Removable");
        Assert.DoesNotContain(listing, services.Body.GetProperty("services").EnumerateArray().Select(s => s.GetProperty("id").GetGuid()));
        var detail = await SendAsync(member, memberCookie, HttpMethod.Get, $"/api/services/{listing}");
        var contact = await SendAsync(member, memberCookie, HttpMethod.Get, $"/api/services/{listing}/contact-link");
        var message = await SendAsync(member, memberCookie, HttpMethod.Post, $"/api/services/{listing}/conversation");
        var booking = await SendAsync(member, memberCookie, HttpMethod.Post, $"/api/services/{listing}/booking-requests", new { kind = "intro-call", when = "Evenings" });
        Assert.Equal(
            [HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound, HttpStatusCode.NotFound],
            [detail.Status, contact.Status, message.Status, booking.Status]);
        Assert.Equal("service_not_found", detail.Body.GetProperty("code").GetString());
        var entry = await InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == listing, TestContext.Current.CancellationToken));
        Assert.Equal((adminId, "listing.removed", "ServiceListing", now), (entry.ActorMemberId, entry.Action, entry.RecordType, entry.OccurredAt));
    }

    [Fact]
    public async Task Given_a_member_who_wrote_to_the_professional_When_the_listing_is_removed_Then_their_conversation_remains()
    {
        var (listing, professional, pro, proCookie) = await ListedAsync("ruth.remove2@example.org", "Ruth Removable");
        using var _1 = pro;
        var (member, memberCookie) = await MemberAsync("grace.remove2@example.org");
        using var _2 = member;
        var sent = await SendAsync(member, memberCookie, HttpMethod.Post, $"/api/services/{listing}/booking-requests", new { kind = "intro-call", when = "Weekday evenings", message = "Hello Ruth" });
        Assert.Equal(HttpStatusCode.Created, sent.Status);
        var memberId = await InDbAsync(db => db.DirectMessages.Where(m => m.RecipientId == professional).Select(m => m.SenderId).SingleAsync(TestContext.Current.CancellationToken));
        var (staff, cookie, _) = await StaffAsync("dana.remove2@example.org", StaffRoleName.Admin);
        using var _3 = staff;

        var removed = await SendAsync(staff, cookie, HttpMethod.Delete, $"{Base}/{listing}");

        Assert.Equal(HttpStatusCode.NoContent, removed.Status);
        var mine = await SendAsync(member, memberCookie, HttpMethod.Get, $"/api/messages/{professional}/messages");
        var theirs = await SendAsync(pro, proCookie, HttpMethod.Get, $"/api/messages/{memberId}/messages");
        Assert.Equal(HttpStatusCode.OK, mine.Status);
        Assert.Contains("Hello Ruth", Assert.Single(mine.Body.GetProperty("messages").EnumerateArray()).GetProperty("text").GetString(), StringComparison.Ordinal);
        Assert.Single(theirs.Body.GetProperty("messages").EnumerateArray());
        var conversations = await SendAsync(member, memberCookie, HttpMethod.Get, "/api/conversations");
        Assert.Equal(HttpStatusCode.OK, conversations.Status);
        Assert.Contains(professional.ToString(), conversations.Body.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_an_unknown_or_already_removed_listing_When_an_Admin_removes_it_Then_it_is_refused_service_not_found_and_no_second_entry_is_kept()
    {
        var (listing, _, pro, _) = await ListedAsync("tasha.remove3@example.org", "Tasha Removable");
        using var _1 = pro;
        var (staff, cookie, _) = await StaffAsync("dana.remove3@example.org", StaffRoleName.Admin);
        using var _2 = staff;
        Assert.Equal(HttpStatusCode.NoContent, (await SendAsync(staff, cookie, HttpMethod.Delete, $"{Base}/{listing}")).Status);

        var again = await SendAsync(staff, cookie, HttpMethod.Delete, $"{Base}/{listing}");
        var unknown = await SendAsync(staff, cookie, HttpMethod.Delete, $"{Base}/{Guid.NewGuid()}");

        Assert.Equal([HttpStatusCode.NotFound, HttpStatusCode.NotFound], [again.Status, unknown.Status]);
        Assert.Equal("service_not_found", again.Body.GetProperty("code").GetString());
        Assert.Equal("service_not_found", unknown.Body.GetProperty("code").GetString());
        Assert.Equal(1, await InDbAsync(db => db.AuditEntries.CountAsync(e => e.RecordId == listing, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_a_Moderator_a_member_or_nobody_When_they_remove_a_listing_Then_it_is_refused_and_it_stays()
    {
        var (listing, _, pro, proCookie) = await ListedAsync("marcus.remove4@example.org", "Marcus Removable");
        using var _1 = pro;
        var (moderator, moderatorCookie, _) = await StaffAsync("joel.remove4@example.org", StaffRoleName.Moderator);
        using var _2 = moderator;
        using var anonymous = Browser.CreateClient(factory);

        var asModerator = await SendAsync(moderator, moderatorCookie, HttpMethod.Delete, $"{Base}/{listing}");
        var asMember = await SendAsync(pro, proCookie, HttpMethod.Delete, $"{Base}/{listing}");
        var asNobody = await SendAsync(anonymous, null, HttpMethod.Delete, $"{Base}/{listing}");

        Assert.Equal(HttpStatusCode.Forbidden, asModerator.Status);
        Assert.Equal("forbidden_role", asModerator.Body.GetProperty("code").GetString());
        Assert.Equal([HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized], [asMember.Status, asNobody.Status]);
        Assert.True(await InDbAsync(db => db.ServiceListings.AnyAsync(l => l.Id == listing, TestContext.Current.CancellationToken)));
        Assert.False(await InDbAsync(db => db.AuditEntries.AnyAsync(e => e.RecordId == listing, TestContext.Current.CancellationToken)));
    }
}
