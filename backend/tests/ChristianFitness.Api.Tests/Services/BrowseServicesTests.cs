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
/// L2-013 AC1 and AC2 (slice 16.1; ADR 0000): a member opens <c>GET /api/services</c> and sees each
/// published listing's name, role, category, where, price, credentials and about, in name order, at most
/// 50 with the number matching in all; a category narrows the list, an unknown one is refused with
/// <c>category_invalid</c>; a pending or declined application is not listed; nobody signed in is refused.
/// </summary>
public sealed class BrowseServicesTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string Path = "/api/services";

    private async Task<Guid> ApplyAsync(string email, string name, string role, string category, string price = "$70")
    {
        var applicant = Browser.CreateClient(factory);
        using var _ = applicant;
        var cookie = await OwnProfileTests.JoinedAsync(applicant, JoinTests.Details(email) with { FullName = name });
        var body = new { role, category, credentials = $"{role} credentials", where = "Mississauga", price, about = $"About {name}." };
        using var applied = await AdminEvents.SendAsync(applicant, HttpMethod.Post, "/api/professional-applications", cookie, body);
        Assert.Equal(HttpStatusCode.Created, applied.StatusCode);
        return (await applied.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
    }

    private async Task ListAsync(string email, string name, string role, string category, string price = "$70") =>
        await DecideAsync(await ApplyAsync(email, name, role, category, price), approve: true);

    private async Task DecideAsync(Guid application, bool approve)
    {
        var staff = Browser.CreateClient(factory);
        using var _ = staff;
        var email = $"dana.{application:N}@example.org";
        await Staff.CreateAsync(factory, staff, email, StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(staff, email, factory.Time.GetUtcNow());
        var cookie = Staff.Cookie(signedIn);
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var path = $"/api/admin/services/applications/{application}/{(approve ? "approve" : "decline")}";
        using var response = await AdminEvents.SendAsync(staff, HttpMethod.Post, path, cookie, approve ? null : new { reason = "Not verified" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task ClearAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ServiceListings.RemoveRange(db.ServiceListings);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string cookie, string query = "")
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path + query, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static string[] NamesOf(JsonElement answer) =>
        [.. answer.GetProperty("services").EnumerateArray().Select(r => r.GetProperty("name").GetString()!)];

    [Fact]
    public async Task Given_published_listings_When_a_member_opens_Services_Then_each_shows_its_fields_in_name_order()
    {
        await ClearAsync();
        await ListAsync("ruth.browse1@example.org", "Ruth Abernathy", "Physiotherapist", "Physio", "$110 assessment");
        await ListAsync("marcus.browse1@example.org", "<b>Marcus</b> Lee", "Registered dietitian", "Nutrition", "$95 first consult");
        await ListAsync("danielle.browse1@example.org", "Danielle Okafor", "Personal trainer", "Training");
        var (member, cookie) = await MemberAsync("grace.browse1@example.org");
        using var _ = member;

        var answer = await ReadAsync(member, cookie);

        Assert.Equal(["services", "total"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(3, answer.GetProperty("total").GetInt32());
        var rows = answer.GetProperty("services").EnumerateArray().ToArray();
        Assert.All(rows, row => Assert.Equal(
            ["about", "category", "credentials", "hasContactLink", "id", "name", "price", "publishedAt", "role", "where"],
            row.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        Assert.Equal(["<b>Marcus</b> Lee", "Danielle Okafor", "Ruth Abernathy"], NamesOf(answer));
        Assert.Equal(["Registered dietitian", "Personal trainer", "Physiotherapist"], rows.Select(r => r.GetProperty("role").GetString()!));
        Assert.Equal(["Nutrition", "Training", "Physio"], rows.Select(r => r.GetProperty("category").GetString()!));
        Assert.Equal(["$95 first consult", "$70", "$110 assessment"], rows.Select(r => r.GetProperty("price").GetString()!));
        Assert.Equal("Registered dietitian credentials", rows[0].GetProperty("credentials").GetString());
        Assert.Equal("About <b>Marcus</b> Lee.", rows[0].GetProperty("about").GetString());
        Assert.Equal("Mississauga", rows[0].GetProperty("where").GetString());
    }

    [Fact]
    public async Task Given_listings_of_several_categories_When_a_member_asks_for_one_Then_only_its_listings_show()
    {
        await ClearAsync();
        await ListAsync("a.browse2@example.org", "Anna Training", "Trainer", "Training");
        await ListAsync("b.browse2@example.org", "Ben Nutrition", "Dietitian", "Nutrition");
        await ListAsync("c.browse2@example.org", "Cara Nutrition", "Dietitian", "Nutrition");
        var (member, cookie) = await MemberAsync("grace.browse2@example.org");
        using var _ = member;

        var nutrition = await ReadAsync(member, cookie, "?category=Nutrition");
        var counselling = await ReadAsync(member, cookie, "?category=Counselling");

        Assert.Equal(2, nutrition.GetProperty("total").GetInt32());
        Assert.Equal(["Ben Nutrition", "Cara Nutrition"], NamesOf(nutrition));
        Assert.Equal((0, 0), (counselling.GetProperty("total").GetInt32(), counselling.GetProperty("services").GetArrayLength()));
    }

    [Fact]
    public async Task Given_pending_and_declined_applications_When_a_member_opens_Services_Then_only_the_approved_one_is_listed()
    {
        await ClearAsync();
        await ListAsync("yes.browse3@example.org", "Approved Person", "Trainer", "Training");
        await ApplyAsync("pending.browse3@example.org", "Pending Person", "Trainer", "Training");
        await DecideAsync(await ApplyAsync("declined.browse3@example.org", "Declined Person", "Trainer", "Training"), approve: false);
        var (member, cookie) = await MemberAsync("grace.browse3@example.org");
        using var _ = member;

        var answer = await ReadAsync(member, cookie);

        Assert.Equal(["Approved Person"], NamesOf(answer));
        Assert.Equal(1, answer.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task Given_more_listings_than_the_cap_When_a_member_opens_Services_Then_the_first_50_by_name_are_listed_and_total_counts_all()
    {
        await ClearAsync();
        var applicant = Browser.CreateClient(factory);
        using var __ = applicant;
        await OwnProfileTests.JoinedAsync(applicant, JoinTests.Details("many.browse4@example.org"));
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var start = factory.Time.GetUtcNow();
            var memberId = (await db.Members.SingleAsync(m => m.Email == "many.browse4@example.org", TestContext.Current.CancellationToken)).Id;
            for (var i = 0; i < 52; i++)
            {
                var application = ProfessionalApplication.Submit(memberId, "Role", ServiceCategory.Training, "CPT", "Here", "$1", "Hi", start);
                Assert.True(application.TryApprove($"Pro {i:00}", start, out var listing));
                db.ProfessionalApplications.Add(application);
                db.ServiceListings.Add(listing!);
            }

            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var (member, cookie) = await MemberAsync("grace.browse4@example.org");
        using var _ = member;

        var answer = await ReadAsync(member, cookie);

        Assert.Equal(52, answer.GetProperty("total").GetInt32());
        var names = NamesOf(answer);
        Assert.Equal(50, names.Length);
        Assert.Equal(("Pro 00", "Pro 49"), (names[0], names[^1]));
    }

    [Theory]
    [InlineData("training")]
    [InlineData("Yoga")]
    public async Task Given_a_category_the_API_does_not_know_When_a_member_asks_Then_it_is_refused_with_category_invalid(string category)
    {
        var (member, cookie) = await MemberAsync($"grace.browse5.{category.Length}{category}@example.org");
        using var _ = member;

        using var response = await Browser.SendAsync(member, HttpMethod.Get, $"{Path}?category={Uri.EscapeDataString(category)}", cookie);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("category_invalid", problem.GetProperty("fieldCodes").GetProperty("category").GetString());
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_Services_is_asked_for_Then_it_is_refused()
    {
        using var anonymous = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(anonymous, HttpMethod.Get, Path, cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_published_listing_When_a_member_opens_it_by_id_Then_its_fields_are_served()
    {
        await ClearAsync();
        await ListAsync("detail.browse6@example.org", "Marcus Lee", "Registered dietitian", "Nutrition", "$95 first consult");
        var (member, cookie) = await MemberAsync("grace.browse6@example.org");
        using var _ = member;
        var id = (await ReadAsync(member, cookie)).GetProperty("services")[0].GetProperty("id").GetString();

        using var response = await Browser.SendAsync(member, HttpMethod.Get, $"{Path}/{id}", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var listing = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["about", "category", "credentials", "hasContactLink", "id", "name", "price", "publishedAt", "role", "where"],
            listing.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            (id, "Marcus Lee", "Registered dietitian", "Nutrition", "$95 first consult", "Registered dietitian credentials", "Mississauga", "About Marcus Lee."),
            (listing.GetProperty("id").GetString(), listing.GetProperty("name").GetString(), listing.GetProperty("role").GetString(),
             listing.GetProperty("category").GetString(), listing.GetProperty("price").GetString(), listing.GetProperty("credentials").GetString(),
             listing.GetProperty("where").GetString(), listing.GetProperty("about").GetString()));
    }

    [Fact]
    public async Task Given_an_id_that_is_not_a_listing_When_a_member_opens_it_Then_it_is_not_found_with_a_code()
    {
        await ClearAsync();
        var pending = await ApplyAsync("pending.browse7@example.org", "Pending Person", "Trainer", "Training");
        var (member, cookie) = await MemberAsync("grace.browse7@example.org");
        using var _ = member;

        foreach (var id in new[] { Guid.NewGuid(), pending })
        {
            using var response = await Browser.SendAsync(member, HttpMethod.Get, $"{Path}/{id}", cookie);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
            Assert.Equal("service_not_found", problem.GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task Given_nobody_signed_in_When_a_listing_is_asked_for_Then_it_is_refused()
    {
        using var anonymous = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(anonymous, HttpMethod.Get, $"{Path}/{Guid.NewGuid()}", cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
