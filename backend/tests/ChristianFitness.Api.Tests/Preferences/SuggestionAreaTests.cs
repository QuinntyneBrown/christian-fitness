using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Home;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>
/// L2-065 AC7 (journey 34, slice 5; ADR 0076): staff give an event a suggestion area, one of the
/// eight or none for GTA-wide; an area off the list is refused naming the field.
/// </summary>
public sealed class EventSuggestionAreaTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    [Fact]
    public async Task Given_an_event_When_staff_choose_its_suggestion_area_Then_the_editor_reads_it_back_and_an_unknown_one_is_refused()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.area@example.org");
        var body = AdminEvents.Retreat();
        body["suggestionArea"] = "scarborough";

        var id = await AdminEvents.CreatedIdAsync(client, cookie, body);
        using var read = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/{id}", cookie);
        var gtaWide = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        using var readGtaWide = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/{gtaWide}", cookie);
        body["suggestionArea"] = "the-moon";
        using var refused = await AdminEvents.CreateAsync(client, cookie, body);

        Assert.Equal("scarborough", (await read.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("suggestionArea").GetString());
        Assert.Equal(JsonValueKind.Null, (await readGtaWide.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("suggestionArea").ValueKind);
        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        Assert.Equal("suggestion_area_invalid", (await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("fieldCodes").GetProperty("suggestionArea").GetString());
    }
}

/// <summary>
/// L2-065 AC7 (journey 34, slice 5): once a member saves their area, Home suggests events in it or
/// GTA-wide before a sooner event in another area.
/// </summary>
public sealed class HomeAreaTests(HomeFactory factory) : IClassFixture<HomeFactory>
{
    [Fact]
    public async Task Given_a_member_with_an_area_When_Home_is_asked_for_Then_events_in_it_or_GTA_wide_come_before_a_sooner_event_elsewhere()
    {
        var elsewhere = await AddAsync("Area elsewhere", 1, "brampton");
        var inArea = await AddAsync("Area in", 2, "scarborough");
        var gtaWide = await AddAsync("Area GTA-wide", 3, null);
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.home.area@example.org"));

        var before = await SuggestedAsync(client, cookie);
        var body = Prefs.Body();
        body["suggestions"] = new { area = "scarborough", interests = new[] { "running", "strength" } };
        using var saved = await Prefs.SaveAsync(client, cookie, body);
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var after = await SuggestedAsync(client, cookie);

        // With no area chosen the three rank by date alone.
        Assert.Equal([elsewhere, inArea, gtaWide], before);
        Assert.Equal([inArea, gtaWide, elsewhere], after);
    }

    private async Task<Guid> AddAsync(string title, int day, string? area)
    {
        var id = await factory.AddEventAsync(title, TimeSpan.FromDays(day));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.Events.SingleAsync(e => e.Id == id, TestContext.Current.CancellationToken);
        stored.SuggestIn(area);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return id;
    }

    private static async Task<Guid[]> SuggestedAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/home", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var home = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return [.. home.GetProperty("suggested").EnumerateArray().Select(e => e.GetProperty("id").GetGuid())];
    }
}
