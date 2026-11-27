using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>
/// L2-066 AC2 and L2-031 AC3 (journey 35; ADR 0117): the link of a built archive works only for the
/// signed-in member it was made for, for 7 days. The download page reads when it stops working, and
/// the archive is served as a private attachment. Any other id, another member's, one not yet built
/// or one past its 7 days is the same 404 <c>not_found</c>; no session is 401.
/// </summary>
public sealed class DataExportDownloadTests(DataExportFactory factory) : IClassFixture<DataExportFactory>
{
    private readonly DataExportBuildTests builds = new(factory);

    [Fact]
    public async Task Given_a_built_archive_When_its_member_follows_the_link_Then_the_page_reads_its_expiry_and_the_archive_downloads()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.export.link@example.org");
        using var asked = await Exports.RequestAsync(client, cookie);
        await builds.TickAsync();
        var request = await builds.RequestOfAsync(grace);

        using var link = await Browser.SendAsync(client, HttpMethod.Get, $"{Exports.Path}/{request.Id}", cookie);

        Assert.Equal(HttpStatusCode.OK, link.StatusCode);
        var body = await link.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["expiresAt"], body.EnumerateObject().Select(p => p.Name));
        Assert.Equal(request.ExpiresAt, body.GetProperty("expiresAt").GetDateTimeOffset());

        using var archive = await Browser.SendAsync(client, HttpMethod.Get, $"{Exports.Path}/{request.Id}/archive", cookie);

        Assert.Equal(HttpStatusCode.OK, archive.StatusCode);
        Assert.Equal("application/zip", archive.Content.Headers.ContentType?.MediaType);
        Assert.Equal(("attachment", "christian-fitness-data.zip"), (archive.Content.Headers.ContentDisposition?.DispositionType, archive.Content.Headers.ContentDisposition?.FileName));
        Assert.True(archive.Headers.CacheControl?.NoStore);
        Assert.Equal(factory.Archives.Of(request.ArchiveKey!), await archive.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_built_archive_When_anyone_else_follows_its_link_Then_it_is_not_found_like_any_other_id()
    {
        using var client = Browser.CreateClient(factory);
        var (graceCookie, grace) = await Prefs.JoinAsync(factory, client, "grace.export.others@example.org");
        using var asked = await Exports.RequestAsync(client, graceCookie);
        await builds.TickAsync();
        var id = (await builds.RequestOfAsync(grace)).Id;
        var (tylerCookie, _) = await Prefs.JoinAsync(factory, client, "tyler.export.others@example.org");

        foreach (var path in new[] { $"{Exports.Path}/{id}", $"{Exports.Path}/{id}/archive", $"{Exports.Path}/{Guid.NewGuid()}", $"{Exports.Path}/{Guid.NewGuid()}/archive" })
        {
            await AssertNotFoundAsync(client, path, tylerCookie);
            using var anonymous = await Browser.SendAsync(client, HttpMethod.Get, path, cookie: null);
            Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        }
    }

    [Fact]
    public async Task Given_a_request_When_it_is_not_built_yet_or_its_7_days_are_over_Then_its_link_is_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.export.window@example.org");
        using var asked = await Exports.RequestAsync(client, cookie);
        var id = (await builds.RequestOfAsync(grace)).Id;
        await AssertNotFoundAsync(client, $"{Exports.Path}/{id}", cookie);
        await AssertNotFoundAsync(client, $"{Exports.Path}/{id}/archive", cookie);
        await builds.TickAsync();

        factory.Time.Advance(TimeSpan.FromDays(7) - TimeSpan.FromSeconds(1));
        cookie = await SignInAsync(client, "grace.export.window@example.org");
        using var lastSecond = await Browser.SendAsync(client, HttpMethod.Get, $"{Exports.Path}/{id}/archive", cookie);
        Assert.Equal(HttpStatusCode.OK, lastSecond.StatusCode);

        // Over at 7 days, before any tick removes the archive.
        factory.Time.Advance(TimeSpan.FromSeconds(1));
        await AssertNotFoundAsync(client, $"{Exports.Path}/{id}", cookie);
        await AssertNotFoundAsync(client, $"{Exports.Path}/{id}/archive", cookie);
    }

    private static async Task<string> SignInAsync(HttpClient client, string email)
    {
        using var response = await Browser.SignInAsync(client, email, "abundantlife");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return Browser.SessionCookie(response);
    }

    private static async Task AssertNotFoundAsync(HttpClient client, string path, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, path, cookie);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
    }
}
