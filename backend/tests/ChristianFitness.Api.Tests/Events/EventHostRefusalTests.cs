using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC12 (ADR 0089): a missing host, or one that is not a Listed directory listing, is
/// refused with 400 <c>validation_failed</c> naming <c>hostListingId</c> in <c>fieldCodes</c>, on
/// create and on edit, and nothing is saved. One row per case.
/// </summary>
public sealed class EventHostRefusalTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    public static TheoryData<string, string> Rows() => new()
    {
        // the host sent, the code expected
        { "missing", "host_required" },
        { "unknown", "host_not_listed" },
        { "draft", "host_not_listed" },
        { "declined", "host_not_listed" },
        { "removed", "host_not_listed" },
    };

    private async Task<object?> HostAsync(string host) => host switch
    {
        "missing" => null,
        "unknown" => Guid.NewGuid(),
        "draft" => await factory.AddListingAsync(ListingKind.Organization, "Draft Host Club", ListingStatus.Draft),
        "declined" => await factory.AddListingAsync(ListingKind.Organization, "Declined Host Club", ListingStatus.Declined),
        "removed" => await factory.AddListingAsync(ListingKind.Organization, "Removed Host Club", ListingStatus.Removed),
        _ => throw new ArgumentOutOfRangeException(nameof(host), host, "An unknown row."),
    };

    private static async Task AssertRefusedAsync(HttpResponseMessage response, string code)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["hostListingId"], problem.GetProperty("fieldCodes").EnumerateObject().Select(p => p.Name));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty("hostListingId").GetString());
    }

    [Theory]
    [MemberData(nameof(Rows))]
    public async Task Given_a_host_that_is_not_Listed_When_an_event_is_created_with_it_Then_it_is_refused_and_nothing_is_saved(string host, string code)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, $"dana.host.refused.create.{host}@example.org");
        var body = AdminEvents.Retreat();
        body["title"] = $"Refused host {host}";
        body["hostListingId"] = await HostAsync(host);

        using var response = await AdminEvents.CreateAsync(client, cookie, body);

        await AssertRefusedAsync(response, code);
        using var scope = factory.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.AnyAsync(e => e.Title == $"Refused host {host}", TestContext.Current.CancellationToken));
    }

    [Theory]
    [MemberData(nameof(Rows))]
    public async Task Given_a_host_that_is_not_Listed_When_an_event_is_saved_with_it_Then_it_is_refused_and_the_event_keeps_its_host(string host, string code)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, $"dana.host.refused.edit.{host}@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        var body = AdminEvents.Retreat();
        body["title"] = "Changed title";
        body["hostListingId"] = await HostAsync(host);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, body);

        await AssertRefusedAsync(response, code);
        using var scope = factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.SingleAsync(e => e.Id == id, TestContext.Current.CancellationToken);
        Assert.Equal(DirectoryListing.TeamListingId, stored.HostListingId);
        Assert.Equal("Whole Life Retreat", stored.Title);
    }
}
