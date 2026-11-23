using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC4, AC9 and AC10 (ADR 0025): a JPEG, PNG or WebP of up to 5 MB is kept and named by a
/// key, judged by its first bytes and never by the name or type the client claims; anything else is
/// refused with <c>image_invalid</c> and nothing is kept; an event keeps its image by key and anyone
/// can read it.
/// </summary>
public sealed class EventImageTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00];
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00];
    private static readonly byte[] Webp = [.. "RIFF"u8, 0x24, 0x00, 0x00, 0x00, .. "WEBPVP8 "u8];

    public static TheoryData<string, byte[], string, string> Accepted => new()
    {
        { "a JPEG", Jpeg, "park.jpg", ".jpg" },
        { "a PNG", Png, "park.png", ".png" },
        { "a WebP", Webp, "park.webp", ".webp" },
        { "a JPEG named as a text file", Jpeg, "park.txt", ".jpg" },
    };

    [Theory]
    [MemberData(nameof(Accepted))]
    public async Task Given_staff_When_they_upload_an_image_by_its_bytes_Then_it_is_kept_under_a_key_that_names_its_type(string why, byte[] bytes, string name, string extension)
    {
        Assert.NotNull(why);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, $"dana.image.{why.Replace(' ', '.')}@example.org");

        using var response = await UploadAsync(client, cookie, bytes, name, "application/octet-stream");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var key = (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("imageKey").GetString()!;
        Assert.Matches("^[0-9a-f]{32}\\" + extension + "$", key);
        Assert.True(await factory.Images.ExistsAsync(key, TestContext.Current.CancellationToken));
    }

    public static TheoryData<string, byte[]> Refused => new()
    {
        { "a text file", "not an image"u8.ToArray() },
        { "an empty file", [] },
        { "a GIF", [.. "GIF89a"u8, 0x01, 0x00] },
        { "a RIFF file that is not WebP", [.. "RIFF"u8, 0x24, 0x00, 0x00, 0x00, .. "WAVEfmt "u8] },
        { "an image over 5 MB", [0xFF, 0xD8, 0xFF, .. new byte[(5 * 1024 * 1024) - 2]] },
    };

    [Theory]
    [MemberData(nameof(Refused))]
    public async Task Given_staff_When_they_upload_something_that_is_not_an_allowed_image_Then_it_is_refused_with_image_invalid_and_nothing_is_kept(string why, byte[] bytes)
    {
        Assert.NotNull(why);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, $"dana.image.refused.{why.Replace(' ', '.')}@example.org");
        var before = factory.Images.Count;

        using var response = await UploadAsync(client, cookie, bytes, "image.jpg", "image/jpeg");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("image_invalid", problem.GetProperty("fieldCodes").GetProperty("image").GetString());
        Assert.Equal(before, factory.Images.Count);
    }

    [Fact]
    public async Task Given_an_uploaded_image_When_staff_save_it_on_an_event_Then_the_event_keeps_it_and_an_unknown_key_is_refused()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.image.event@example.org");
        using var uploaded = await UploadAsync(client, cookie, Png, "park.png", "image/png");
        var key = (await uploaded.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("imageKey").GetString()!;
        var withImage = AdminEvents.Retreat();
        withImage["imageKey"] = key;
        var unknown = AdminEvents.Retreat();
        unknown["imageKey"] = "fedcba9876543210fedcba9876543210.png";

        var id = await AdminEvents.CreatedIdAsync(client, cookie, withImage);
        using var refused = await AdminEvents.CreateAsync(client, cookie, unknown);
        using var detail = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/{id}", cookie);

        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        Assert.Equal("image_invalid", (await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("fieldCodes").GetProperty("imageKey").GetString());
        Assert.Equal(key, (await detail.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("imageKey").GetString());
    }

    [Fact]
    public async Task Given_an_event_with_an_image_When_anyone_opens_its_address_Then_it_is_served_with_its_type_and_a_long_cache_and_an_unknown_key_is_404()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.image.serve@example.org");
        using var uploaded = await UploadAsync(client, cookie, Webp, "park.webp", "image/webp");
        var key = (await uploaded.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("imageKey").GetString()!;
        using var visitor = Browser.CreateClient(factory);

        using var served = await visitor.GetAsync(new Uri($"/api/events/images/{key}", UriKind.Relative), TestContext.Current.CancellationToken);
        using var unknown = await visitor.GetAsync(new Uri("/api/events/images/fedcba9876543210fedcba9876543210.png", UriKind.Relative), TestContext.Current.CancellationToken);
        using var path = await visitor.GetAsync(new Uri("/api/events/images/..%2F..%2Fappsettings.json", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, served.StatusCode);
        Assert.Equal("image/webp", served.Content.Headers.ContentType?.MediaType);
        Assert.Equal("public, max-age=31536000, immutable", served.Headers.CacheControl?.ToString());
        Assert.Equal("nosniff", served.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal(Webp, await served.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, path.StatusCode);
    }

    [Fact]
    public async Task Given_an_upload_When_it_is_kept_Then_one_audit_entry_records_who_uploaded_it()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.image.audit@example.org");

        using var response = await UploadAsync(client, cookie, Jpeg, "park.jpg", "image/jpeg");

        var key = (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("imageKey").GetString()!;
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.image.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var recordId = Guid.ParseExact(key[..32], "N");
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == recordId).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "event_image.uploaded", "EventImage"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    private static async Task<HttpResponseMessage> UploadAsync(HttpClient client, string cookie, byte[] bytes, string fileName, string contentType)
    {
        using var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        using var form = new MultipartFormDataContent { { file, "file", fileName } };
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/admin/events/images", UriKind.Relative)) { Content = form };
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }
}
