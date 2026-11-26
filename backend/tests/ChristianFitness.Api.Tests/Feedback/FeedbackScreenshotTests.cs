using System.Net;
using ChristianFitness.Api.Tests.DirectoryListings;
using ChristianFitness.Application.Events;
using static ChristianFitness.Api.Tests.Feedback.SendFeedbackTests;

namespace ChristianFitness.Api.Tests.Feedback;

/// <summary>
/// L2-063 AC4 (ADR 0109): a note about something that is off may carry one screenshot, kept by its
/// content's signature under a new key in the private screenshot store, never under the name or the
/// type the browser gave. One that is not JPEG, PNG or WebP by its first bytes is refused
/// <c>image_type_not_allowed</c>, one over 5 MB <c>image_too_large</c>, and one on another kind
/// <c>screenshot_not_allowed</c>; each is 400 <c>validation_failed</c> and stores nothing.
/// </summary>
public sealed class FeedbackScreenshotTests(FeedbackFactory factory) : IClassFixture<FeedbackFactory>
{
    private const int FiveMb = ImageKeys.MaxBytes;

    /// <summary>
    /// A file of <paramref name="size"/> bytes that begins as <paramref name="format"/> says. Built in
    /// the test, so no theory row carries megabytes.
    /// </summary>
    private static byte[] FileOf(string format, int size)
    {
        byte[] head = format switch
        {
            "png" => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
            "jpeg" => [0xFF, 0xD8, 0xFF, 0xE0],
            "webp" => [.. "RIFF"u8, 0, 0, 0, 0, .. "WEBP"u8],
            "pdf" => [.. "%PDF-1.7"u8],
            "gif" => [.. "GIF89a"u8],
            _ => [],
        };
        var bytes = new byte[size];
        head.AsSpan(0, Math.Min(head.Length, size)).CopyTo(bytes);
        return bytes;
    }

    [Theory]
    [InlineData("a PNG", "png", 2048, "calendar-bug.png", "png")]
    [InlineData("a JPEG named as a PNG", "jpeg", 2048, "screen.png", "jpg")]
    [InlineData("a WebP of exactly 5 MB", "webp", FiveMb, "screen.webp", "webp")]
    public async Task Given_a_problem_with_a_screenshot_When_sent_Then_it_is_kept_under_a_new_key_by_its_signature(
        string why, string format, int size, string name, string extension)
    {
        var bytes = FileOf(format, size);
        var email = $"grace.shot.{extension}@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, Note(kind: "problem"), (bytes, name, "image/png"));

        Assert.True(response.StatusCode == HttpStatusCode.NoContent, why);
        var key = Assert.Single(await factory.NotesOfAsync(email)).ScreenshotKey;
        Assert.True(ImageKeys.IsKey(key), why);
        Assert.EndsWith($".{extension}", key, StringComparison.Ordinal);
        Assert.Equal(bytes, factory.Screenshots.Of(key!));
        Assert.Null(factory.Images.Of(key!));
    }

    /// <summary>ADR 0109's screenshot rows, one case per row: what is sent and its code.</summary>
    [Theory]
    [InlineData("5 MB and one byte", "problem", "png", FiveMb + 1, "image/png", "image_too_large")]
    [InlineData("a PDF named as a PNG", "problem", "pdf", 2048, "image/png", "image_type_not_allowed")]
    [InlineData("a GIF", "problem", "gif", 2048, "image/gif", "image_type_not_allowed")]
    [InlineData("an empty file", "problem", "none", 0, "image/png", "image_type_not_allowed")]
    [InlineData("on an idea", "idea", "png", 2048, "image/png", "screenshot_not_allowed")]
    [InlineData("on thanks", "thanks", "png", 2048, "image/png", "screenshot_not_allowed")]
    public async Task Given_a_screenshot_the_rules_refuse_When_sent_Then_it_is_refused_with_its_code_and_nothing_is_kept(
        string why, string kind, string format, int size, string type, string code)
    {
        var bytes = FileOf(format, size);
        var email = $"grace.shot.refused.{Math.Abs(why.GetHashCode(StringComparison.Ordinal))}@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;
        var kept = factory.Screenshots.Count;

        using var response = await PostAsync(client, cookie, Note(kind: kind), (bytes, "screen.png", type));

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, why);
        var problem = await BodyAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        var codes = problem.GetProperty("fieldCodes").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString(), StringComparer.Ordinal);
        Assert.Equal(new Dictionary<string, string?>(StringComparer.Ordinal) { ["screenshot"] = code }, codes);
        Assert.Empty(await factory.NotesOfAsync(email));
        Assert.Equal(kept, factory.Screenshots.Count);
    }
}
