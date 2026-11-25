using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-079 AC1 (journey 20; ADR 0094): <c>POST /api/directory/photos</c> stores a photo for a member
/// who owns a published listing, judged by its first bytes, and audits it
/// <c>listing_photo.uploaded</c>; the owner's save then shows it. Anyone else is refused
/// <c>not_listing_owner</c>.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class OwnListingPhotoTests(DirectoryFactory factory)
{
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00];
    private static readonly byte[] NotAnImage = [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37];

    private const string Path = "/api/directory/photos";

    private static async Task<(HttpStatusCode Status, JsonElement Body)> UploadAsync(DirectoryFactory factory, string? cookie, byte[] bytes)
    {
        using var client = Browser.CreateClient(factory);
        using var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        using var form = new MultipartFormDataContent { { file, "file", "team.png" } };
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(Path, UriKind.Relative)) { Content = form };
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

    [Fact]
    public async Task Given_the_owner_of_a_published_listing_When_they_upload_a_photo_and_save_it_Then_the_listing_shows_it_and_the_upload_is_audited()
    {
        await factory.ClearAsync();
        var (cookie, owner) = await EditOwnListingTests.MemberAsync(factory, "eastside.photo@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Eastside Ladies Who Lift");
        await factory.OwnAsync(listing, owner);

        var (status, body) = await UploadAsync(factory, cookie, Png);

        Assert.Equal(HttpStatusCode.Created, status);
        Assert.Equal(["photoKey"], body.EnumerateObject().Select(p => p.Name));
        var key = body.GetProperty("photoKey").GetString()!;
        Assert.EndsWith(".png", key, StringComparison.Ordinal);
        var recordId = Guid.ParseExact(key[..32], "N");
        Assert.True(await InDbAsync(db => db.AuditEntries.AnyAsync(
            e => e.RecordId == recordId && e.Action == "listing_photo.uploaded" && e.ActorMemberId == owner, TestContext.Current.CancellationToken)));

        var (saved, answer) = await SaveOwnListingTests.SaveAsync(factory, listing, cookie, SaveOwnListingTests.Body(("photoKey", key)));

        Assert.Equal(HttpStatusCode.OK, saved);
        Assert.Equal(key, answer.GetProperty("listing").GetProperty("photoKey").GetString());
        using var visitor = Browser.CreateClient(factory);
        using var served = await visitor.GetAsync(new Uri($"{Path}/{key}", UriKind.Relative), TestContext.Current.CancellationToken);
        Assert.Equal(Png, await served.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(ListingStatus.Draft)]
    [InlineData(ListingStatus.Removed)]
    public async Task Given_a_member_who_owns_no_published_listing_When_they_upload_a_photo_Then_it_is_refused_not_listing_owner(ListingStatus? owned)
    {
        await factory.ClearAsync();
        var (cookie, member) = await EditOwnListingTests.MemberAsync(factory, $"no.listing.{owned}@example.org".ToLowerInvariant());
        if (owned is { } status)
        {
            await factory.OwnAsync(await factory.AddListingAsync(ListingKind.Organization, "Eastside Ladies Who Lift", status: status), member);
        }

        await factory.AddListingAsync(ListingKind.Organization, "Someone Else's Club");

        var (code, body) = await UploadAsync(factory, cookie, Png);

        Assert.Equal(HttpStatusCode.Forbidden, code);
        Assert.Equal("not_listing_owner", body.GetProperty("code").GetString());
        Assert.False(await InDbAsync(db => db.AuditEntries.AnyAsync(e => e.Action == "listing_photo.uploaded" && e.ActorMemberId == member, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_the_owner_When_they_upload_a_file_that_is_not_an_image_Then_it_is_refused_photo_invalid()
    {
        await factory.ClearAsync();
        var (cookie, owner) = await EditOwnListingTests.MemberAsync(factory, "eastside.pdf@example.org");
        await factory.OwnAsync(await factory.AddListingAsync(ListingKind.Organization, "Eastside Ladies Who Lift"), owner);

        var (code, body) = await UploadAsync(factory, cookie, NotAnImage);

        Assert.Equal(HttpStatusCode.BadRequest, code);
        Assert.Equal("photo_invalid", body.GetProperty("fieldCodes").GetProperty("photo").GetString());
    }

    [Fact]
    public async Task Given_a_visitor_When_they_upload_a_photo_Then_they_must_sign_in()
    {
        await factory.ClearAsync();

        var (code, _) = await UploadAsync(factory, cookie: null, Png);

        Assert.Equal(HttpStatusCode.Unauthorized, code);
    }
}
