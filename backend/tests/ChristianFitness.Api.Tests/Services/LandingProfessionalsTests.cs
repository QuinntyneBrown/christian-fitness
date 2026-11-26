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
/// L2-001 AC5 to AC7 (slice 8.2; ADR 0000): a visitor with no session asks <c>GET /api/public/services/featured</c>
/// and gets the first three published listings by name with public fields only (name, role, category, where,
/// price); a pending or declined application is not listed; none answers an empty list.
/// </summary>
public sealed class LandingProfessionalsTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string Path = "/api/public/services/featured";

    private async Task ListAsync(string email, string name, string role, string category, string price)
    {
        using var applicant = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(applicant, JoinTests.Details(email) with { FullName = name });
        var body = new { role, category, credentials = "Secret credentials", where = "Mississauga", price, about = $"About {name}." };
        using var applied = await AdminEvents.SendAsync(applicant, HttpMethod.Post, "/api/professional-applications", cookie, body);
        Assert.Equal(HttpStatusCode.Created, applied.StatusCode);
        var application = (await applied.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
        using var staff = Browser.CreateClient(factory);
        var staffEmail = $"dana.{application:N}@example.org";
        await Staff.CreateAsync(factory, staff, staffEmail, StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, staff, staffEmail);
        var staffCookie = Staff.Cookie(signedIn);
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var approved = await AdminEvents.SendAsync(staff, HttpMethod.Post, $"/api/admin/services/applications/{application}/approve", staffCookie);
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);
    }

    private async Task ClearAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ServiceListings.RemoveRange(db.ServiceListings);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<JsonElement> AskAsync()
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie: null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_a_visitor_and_four_listings_When_asked_Then_the_first_three_by_name_come_with_public_fields_only()
    {
        await ClearAsync();
        await ListAsync("lp.d@example.org", "Dora Dent", "Dietitian", "Nutrition", "$90");
        await ListAsync("lp.a@example.org", "Amy Abel", "Personal trainer", "Training", "$70");
        await ListAsync("lp.c@example.org", "Cara Cole", "Physiotherapist", "Physio", "$110");
        await ListAsync("lp.b@example.org", "Ben Bell", "Counsellor", "Counselling", "$80");

        var answer = await AskAsync();

        var items = answer.EnumerateArray().ToList();
        Assert.Equal(["Amy Abel", "Ben Bell", "Cara Cole"], items.Select(i => i.GetProperty("name").GetString()));
        Assert.Equal(["category", "name", "price", "role", "where"], items[0].EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(("Personal trainer", "Training", "Mississauga", "$70"),
            (items[0].GetProperty("role").GetString(), items[0].GetProperty("category").GetString(), items[0].GetProperty("where").GetString(), items[0].GetProperty("price").GetString()));
    }

    [Fact]
    public async Task Given_no_listings_When_asked_Then_the_list_is_empty()
    {
        await ClearAsync();

        var answer = await AskAsync();

        Assert.Equal(0, answer.GetArrayLength());
    }
}
