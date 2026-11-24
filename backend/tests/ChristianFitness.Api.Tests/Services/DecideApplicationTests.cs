using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Services;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Services;

/// <summary>
/// L2-025 AC2 and AC3 (slice 21.2; ADR 0049): an Admin approves a Pending application and a published
/// listing is created, or declines it with a reason and none is; either leaves the queue and leaves one
/// audit entry without the reason; deciding a decided or unknown application is refused with a code and
/// changes nothing; a Moderator, a member and nobody are refused.
/// </summary>
public sealed class DecideApplicationTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string Base = "/api/admin/services/applications";
    private const string Reason = "We could not verify the CMTO number you gave";

    private async Task<Guid> ApplyAsync(string email, string name)
    {
        var client = Browser.CreateClient(factory);
        using var _ = client;
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        var body = new { role = " Registered massage therapist ", category = "Physio", credentials = "RMT, CMTO #T4471", where = "Mississauga", price = "$95 / hour", about = "Gentle, evidence-led care." };
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, "/api/professional-applications", cookie, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
    }

    private async Task<(HttpClient Client, string Cookie, Guid Id)> StaffAsync(string email, StaffRoleName role)
    {
        var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, email, role));
        using var signedIn = await Staff.SignInWithCodeAsync(client, email, factory.Time.GetUtcNow());
        return (client, Staff.Cookie(signedIn), id);
    }

    private static Task<HttpResponseMessage> ApproveAsync(HttpClient client, string cookie, Guid id) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, $"{Base}/{id}/approve", cookie);

    private static Task<HttpResponseMessage> DeclineAsync(HttpClient client, string cookie, Guid id, object body) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, $"{Base}/{id}/decline", cookie, body);

    private async Task<T> InDbAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

    private static async Task<string[]> QueuedIdsAsync(HttpClient client, string cookie)
    {
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, Base, cookie);
        var answer = await JsonAsync(response);
        return [.. answer.GetProperty("applications").EnumerateArray().Select(a => a.GetProperty("id").GetString()!)];
    }

    [Fact]
    public async Task Given_a_pending_application_When_an_Admin_approves_it_Then_a_published_listing_is_created_and_it_leaves_the_queue()
    {
        var application = await ApplyAsync("hannah.decide1@example.org", "Hannah Bergstrom");
        var (staff, cookie, adminId) = await StaffAsync("dana.decide1@example.org", StaffRoleName.Admin);
        using var _ = staff;
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var now = factory.Time.GetUtcNow();

        using var response = await ApproveAsync(staff, cookie, application);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await JsonAsync(response);
        Assert.Equal(["applicationId", "listingId", "status"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("approved", answer.GetProperty("status").GetString());
        var listing = await InDbAsync(db => db.ServiceListings.SingleAsync(l => l.ApplicationId == application, TestContext.Current.CancellationToken));
        Assert.Equal(listing.Id, answer.GetProperty("listingId").GetGuid());
        Assert.Equal(
            ("Hannah Bergstrom", "Registered massage therapist", ServiceCategory.Physio, "RMT, CMTO #T4471", "Mississauga", "$95 / hour", "Gentle, evidence-led care.", now),
            (listing.Name, listing.Role, listing.Category, listing.Credentials, listing.Where, listing.Price, listing.About, listing.PublishedAt));
        Assert.Equal(ApplicationStatus.Approved, (await InDbAsync(db => db.ProfessionalApplications.SingleAsync(a => a.Id == application, TestContext.Current.CancellationToken))).Status);
        Assert.DoesNotContain(application.ToString(), await QueuedIdsAsync(staff, cookie));
        var entry = await InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == application, TestContext.Current.CancellationToken));
        Assert.Equal((adminId, "application.approved", "ProfessionalApplication", now), (entry.ActorMemberId, entry.Action, entry.RecordType, entry.OccurredAt));
    }

    [Fact]
    public async Task Given_a_pending_application_When_an_Admin_declines_it_with_a_reason_Then_no_listing_is_created_and_it_leaves_the_queue()
    {
        var application = await ApplyAsync("samuel.decide2@example.org", "Samuel Osei");
        var (staff, cookie, adminId) = await StaffAsync("dana.decide2@example.org", StaffRoleName.Admin);
        using var _ = staff;
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var now = factory.Time.GetUtcNow();

        using var response = await DeclineAsync(staff, cookie, application, new { reason = $"  {Reason} " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await JsonAsync(response);
        Assert.Equal(["applicationId", "listingId", "status"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(JsonValueKind.Null, answer.GetProperty("listingId").ValueKind);
        Assert.Equal("declined", answer.GetProperty("status").GetString());
        Assert.False(await InDbAsync(db => db.ServiceListings.AnyAsync(l => l.ApplicationId == application, TestContext.Current.CancellationToken)));
        var stored = await InDbAsync(db => db.ProfessionalApplications.SingleAsync(a => a.Id == application, TestContext.Current.CancellationToken));
        Assert.Equal((ApplicationStatus.Declined, Reason, now), (stored.Status, stored.DeclineReason, stored.DecidedAt));
        Assert.DoesNotContain(application.ToString(), await QueuedIdsAsync(staff, cookie));
        var entry = await InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == application, TestContext.Current.CancellationToken));
        Assert.Equal((adminId, "application.declined", "ProfessionalApplication"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    public static TheoryData<string, object, string> BadReasons() => new()
    {
        // why, body, field code
        { "no reason", new { }, "reason_required" },
        { "a blank reason", new { reason = "   " }, "reason_required" },
        { "a reason of 501 characters", new { reason = new string('x', 501) }, "reason_too_long" },
    };

    [Theory]
    [MemberData(nameof(BadReasons))]
    public async Task Given_a_pending_application_When_it_is_declined_with_a_bad_reason_Then_it_is_refused_and_nothing_changes(string why, object body, string code)
    {
        var application = await ApplyAsync($"lena.decide3.{why.Replace(' ', '-')}@example.org", "Lena Park");
        var (staff, cookie, _) = await StaffAsync($"dana.decide3.{why.Replace(' ', '-')}@example.org", StaffRoleName.Admin);
        using var __ = staff;

        using var response = await DeclineAsync(staff, cookie, application, body);

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, why);
        var problem = await JsonAsync(response);
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty("reason").GetString());
        Assert.DoesNotContain(new string('x', 501), problem.ToString(), StringComparison.Ordinal);
        Assert.Equal(ApplicationStatus.Pending, (await InDbAsync(db => db.ProfessionalApplications.SingleAsync(a => a.Id == application, TestContext.Current.CancellationToken))).Status);
        Assert.False(await InDbAsync(db => db.AuditEntries.AnyAsync(e => e.RecordId == application, TestContext.Current.CancellationToken)));
    }

    public static TheoryData<string, bool, bool> Decided() => new()
    {
        // first decision (approve?), second decision (approve?)
        { "approve then approve", true, true },
        { "approve then decline", true, false },
        { "decline then approve", false, true },
        { "decline then decline", false, false },
    };

    [Theory]
    [MemberData(nameof(Decided))]
    public async Task Given_a_decided_application_When_it_is_decided_again_Then_it_is_refused_application_decided_and_nothing_changes(string why, bool firstApproves, bool secondApproves)
    {
        var slug = why.Replace(' ', '-');
        var application = await ApplyAsync($"ruth.decide4.{slug}@example.org", "Ruth Abernathy");
        var (staff, cookie, _) = await StaffAsync($"dana.decide4.{slug}@example.org", StaffRoleName.Admin);
        using var _ = staff;
        using var first = firstApproves ? await ApproveAsync(staff, cookie, application) : await DeclineAsync(staff, cookie, application, new { reason = Reason });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var statusAfterFirst = (await InDbAsync(db => db.ProfessionalApplications.SingleAsync(a => a.Id == application, TestContext.Current.CancellationToken))).Status;

        using var second = secondApproves ? await ApproveAsync(staff, cookie, application) : await DeclineAsync(staff, cookie, application, new { reason = "Changed my mind" });

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("application_decided", (await JsonAsync(second)).GetProperty("code").GetString());
        var stored = await InDbAsync(db => db.ProfessionalApplications.SingleAsync(a => a.Id == application, TestContext.Current.CancellationToken));
        Assert.Equal(statusAfterFirst, stored.Status);
        Assert.Equal(firstApproves ? 1 : 0, await InDbAsync(db => db.ServiceListings.CountAsync(l => l.ApplicationId == application, TestContext.Current.CancellationToken)));
        Assert.Equal(1, await InDbAsync(db => db.AuditEntries.CountAsync(e => e.RecordId == application, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_an_unknown_application_When_it_is_approved_or_declined_Then_it_is_refused_application_not_found()
    {
        var (staff, cookie, _) = await StaffAsync("dana.decide5@example.org", StaffRoleName.Admin);
        using var _ = staff;

        using var approve = await ApproveAsync(staff, cookie, Guid.NewGuid());
        using var decline = await DeclineAsync(staff, cookie, Guid.NewGuid(), new { reason = Reason });
        Assert.Equal((HttpStatusCode.NotFound, HttpStatusCode.NotFound), (approve.StatusCode, decline.StatusCode));

        Assert.Equal("application_not_found", (await JsonAsync(approve)).GetProperty("code").GetString());
        Assert.Equal("application_not_found", (await JsonAsync(decline)).GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("approve")]
    [InlineData("decline")]
    public async Task Given_a_Moderator_a_member_or_nobody_When_they_decide_an_application_Then_it_is_refused_and_it_stays_pending(string action)
    {
        var application = await ApplyAsync($"hannah.decide6.{action}@example.org", "Hannah Bergstrom");
        var (moderator, moderatorCookie, _) = await StaffAsync($"joel.decide6.{action}@example.org", StaffRoleName.Moderator);
        using var _ = moderator;
        var member = Browser.CreateClient(factory);
        using var __ = member;
        var memberCookie = await OwnProfileTests.JoinedAsync(member, JoinTests.Details($"grace.decide6.{action}@example.org"));
        using var anonymous = Browser.CreateClient(factory);
        object? body = action == "decline" ? new { reason = Reason } : null;
        var path = $"{Base}/{application}/{action}";

        using var asModerator = await AdminEvents.SendAsync(moderator, HttpMethod.Post, path, moderatorCookie, body);
        using var asMember = await AdminEvents.SendAsync(member, HttpMethod.Post, path, memberCookie, body);
        using var asNobody = await AdminEvents.SendAsync(anonymous, HttpMethod.Post, path, cookie: null, body);

        Assert.Equal(HttpStatusCode.Forbidden, asModerator.StatusCode);
        Assert.Equal("forbidden_role", (await JsonAsync(asModerator)).GetProperty("code").GetString());
        Assert.Equal((HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized), (asMember.StatusCode, asNobody.StatusCode));
        Assert.Equal(ApplicationStatus.Pending, (await InDbAsync(db => db.ProfessionalApplications.SingleAsync(a => a.Id == application, TestContext.Current.CancellationToken))).Status);
        Assert.False(await InDbAsync(db => db.AuditEntries.AnyAsync(e => e.RecordId == application, TestContext.Current.CancellationToken)));
    }
}
