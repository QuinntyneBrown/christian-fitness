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
/// L2-027 AC1 (slice 23.1; ADR 0000): an Admin lists the live listings and edits one; members then
/// see the change on Services; a bad field is refused with its code and changes nothing; the change leaves
/// one audit entry that holds no text; a Moderator, a member and nobody are refused.
/// </summary>
public sealed class EditListingTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string Base = "/api/admin/services/listings";

    private async Task<Guid> ListedAsync(string email, string name)
    {
        var applicant = Browser.CreateClient(factory);
        using var _ = applicant;
        var cookie = await OwnProfileTests.JoinedAsync(applicant, JoinTests.Details(email) with { FullName = name });
        var body = new { role = "Registered massage therapist", category = "Physio", credentials = "RMT, CMTO #T4471", where = "Mississauga", price = "$95 / hour", about = "Gentle, evidence-led care." };
        using var applied = await AdminEvents.SendAsync(applicant, HttpMethod.Post, "/api/professional-applications", cookie, body);
        Assert.Equal(HttpStatusCode.Created, applied.StatusCode);
        var application = (await applied.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
        var (staff, staffCookie, _) = await StaffAsync($"dana.{application:N}@example.org", StaffRoleName.Admin);
        using var __ = staff;
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var approved = await AdminEvents.SendAsync(staff, HttpMethod.Post, $"/api/admin/services/applications/{application}/approve", staffCookie);
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);
        return (await approved.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("listingId").GetGuid();
    }

    private async Task<(HttpClient Client, string Cookie, Guid Id)> StaffAsync(string email, StaffRoleName role)
    {
        var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, email, role));
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return (client, Staff.Cookie(signedIn), id);
    }

    private async Task<T> InDbAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

    private static Dictionary<string, object?> Edit(Action<Dictionary<string, object?>>? change = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["name"] = "Hannah B. Bergstrom",
            ["role"] = " Sports physiotherapist ",
            ["category"] = "Training",
            ["where"] = "Oakville",
            ["price"] = "$110 / hour",
            ["credentials"] = "BScPT, CPA member",
            ["about"] = "Return-to-run plans.",
            ["contactUrl"] = "https://hannah.example.org/book",
        };
        change?.Invoke(body);
        return body;
    }

    private static Task<HttpResponseMessage> PutAsync(HttpClient client, string? cookie, Guid id, object body) =>
        AdminEvents.SendAsync(client, HttpMethod.Put, $"{Base}/{id}", cookie, body);

    [Fact]
    public async Task Given_a_live_listing_When_an_Admin_edits_its_fields_Then_members_see_the_change_on_Services_and_one_audit_entry_is_kept()
    {
        var listing = await ListedAsync("hannah.edit1@example.org", "Hannah Bergstrom");
        var (staff, cookie, adminId) = await StaffAsync("dana.edit1@example.org", StaffRoleName.Admin);
        using var _ = staff;
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var now = factory.Time.GetUtcNow();

        using var response = await PutAsync(staff, cookie, listing, Edit());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await JsonAsync(response);
        Assert.Equal(
            ["about", "category", "contactUrl", "credentials", "id", "name", "price", "publishedAt", "role", "where"],
            answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            ("Hannah B. Bergstrom", "Sports physiotherapist", "Training", "https://hannah.example.org/book"),
            (answer.GetProperty("name").GetString(), answer.GetProperty("role").GetString(), answer.GetProperty("category").GetString(), answer.GetProperty("contactUrl").GetString()));

        var member = Browser.CreateClient(factory);
        using var __ = member;
        var memberCookie = await OwnProfileTests.JoinedAsync(member, JoinTests.Details("grace.edit1@example.org"));
        using var seen = await Browser.SendAsync(member, HttpMethod.Get, $"/api/services/{listing}", memberCookie);
        var service = await JsonAsync(seen);
        Assert.Equal(
            ("Hannah B. Bergstrom", "Sports physiotherapist", "Training", "Oakville", "$110 / hour", "BScPT, CPA member", "Return-to-run plans.", true),
            (service.GetProperty("name").GetString(), service.GetProperty("role").GetString(), service.GetProperty("category").GetString(), service.GetProperty("where").GetString(),
                service.GetProperty("price").GetString(), service.GetProperty("credentials").GetString(), service.GetProperty("about").GetString(), service.GetProperty("hasContactLink").GetBoolean()));
        var entry = await InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == listing, TestContext.Current.CancellationToken));
        Assert.Equal((adminId, "listing.updated", "ServiceListing", now), (entry.ActorMemberId, entry.Action, entry.RecordType, entry.OccurredAt));
    }

    [Fact]
    public async Task Given_a_listing_with_a_contact_link_When_an_Admin_saves_it_with_none_Then_the_link_is_cleared()
    {
        var listing = await ListedAsync("hannah.edit2@example.org", "Hannah Bergstrom");
        var (staff, cookie, _) = await StaffAsync("dana.edit2@example.org", StaffRoleName.Admin);
        using var _ = staff;
        using var first = await PutAsync(staff, cookie, listing, Edit());
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        using var second = await PutAsync(staff, cookie, listing, Edit(b => b["contactUrl"] = "  "));

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await JsonAsync(second)).GetProperty("contactUrl").ValueKind);
        Assert.Null((await InDbAsync(db => db.ServiceListings.SingleAsync(l => l.Id == listing, TestContext.Current.CancellationToken))).ContactUrl);
    }

    [Fact]
    public async Task Given_live_listings_When_an_Admin_opens_the_list_Then_each_is_shown_in_name_order_with_its_contact_link()
    {
        var listing = await ListedAsync("hannah.edit3@example.org", "Aaron Edit3 Lister");
        var (staff, cookie, _) = await StaffAsync("dana.edit3@example.org", StaffRoleName.Admin);
        using var _ = staff;
        using var edited = await PutAsync(staff, cookie, listing, Edit(b => b["name"] = "Aaron Edit3 Lister"));
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);

        using var response = await AdminEvents.SendAsync(staff, HttpMethod.Get, Base, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await JsonAsync(response);
        var rows = answer.GetProperty("listings").EnumerateArray().ToList();
        Assert.Equal(await InDbAsync(db => db.ServiceListings.CountAsync(TestContext.Current.CancellationToken)), answer.GetProperty("total").GetInt32());
        Assert.Equal(rows.Select(r => r.GetProperty("name").GetString()).Order(StringComparer.Ordinal), rows.Select(r => r.GetProperty("name").GetString()));
        var row = rows.Single(r => r.GetProperty("id").GetGuid() == listing);
        Assert.Equal(
            ("Aaron Edit3 Lister", "Sports physiotherapist", "https://hannah.example.org/book"),
            (row.GetProperty("name").GetString(), row.GetProperty("role").GetString(), row.GetProperty("contactUrl").GetString()));
    }

    public static TheoryData<string, object?, string> BadFields() => new()
    {
        // field, value, field code
        { "name", " ", "name_required" },
        { "name", new string('x', 101), "name_too_long" },
        { "role", "", "role_required" },
        { "role", new string('x', 81), "role_too_long" },
        { "category", "Dentist", "category_invalid" },
        { "where", "", "where_required" },
        { "where", new string('x', 81), "where_too_long" },
        { "price", "", "price_required" },
        { "price", new string('x', 61), "price_too_long" },
        { "credentials", "", "credentials_required" },
        { "credentials", new string('x', 201), "credentials_too_long" },
        { "about", "", "about_required" },
        { "about", new string('x', 301), "about_too_long" },
        { "contactUrl", "ftp://example.org/x", "contact_link_invalid" },
        { "contactUrl", "not a link", "contact_link_invalid" },
    };

    [Theory]
    [MemberData(nameof(BadFields))]
    public async Task Given_a_live_listing_When_a_field_is_bad_Then_it_is_refused_with_its_code_and_nothing_changes(string field, object? value, string code)
    {
        var unique = Guid.NewGuid().ToString("N")[..8];
        var listing = await ListedAsync($"hannah.edit4.{unique}@example.org", "Hannah Bergstrom");
        var (staff, cookie, _) = await StaffAsync($"dana.edit4.{unique}@example.org", StaffRoleName.Admin);
        using var _ = staff;

        using var response = await PutAsync(staff, cookie, listing, Edit(b => b[field] = value));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await JsonAsync(response);
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        Assert.DoesNotContain("xxxxxxxxxx", problem.ToString(), StringComparison.Ordinal);
        var stored = await InDbAsync(db => db.ServiceListings.SingleAsync(l => l.Id == listing, TestContext.Current.CancellationToken));
        Assert.Equal(("Hannah Bergstrom", "Registered massage therapist", ServiceCategory.Physio, "Mississauga", "$95 / hour"), (stored.Name, stored.Role, stored.Category, stored.Where, stored.Price));
        Assert.False(await InDbAsync(db => db.AuditEntries.AnyAsync(e => e.RecordId == listing, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_an_unknown_listing_When_an_Admin_edits_it_Then_it_is_refused_service_not_found()
    {
        var (staff, cookie, _) = await StaffAsync("dana.edit5@example.org", StaffRoleName.Admin);
        using var _ = staff;

        using var response = await PutAsync(staff, cookie, Guid.NewGuid(), Edit());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("service_not_found", (await JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_Moderator_a_member_or_nobody_When_they_edit_or_list_listings_Then_it_is_refused_and_nothing_changes()
    {
        var listing = await ListedAsync("hannah.edit6@example.org", "Hannah Bergstrom");
        var (moderator, moderatorCookie, _) = await StaffAsync("joel.edit6@example.org", StaffRoleName.Moderator);
        using var _ = moderator;
        var member = Browser.CreateClient(factory);
        using var __ = member;
        var memberCookie = await OwnProfileTests.JoinedAsync(member, JoinTests.Details("grace.edit6@example.org"));
        using var anonymous = Browser.CreateClient(factory);

        using var putModerator = await PutAsync(moderator, moderatorCookie, listing, Edit());
        using var listModerator = await AdminEvents.SendAsync(moderator, HttpMethod.Get, Base, moderatorCookie);
        using var putMember = await PutAsync(member, memberCookie, listing, Edit());
        using var putNobody = await PutAsync(anonymous, null, listing, Edit());

        Assert.Equal((HttpStatusCode.Forbidden, HttpStatusCode.Forbidden), (putModerator.StatusCode, listModerator.StatusCode));
        Assert.Equal("forbidden_role", (await JsonAsync(putModerator)).GetProperty("code").GetString());
        Assert.Equal((HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized), (putMember.StatusCode, putNobody.StatusCode));
        Assert.Equal("Hannah Bergstrom", (await InDbAsync(db => db.ServiceListings.SingleAsync(l => l.Id == listing, TestContext.Current.CancellationToken))).Name);
        Assert.False(await InDbAsync(db => db.AuditEntries.AnyAsync(e => e.RecordId == listing, TestContext.Current.CancellationToken)));
    }
}
