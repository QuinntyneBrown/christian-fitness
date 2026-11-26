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
/// L2-014 (slice 17.1; ADR 0000): a member chooses Message on a listing and is given the direct
/// conversation with the professional the listing was published for (<c>POST /api/services/{id}/conversation</c>);
/// a listing with a published contact link is not messaged here and serves its link only when asked
/// (<c>GET /api/services/{id}/contact-link</c>), never in the list or the listing. Unknown listings,
/// suspended and own professionals are refused with a code; nobody signed in is refused.
/// </summary>
public sealed class ContactProfessionalTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string Link = "https://marcus.example.org/book?ref=cf";

    private async Task<(Guid Listing, Guid Professional, HttpClient Client, string Cookie)> ListedAsync(string email, string name, string? contactUrl = null)
    {
        var applicant = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(applicant, JoinTests.Details(email) with { FullName = name });
        var body = new { role = "Registered dietitian", category = "Nutrition", credentials = "RD", where = "Virtual", price = "$95", about = $"About {name}." };
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

    private static async Task<(HttpStatusCode Status, JsonElement Body)> SendAsync(HttpClient client, string? cookie, HttpMethod method, string path)
    {
        using var response = await Browser.SendAsync(client, method, path, cookie);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return (response.StatusCode, text.Length == 0 ? default : JsonSerializer.Deserialize<JsonElement>(text));
    }

    [Fact]
    public async Task Given_a_listing_with_a_linked_professional_When_a_member_chooses_Message_Then_the_direct_conversation_with_them_opens()
    {
        var (listing, professional, pro, _) = await ListedAsync("marcus.contact1@example.org", "Marcus Lee");
        using var _1 = pro;
        var (member, cookie) = await MemberAsync("grace.contact1@example.org");
        using var _2 = member;

        var first = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{listing}/conversation");
        var again = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{listing}/conversation");

        Assert.Equal(HttpStatusCode.OK, first.Status);
        Assert.Equal(["memberId"], first.Body.EnumerateObject().Select(p => p.Name));
        Assert.Equal(professional, first.Body.GetProperty("memberId").GetGuid());
        Assert.Equal(first.Body.GetProperty("memberId").GetGuid(), again.Body.GetProperty("memberId").GetGuid());
        var history = await SendAsync(member, cookie, HttpMethod.Get, $"/api/messages/{professional}/messages");
        Assert.Equal(HttpStatusCode.OK, history.Status);
    }

    [Fact]
    public async Task Given_a_suspended_professional_or_my_own_listing_When_I_choose_Message_Then_it_is_refused_recipient_unavailable()
    {
        var suspended = await ListedAsync("tyler.contact2@example.org", "Tyler Brooks");
        using var _1 = suspended.Client;
        var own = await ListedAsync("ruth.contact2@example.org", "Ruth Abernathy");
        using var _2 = own.Client;
        var (member, cookie) = await MemberAsync("grace.contact2@example.org");
        using var _3 = member;
        await factory.SuspendAsync("tyler.contact2@example.org");

        var ofSuspended = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{suspended.Listing}/conversation");
        var ofOwn = await SendAsync(own.Client, own.Cookie, HttpMethod.Post, $"/api/services/{own.Listing}/conversation");

        foreach (var answer in new[] { ofSuspended, ofOwn })
        {
            Assert.Equal(HttpStatusCode.Forbidden, answer.Status);
            Assert.Equal("recipient_unavailable", answer.Body.GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task Given_a_listing_with_a_contact_link_When_a_member_chooses_Contact_Then_the_link_is_served_and_Message_is_refused()
    {
        var (listing, _, pro, _) = await ListedAsync("marcus.contact3@example.org", "Marcus Lee", Link);
        using var _1 = pro;
        var (member, cookie) = await MemberAsync("grace.contact3@example.org");
        using var _2 = member;

        var contact = await SendAsync(member, cookie, HttpMethod.Get, $"/api/services/{listing}/contact-link");
        var message = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{listing}/conversation");

        Assert.Equal(HttpStatusCode.OK, contact.Status);
        Assert.Equal(["url"], contact.Body.EnumerateObject().Select(p => p.Name));
        Assert.Equal(Link, contact.Body.GetProperty("url").GetString());
        Assert.Equal(HttpStatusCode.Conflict, message.Status);
        Assert.Equal("professional_not_linked", message.Body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_listings_with_and_without_a_contact_link_When_a_member_browses_Then_only_a_flag_is_served_never_the_link()
    {
        var withLink = await ListedAsync("marcus.contact4@example.org", "Marcus Lee", Link);
        using var _1 = withLink.Client;
        var without = await ListedAsync("ruth.contact4@example.org", "Ruth Abernathy");
        using var _2 = without.Client;
        var (member, cookie) = await MemberAsync("grace.contact4@example.org");
        using var _3 = member;

        var one = await SendAsync(member, cookie, HttpMethod.Get, $"/api/services/{withLink.Listing}");
        var two = await SendAsync(member, cookie, HttpMethod.Get, $"/api/services/{without.Listing}");
        var list = await SendAsync(member, cookie, HttpMethod.Get, "/api/services");

        Assert.True(one.Body.GetProperty("hasContactLink").GetBoolean());
        Assert.False(two.Body.GetProperty("hasContactLink").GetBoolean());
        var row = list.Body.GetProperty("services").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == withLink.Listing);
        Assert.True(row.GetProperty("hasContactLink").GetBoolean());
        Assert.DoesNotContain("marcus.example.org", one.Body.GetRawText() + list.Body.GetRawText(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_a_listing_without_a_contact_link_When_a_member_chooses_Contact_Then_it_is_not_found_with_a_code()
    {
        var (listing, _, pro, _) = await ListedAsync("ruth.contact5@example.org", "Ruth Abernathy");
        using var _1 = pro;
        var (member, cookie) = await MemberAsync("grace.contact5@example.org");
        using var _2 = member;

        var answer = await SendAsync(member, cookie, HttpMethod.Get, $"/api/services/{listing}/contact-link");

        Assert.Equal(HttpStatusCode.NotFound, answer.Status);
        Assert.Equal("contact_link_not_found", answer.Body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_an_id_that_is_not_a_listing_When_a_member_chooses_Message_or_Contact_Then_it_is_service_not_found()
    {
        var (member, cookie) = await MemberAsync("grace.contact6@example.org");
        using var _ = member;

        var message = await SendAsync(member, cookie, HttpMethod.Post, $"/api/services/{Guid.NewGuid()}/conversation");
        var contact = await SendAsync(member, cookie, HttpMethod.Get, $"/api/services/{Guid.NewGuid()}/contact-link");

        foreach (var answer in new[] { message, contact })
        {
            Assert.Equal(HttpStatusCode.NotFound, answer.Status);
            Assert.Equal("service_not_found", answer.Body.GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_Message_or_Contact_is_chosen_Then_it_is_refused()
    {
        using var anonymous = Browser.CreateClient(factory);
        var id = Guid.NewGuid();

        var message = await SendAsync(anonymous, null, HttpMethod.Post, $"/api/services/{id}/conversation");
        var contact = await SendAsync(anonymous, null, HttpMethod.Get, $"/api/services/{id}/contact-link");

        Assert.Equal(HttpStatusCode.Unauthorized, message.Status);
        Assert.Equal(HttpStatusCode.Unauthorized, contact.Status);
    }
}
