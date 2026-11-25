using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-079 AC1, AC3 and AC4 (journey 20; ADR 0094): <c>PUT /api/directory/{id}</c> saves the owner's
/// about, website, photo, focus tags and contact at once and audits it <c>listing.edited</c>; anyone
/// else is refused <c>not_listing_owner</c>, and a field that breaks a rule is refused
/// <c>validation_failed</c> with its code.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class SaveOwnListingTests(DirectoryFactory factory)
{
    /// <summary>A valid save of the listing as the editor sends it, with the given fields changed.</summary>
    internal static Dictionary<string, object?> Body(params (string Key, object? Value)[] changes)
    {
        var body = new Dictionary<string, object?>
        {
            ["name"] = "Eastside Ladies Who Lift",
            ["kind"] = "organization",
            ["about"] = "About 25 women, coached by a CSEP trainer.",
            ["website"] = "eastsideladies.ca",
            ["photoKey"] = null,
            ["focus"] = Tags(2, 8),
            ["contactEmail"] = "lead@eastside.example",
        };
        foreach (var (key, value) in changes)
        {
            body[key] = value;
        }

        return body;
    }

    internal static async Task<(HttpStatusCode Status, JsonElement Body)> SaveAsync(DirectoryFactory factory, Guid listing, string? cookie, object body)
    {
        using var client = Browser.CreateClient(factory);
        using var request = new HttpRequestMessage(HttpMethod.Put, new Uri($"{BrowseDirectoryTests.Path}/{listing}", UriKind.Relative))
        {
            Content = JsonContent.Create(body),
        };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        var json = response.Content.Headers.ContentLength is 0
            ? default
            : await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return (response.StatusCode, json);
    }

    private async Task<T> InDbAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private async Task<(string Cookie, Guid Owner, Guid Listing)> OwnedAsync(string email)
    {
        var (cookie, owner) = await EditOwnListingTests.MemberAsync(factory, email);
        var listing = await factory.AddListingAsync(
            ListingKind.Organization, "Eastside Ladies Who Lift", focus: ["Strength"], description: "Old about", website: "https://old.example");
        await factory.OwnAsync(listing, owner);
        return (cookie, owner, listing);
    }

    [Fact]
    public async Task Given_the_owner_When_they_save_the_about_website_focus_and_contact_Then_the_changes_are_live_at_once_and_audited()
    {
        await factory.ClearAsync();
        var (cookie, owner, listing) = await OwnedAsync("eastside.save@example.org");

        var (status, body) = await SaveAsync(factory, listing, cookie, Body(("focus", TypedFocus)));

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(["listing", "nameChangePending"], body.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.False(body.GetProperty("nameChangePending").GetBoolean());
        var saved = body.GetProperty("listing");
        Assert.Equal("About 25 women, coached by a CSEP trainer.", saved.GetProperty("description").GetString());
        Assert.Equal("https://eastsideladies.ca", saved.GetProperty("websiteUrl").GetString());
        Assert.Equal(["Strength", "Women"], saved.GetProperty("focus").EnumerateArray().Select(f => f.GetString()!));
        Assert.True(saved.GetProperty("isOwner").GetBoolean());
        Assert.Equal("lead@eastside.example", saved.GetProperty("owner").GetProperty("contactEmail").GetString());

        var (_, read) = await ListingProfileTests.ReadAsync(factory, listing);
        Assert.Equal("About 25 women, coached by a CSEP trainer.", read.GetProperty("description").GetString());
        var entry = await InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == listing && e.Action == "listing.edited", TestContext.Current.CancellationToken));
        Assert.Equal(owner, entry.ActorMemberId);
        Assert.Equal("DirectoryListing", entry.RecordType);
    }

    [Fact]
    public async Task Given_the_owner_When_they_save_a_new_name_and_kind_Then_both_wait_for_staff_the_directory_keeps_the_live_ones_and_the_rest_is_live()
    {
        await factory.ClearAsync();
        var (cookie, _, listing) = await OwnedAsync("eastside.rename@example.org");

        var (status, body) = await SaveAsync(factory, listing, cookie, Body(("name", " Eastside Strength Club "), ("kind", "church-ministry")));

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.True(body.GetProperty("nameChangePending").GetBoolean());
        var saved = body.GetProperty("listing");
        Assert.Equal(("Eastside Ladies Who Lift", "organization"), (saved.GetProperty("name").GetString(), saved.GetProperty("kind").GetString()));
        var own = saved.GetProperty("owner");
        Assert.Equal(("Eastside Strength Club", "church-ministry"), (own.GetProperty("pendingName").GetString(), own.GetProperty("pendingKind").GetString()));
        Assert.Equal("About 25 women, coached by a CSEP trainer.", saved.GetProperty("description").GetString());
        var directory = await BrowseDirectoryTests.ReadAsync(factory);
        Assert.Equal(["Eastside Ladies Who Lift"], BrowseDirectoryTests.NamesOf(directory));
        var (_, visitorView) = await ListingProfileTests.ReadAsync(factory, listing);
        Assert.Equal("Eastside Ladies Who Lift", visitorView.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, visitorView.GetProperty("owner").ValueKind);

        var (_, withdrawn) = await SaveAsync(factory, listing, cookie, Body());

        Assert.False(withdrawn.GetProperty("nameChangePending").GetBoolean());
        Assert.Equal(JsonValueKind.Null, withdrawn.GetProperty("listing").GetProperty("owner").GetProperty("pendingName").ValueKind);
    }

    [Fact]
    public async Task Given_a_listing_someone_else_owns_When_a_member_saves_it_Then_it_is_refused_not_listing_owner_and_nothing_changes()
    {
        await factory.ClearAsync();
        var (_, _, listing) = await OwnedAsync("eastside.someone-else@example.org");
        var (grace, _) = await EditOwnListingTests.MemberAsync(factory, "grace.not-the-owner@example.org");

        var (status, body) = await SaveAsync(factory, listing, grace, Body());

        Assert.Equal(HttpStatusCode.Forbidden, status);
        Assert.Equal("not_listing_owner", body.GetProperty("code").GetString());
        var stored = await InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == listing, TestContext.Current.CancellationToken));
        Assert.Equal("Old about", stored.Description);
        Assert.False(await InDbAsync(db => db.AuditEntries.AnyAsync(e => e.RecordId == listing, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_a_listing_with_no_owner_When_a_member_saves_it_Then_it_is_refused_not_listing_owner()
    {
        await factory.ClearAsync();
        var (grace, _) = await EditOwnListingTests.MemberAsync(factory, "grace.staff-managed@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");

        var (status, body) = await SaveAsync(factory, listing, grace, Body());

        Assert.Equal(HttpStatusCode.Forbidden, status);
        Assert.Equal("not_listing_owner", body.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData(ListingStatus.Draft)]
    [InlineData(ListingStatus.Removed)]
    public async Task Given_a_listing_that_is_not_published_When_its_owner_saves_it_Then_it_is_refused_listing_not_found(ListingStatus status)
    {
        await factory.ClearAsync();
        var (cookie, owner) = await EditOwnListingTests.MemberAsync(factory, $"eastside.{status}@example.org".ToLowerInvariant());
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Eastside Ladies Who Lift", status: status);
        await factory.OwnAsync(listing, owner);

        var (code, body) = await SaveAsync(factory, listing, cookie, Body());

        Assert.Equal(HttpStatusCode.NotFound, code);
        Assert.Equal("listing_not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_visitor_When_they_save_a_listing_Then_they_must_sign_in()
    {
        await factory.ClearAsync();
        var (_, _, listing) = await OwnedAsync("eastside.visitor@example.org");

        var (status, _) = await SaveAsync(factory, listing, null, Body());

        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    private static readonly string[] TypedFocus = [" Strength ", "", "Women"];

    /// <summary><paramref name="count"/> focus tags of <paramref name="length"/> characters each.</summary>
    private static string[] Tags(int count, int length) => [.. Enumerable.Range(0, count).Select(i => new string((char)('a' + i), length))];

    public static TheoryData<string, object?, string?> Fields => new()
    {
        { "name", "", "name_required" },
        { "name", new string('n', 120), null },
        { "name", new string('n', 121), "name_too_long" },
        { "kind", "club", "kind_invalid" },
        { "about", new string('a', 1000), null },
        { "about", new string('a', 1001), "about_too_long" },
        { "website", "eastside ladies", "website_invalid" },
        { "website", "http://eastsideladies.ca", "website_invalid" },
        { "website", "", null },
        { "website", "https://e.ca/" + new string('w', 188), "website_too_long" },
        { "photoKey", "0123456789abcdef0123456789abcdef.png", "photo_invalid" },
        { "focus", Tags(6, 3), null },
        { "focus", Tags(7, 3), "focus_too_many" },
        { "focus", Tags(1, 40), null },
        { "focus", Tags(1, 41), "focus_too_long" },
        { "contactEmail", "", null },
        { "contactEmail", "not an email", "contact_invalid" },
        { "contactEmail", new string('c', 243) + "@example.org", "contact_too_long" },
    };

    [Theory]
    [MemberData(nameof(Fields))]
    public async Task Given_a_field_When_the_owner_saves_it_Then_only_a_field_that_breaks_its_rule_is_refused_with_its_code(string field, object? value, string? code)
    {
        await factory.ClearAsync();
        var (cookie, _, listing) = await OwnedAsync($"eastside.field.{Guid.NewGuid():N}@example.org");

        var (status, body) = await SaveAsync(factory, listing, cookie, Body((field, value)));

        if (code is null)
        {
            Assert.Equal(HttpStatusCode.OK, status);
            return;
        }

        Assert.Equal(HttpStatusCode.BadRequest, status);
        Assert.Equal("validation_failed", body.GetProperty("code").GetString());
        var codes = body.GetProperty("fieldCodes");
        Assert.Equal([field], codes.EnumerateObject().Select(p => p.Name));
        Assert.Equal(code, codes.GetProperty(field).GetString());
    }
}
