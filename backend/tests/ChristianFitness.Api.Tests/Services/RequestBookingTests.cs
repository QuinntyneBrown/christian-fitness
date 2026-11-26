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
/// L2-014 AC3 to AC5 (slice 17.2; ADR 0000): a member asks a listing's professional for a session
/// (<c>POST /api/services/{id}/booking-requests</c> with a kind, when it suits them and an optional
/// message). The request is delivered as a direct message from the member to the professional, so the
/// conversation starts; a blank <c>when</c>, an unknown kind or text over its limit is refused 400; an
/// unknown listing, a listing that publishes a contact link, a suspended professional and the caller's
/// own listing are refused with a code; nothing is delivered on a refusal.
/// </summary>
public sealed class RequestBookingTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private async Task<(Guid Listing, Guid Professional, HttpClient Client, string Cookie)> ListedAsync(string email, string name, string? contactUrl = null)
    {
        var applicant = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(applicant, JoinTests.Details(email) with { FullName = name });
        var body = new { role = "Personal trainer", category = "Training", credentials = "NASM-CPT", where = "East York", price = "$70", about = $"About {name}." };
        using var applied = await AdminEvents.SendAsync(applicant, HttpMethod.Post, "/api/professional-applications", cookie, body);
        Assert.Equal(HttpStatusCode.Created, applied.StatusCode);
        var application = (await applied.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();

        var staff = Browser.CreateClient(factory);
        using var _ = staff;
        var staffEmail = $"dana.{application:N}@example.org";
        await Staff.CreateAsync(factory, staff, staffEmail, StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, staff, staffEmail);
        var staffCookie = Staff.Cookie(signedIn);
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var approved = await AdminEvents.SendAsync(staff, HttpMethod.Post, $"/api/admin/services/applications/{application}/approve", staffCookie, null);
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var listing = await db.ServiceListings.SingleAsync(l => l.ApplicationId == application, TestContext.Current.CancellationToken);
        if (contactUrl is not null)
        {
            Assert.True(listing.TrySetContactUrl(contactUrl));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        return (listing.Id, listing.MemberId, applicant, cookie);
    }

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        return (client, await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email)));
    }

    private static async Task<(HttpStatusCode Status, JsonElement Body)> SendAsync(HttpClient client, string? cookie, HttpMethod method, string path, object? body = null)
    {
        using var response = body is null
            ? await Browser.SendAsync(client, method, path, cookie)
            : await AdminEvents.SendAsync(client, method, path, cookie, body);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return (response.StatusCode, text.Length == 0 ? default : JsonSerializer.Deserialize<JsonElement>(text));
    }

    private static object Valid(string kind = "intro-call", string when = "Weekday evenings after 6", string? message = "Hi, I am training for a half marathon.") =>
        new { kind, when, message };

    private static async Task<string[]> TextsAsync(HttpClient client, string? cookie, Guid other)
    {
        var history = await SendAsync(client, cookie, HttpMethod.Get, $"/api/messages/{other}/messages");
        Assert.Equal(HttpStatusCode.OK, history.Status);
        return [.. history.Body.GetProperty("messages").EnumerateArray().Select(m => m.GetProperty("text").GetString()!)];
    }

    [Fact]
    public async Task Given_a_listing_When_a_member_requests_a_booking_Then_the_professional_gets_it_as_a_direct_message_and_the_conversation_starts()
    {
        var (listing, professional, pro, proCookie) = await ListedAsync("danielle.book1@example.org", "Danielle Okafor");
        using var _1 = pro;
        var (member, cookie) = await MemberAsync("grace.book1@example.org");
        using var _2 = member;

        var sent = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{listing}/booking-requests", Valid());

        Assert.Equal(HttpStatusCode.Created, sent.Status);
        Assert.Equal(["memberId"], sent.Body.EnumerateObject().Select(p => p.Name));
        Assert.Equal(professional, sent.Body.GetProperty("memberId").GetGuid());
        var mine = Assert.Single(await TextsAsync(member, cookie, professional));
        Assert.Contains("Free 15-minute intro call", mine, StringComparison.Ordinal);
        Assert.Contains("Weekday evenings after 6", mine, StringComparison.Ordinal);
        Assert.Contains("half marathon", mine, StringComparison.Ordinal);
        Guid memberId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            memberId = await db.DirectMessages.Where(m => m.RecipientId == professional).Select(m => m.SenderId).SingleAsync(TestContext.Current.CancellationToken);
        }

        var theirs = Assert.Single(await TextsAsync(pro, proCookie, memberId));
        Assert.Equal(mine, theirs);
    }

    [Theory]
    [InlineData("one-on-one", "One-on-one session")]
    [InlineData("small-group", "Small-group session")]
    [InlineData("intro-call", "Free 15-minute intro call")]
    public async Task Given_each_kind_When_it_is_requested_without_a_message_Then_the_delivered_text_names_the_kind_and_when(string kind, string label)
    {
        var (listing, professional, pro, _) = await ListedAsync($"danielle.book2.{kind}@example.org", "Danielle Okafor");
        using var _1 = pro;
        var (member, cookie) = await MemberAsync($"grace.book2.{kind}@example.org");
        using var _2 = member;

        var sent = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{listing}/booking-requests", Valid(kind, "Saturday mornings", null));

        Assert.Equal(HttpStatusCode.Created, sent.Status);
        var text = Assert.Single(await TextsAsync(member, cookie, professional));
        Assert.Contains(label, text, StringComparison.Ordinal);
        Assert.Contains("Saturday mornings", text, StringComparison.Ordinal);
    }

    public static TheoryData<string, object, string, string[]> Invalid() => new()
    {
        { "when blank", new { kind = "intro-call", when = "  ", message = "Hi" }, "validation_failed", ["when"] },
        { "when missing", new { kind = "intro-call", message = "Hi" }, "validation_failed", ["when"] },
        { "kind unknown", new { kind = "massage", when = "Mondays" }, "validation_failed", ["kind"] },
        { "kind missing", new { when = "Mondays" }, "validation_failed", ["kind"] },
        { "when 201", new { kind = "intro-call", when = new string('w', 201) }, "field_too_long", ["when"] },
        { "message 1001", new { kind = "intro-call", when = "Mondays", message = new string('m', 1001) }, "field_too_long", ["message"] },
    };

    [Theory]
    [MemberData(nameof(Invalid))]
    public async Task Given_an_invalid_request_When_it_is_sent_Then_it_is_refused_400_naming_the_fields_and_nothing_is_delivered(
        string why, object body, string code, string[] fields)
    {
        var tag = Math.Abs(why.GetHashCode(StringComparison.Ordinal));
        var (listing, professional, pro, _) = await ListedAsync($"danielle.book3.{tag}@example.org", "Danielle Okafor");
        using var _1 = pro;
        var (member, cookie) = await MemberAsync($"grace.book3.{tag}@example.org");
        using var _2 = member;

        var answer = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{listing}/booking-requests", body);

        Assert.True(answer.Status == HttpStatusCode.BadRequest, why);
        Assert.Equal(code, answer.Body.GetProperty("code").GetString());
        Assert.Equal(fields, answer.Body.GetProperty("errors").EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Empty(await TextsAsync(member, cookie, professional));
    }

    [Fact]
    public async Task Given_a_suspended_professional_or_my_own_listing_When_I_request_a_booking_Then_it_is_refused_recipient_unavailable()
    {
        var suspended = await ListedAsync("tyler.book4@example.org", "Tyler Brooks");
        using var _1 = suspended.Client;
        var own = await ListedAsync("ruth.book4@example.org", "Ruth Abernathy");
        using var _2 = own.Client;
        var (member, cookie) = await MemberAsync("grace.book4@example.org");
        using var _3 = member;
        await factory.SuspendAsync("tyler.book4@example.org");

        var ofSuspended = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{suspended.Listing}/booking-requests", Valid());
        var ofOwn = await SendAsync(own.Client, own.Cookie, HttpMethod.Post, $"/api/services/{own.Listing}/booking-requests", Valid());

        foreach (var answer in new[] { ofSuspended, ofOwn })
        {
            Assert.Equal(HttpStatusCode.Forbidden, answer.Status);
            Assert.Equal("recipient_unavailable", answer.Body.GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task Given_a_listing_with_a_contact_link_or_an_unknown_one_When_I_request_a_booking_Then_it_is_refused_with_a_code()
    {
        var linked = await ListedAsync("marcus.book5@example.org", "Marcus Lee", "https://marcus.example.org/book");
        using var _1 = linked.Client;
        var (member, cookie) = await MemberAsync("grace.book5@example.org");
        using var _2 = member;

        var withLink = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{linked.Listing}/booking-requests", Valid());
        var unknown = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{Guid.NewGuid()}/booking-requests", Valid());

        Assert.Equal(HttpStatusCode.Conflict, withLink.Status);
        Assert.Equal("professional_not_linked", withLink.Body.GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.NotFound, unknown.Status);
        Assert.Equal("service_not_found", unknown.Body.GetProperty("code").GetString());
        Assert.Empty(await TextsAsync(member, cookie, linked.Professional));
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_a_booking_is_requested_Then_it_is_refused()
    {
        using var anonymous = Browser.CreateClient(factory);

        var answer = await SendAsync(anonymous, null, HttpMethod.Post, $"/api/services/{Guid.NewGuid()}/booking-requests", Valid());

        Assert.Equal(HttpStatusCode.Unauthorized, answer.Status);
    }
}
