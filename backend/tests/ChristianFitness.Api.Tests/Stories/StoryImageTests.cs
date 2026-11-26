using System.Buffers.Binary;
using System.Net;
using System.Net.Http.Headers;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-069 AC9, AC14 (ADR 0097): a lead image is a JPEG, PNG or WebP at least 1,600 px wide and at
/// most 5 MB, told by its bytes; the upload answers 201 with its key and size and is audited as
/// <c>story_image.uploaded</c>; anything else is refused with <c>fieldCodes.image</c> =
/// <c>image_invalid</c> and nothing is kept. Anyone may read a stored image by its key.
/// </summary>
public sealed class StoryImageTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    /// <summary>A PNG's signature and header naming <paramref name="width"/> by <paramref name="height"/>.</summary>
    internal static byte[] Png(int width, int height)
    {
        byte[] head = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 0, 0, 0, 0, 0, 8, 6, 0, 0, 0];
        BinaryPrimitives.WriteInt32BigEndian(head.AsSpan(16), width);
        BinaryPrimitives.WriteInt32BigEndian(head.AsSpan(20), height);
        return head;
    }

    internal static async Task<HttpResponseMessage> UploadAsync(HttpClient client, string cookie, byte[] content, string type = "image/png")
    {
        using var file = new ByteArrayContent(content);
        file.Headers.ContentType = new MediaTypeHeaderValue(type);
        using var form = new MultipartFormDataContent { { file, "file", "lead.png" } };
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"{AdminStories.Path}/images", UriKind.Relative)) { Content = form };
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    [Fact]
    public async Task Given_a_PNG_1600_px_wide_When_an_Admin_uploads_it_Then_it_is_kept_with_its_size_audited_and_readable_by_anyone()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.image@example.org");
        var staff = await factory.MemberIdAsync("dana.stories.image@example.org");
        var content = Png(1600, 900);

        using var response = await UploadAsync(client, cookie, content);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var answer = await AdminStories.JsonAsync(response);
        Assert.Equal(["imageKey", "width", "height"], AdminStories.Keys(answer));
        var key = answer.GetProperty("imageKey").GetString()!;
        Assert.Matches("^[0-9a-f]{32}\\.png$", key);
        Assert.Equal((1600, 900), (answer.GetProperty("width").GetInt32(), answer.GetProperty("height").GetInt32()));
        Assert.Equal([(staff, "story_image.uploaded", "StoryImage")], await factory.AuditOfAsync(Guid.ParseExact(key[..32], "N")));

        using var anyone = Browser.CreateClient(factory);
        using var image = await anyone.GetAsync(new Uri($"/api/stories/images/{key}", UriKind.Relative), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/png", image.Content.Headers.ContentType?.MediaType);
        Assert.Equal(content, await image.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
    }

    public static TheoryData<string, byte[]> Refused() => new()
    {
        { "1599 px wide", Png(1599, 2000) },
        { "not an image", "GIF89a, or so it says"u8.ToArray() },
        { "a size that cannot be read", [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00] },
        { "over 5 MB", [.. Png(4000, 2250), .. new byte[(5 * 1024 * 1024) - 28]] },
    };

    [Theory]
    [MemberData(nameof(Refused))]
    public async Task Given_an_image_the_rules_refuse_When_it_is_uploaded_Then_it_is_refused_with_image_invalid(string why, byte[] content)
    {
        using var client = Browser.CreateClient(factory);
        var email = $"dana.stories.image.{why.Replace(' ', '.')}@example.org";
        var cookie = await AdminStories.SignInAsync(factory, client, email);

        using var response = await UploadAsync(client, cookie, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminStories.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("image_invalid", problem.GetProperty("fieldCodes").GetProperty("image").GetString());
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_upload_a_lead_image_Then_it_is_refused_with_forbidden_role()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "joel.stories.image@example.org", StaffRoleName.Moderator);

        using var response = await UploadAsync(client, cookie, Png(1600, 900));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("forbidden_role", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_key_that_names_nothing_When_anyone_reads_it_Then_it_is_404()
    {
        using var anyone = Browser.CreateClient(factory);

        using var image = await anyone.GetAsync(new Uri("/api/stories/images/0123456789abcdef0123456789abcdef.png", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, image.StatusCode);
    }
}
