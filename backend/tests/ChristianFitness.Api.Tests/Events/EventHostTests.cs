using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC1, AC11 (ADR 0067, ADR 0089): a new event's host defaults to the Listed Christian
/// Fitness team listing, an event is saved with the host the Admin chose, and the editor opens
/// with the saved host.
/// </summary>
public sealed class EventHostTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    [Fact]
    public async Task Given_an_Admin_When_they_ask_for_the_default_host_Then_it_is_the_team_listing()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.host.default@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/events/hosts/default", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var host = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["id", "kind", "name"], host.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(DirectoryListing.TeamListingId.ToString(), host.GetProperty("id").GetString());
        Assert.Equal("organization", host.GetProperty("kind").GetString());
        Assert.Equal("Christian Fitness", host.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_a_member_session_When_it_asks_for_the_default_host_Then_it_is_refused_with_401()
    {
        using var client = Browser.CreateClient(factory);
        await Admin.Staff.CreateAsync(factory, client, "grace.host.default@example.org", role: null);
        using var signedIn = await Browser.SignInAsync(client, "grace.host.default@example.org", Admin.Staff.Password);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/events/hosts/default", Browser.SessionCookie(signedIn));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_Listed_host_When_an_Admin_creates_an_event_with_it_Then_the_event_is_saved_with_that_host_and_the_editor_opens_with_it()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.host.create@example.org");
        var lakeshore = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        var body = AdminEvents.Retreat();
        body["hostListingId"] = lakeshore;

        var id = await AdminEvents.CreatedIdAsync(client, cookie, body);

        using (var scope = factory.Services.CreateScope())
        {
            var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.SingleAsync(e => e.Id == id, TestContext.Current.CancellationToken);
            Assert.Equal(lakeshore, stored.HostListingId);
        }

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/{id}", cookie);
        var host = (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("host");
        Assert.Equal(["id", "kind", "name"], host.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(lakeshore.ToString(), host.GetProperty("id").GetString());
        Assert.Equal("organization", host.GetProperty("kind").GetString());
        Assert.Equal("Lakeshore Runners Fellowship", host.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_an_event_When_an_Admin_saves_it_with_another_Listed_host_Then_the_new_host_is_kept()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.host.edit@example.org");
        var danielle = await factory.AddListingAsync(ListingKind.Instructor, "Danielle Okafor");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        var body = AdminEvents.Retreat();
        body["hostListingId"] = danielle;

        using var saved = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, body);

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/{id}", cookie);
        var host = (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("host");
        Assert.Equal(danielle.ToString(), host.GetProperty("id").GetString());
        Assert.Equal("instructor", host.GetProperty("kind").GetString());
        Assert.Equal("Danielle Okafor", host.GetProperty("name").GetString());
    }
}
