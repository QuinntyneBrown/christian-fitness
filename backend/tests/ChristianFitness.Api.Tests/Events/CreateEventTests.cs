using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC1 (ADR 0021): signed-in staff create an event and it is saved as a draft, its Toronto
/// start stored as the instant; only a staff session may create one (L2-018 AC4, ADR 0011), and
/// only an Admin's, since Events is an Admin area (L2-019 AC1, ADR 0020).
/// </summary>
public sealed class CreateEventTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    [Fact]
    public async Task Given_signed_in_staff_When_they_create_an_event_Then_it_answers_201_with_the_draft()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.create@example.org");

        using var response = await AdminEvents.CreateAsync(client, cookie, AdminEvents.Retreat());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["area", "capacity", "category", "going", "id", "place", "priceCents", "series", "startsAt", "status", "title"],
            created.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.True(Guid.TryParse(created.GetProperty("id").GetString(), out _));
        Assert.Equal("Whole Life Retreat", created.GetProperty("title").GetString());
        Assert.Equal("retreat", created.GetProperty("category").GetString());
        // 4:00 PM on May 22 in Toronto is daylight time, UTC-4.
        Assert.Equal("2026-05-22T20:00:00+00:00", created.GetProperty("startsAt").GetString());
        Assert.Equal("Muskoka Woods, Rosseau", created.GetProperty("place").GetString());
        Assert.Equal("Muskoka Lakes", created.GetProperty("area").GetString());
        Assert.Equal(34000, created.GetProperty("priceCents").GetInt32());
        Assert.Equal(60, created.GetProperty("capacity").GetInt32());
        Assert.Equal(0, created.GetProperty("going").GetInt32());
        Assert.Equal("draft", created.GetProperty("status").GetString());
        // A standalone event belongs to no series (ADR 0091).
        Assert.Equal(JsonValueKind.Null, created.GetProperty("series").ValueKind);
    }

    [Fact]
    public async Task Given_a_created_event_When_it_is_read_from_the_store_Then_every_field_is_kept_trimmed_as_a_draft()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.create.store@example.org");
        var body = AdminEvents.Retreat();
        body["title"] = "  Whole Life Retreat (store)  ";
        body["summary"] = " Meals and cabins included. ";

        using var response = await AdminEvents.CreateAsync(client, cookie, body);

        var id = Guid.Parse((await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetString()!);
        using var scope = factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.SingleAsync(e => e.Id == id, TestContext.Current.CancellationToken);
        Assert.Equal("Whole Life Retreat (store)", stored.Title);
        Assert.Equal("Meals and cabins included.", stored.Summary);
        Assert.Equal(Domain.Events.EventStatus.Draft, stored.Status);
        Assert.Equal(Domain.Events.EventCategory.Retreat, stored.Category);
        Assert.Equal(new DateTimeOffset(2026, 5, 22, 20, 0, 0, TimeSpan.Zero), stored.StartsAt);
        Assert.Equal(factory.Time.GetUtcNow(), stored.CreatedAt);
    }

    // In January Toronto is on standard time, UTC-5; a free event's price is 0.
    [Fact]
    public async Task Given_a_free_winter_event_When_it_is_created_Then_its_start_is_read_on_standard_time_and_its_price_is_zero()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.create.winter@example.org");
        var body = AdminEvents.Retreat();
        body["date"] = "2027-01-09";
        body["startTime"] = "07:30";
        body["priceCents"] = 0;

        using var response = await AdminEvents.CreateAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("2027-01-09T12:30:00+00:00", created.GetProperty("startsAt").GetString());
        Assert.Equal(0, created.GetProperty("priceCents").GetInt32());
    }

    [Fact]
    public async Task Given_a_member_session_When_it_creates_an_event_Then_it_is_refused_with_401_and_nothing_is_saved()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "grace.create@example.org", role: null);
        using var signedIn = await Browser.SignInAsync(client, "grace.create@example.org", Staff.Password);
        var body = AdminEvents.Retreat();
        body["title"] = "Made by a member";

        using var response = await AdminEvents.CreateAsync(client, Browser.SessionCookie(signedIn), body);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.AnyAsync(e => e.Title == "Made by a member", TestContext.Current.CancellationToken));
    }

    // L2-019 AC1 (ADR 0020): a Moderator's staff session is valid, but Events is an Admin area.
    [Fact]
    public async Task Given_a_Moderator_When_they_create_an_event_Then_it_is_refused_with_forbidden_role_and_nothing_is_saved()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "joel.create@example.org", Domain.Members.StaffRoleName.Moderator);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, "joel.create@example.org");
        var body = AdminEvents.Retreat();
        body["title"] = "Made by a Moderator";

        using var response = await AdminEvents.CreateAsync(client, Staff.Cookie(signedIn), body);

        await StaffRoleTests.AssertRefusedAsync(response, "forbidden_role");
        using var scope = factory.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.AnyAsync(e => e.Title == "Made by a Moderator", TestContext.Current.CancellationToken));
    }
}
