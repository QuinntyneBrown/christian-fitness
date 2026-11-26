using ChristianFitness.Application.News;

namespace ChristianFitness.Application.Tests.News;

/// <summary>
/// L2-060 AC2 (ADR 0108): whether a feed request's validators still match, one case per row. An
/// <c>If-None-Match</c> decides alone when sent (a listed tag, weak or strong, or <c>*</c>); otherwise an
/// <c>If-Modified-Since</c> at or after the feed's last change, to the second, matches.
/// </summary>
public sealed class FeedValidatorsTests
{
    private const string ETag = "\"abc123\"";
    private static readonly DateTimeOffset Changed = new(2026, 11, 26, 14, 30, 15, 400, TimeSpan.Zero);

    public static TheoryData<string, string[], DateTimeOffset?, DateTimeOffset?, bool> Cases() => new()
    {
        { "no validators", [], null, Changed, false },
        { "the same tag", [ETag], null, Changed, true },
        { "the same tag, weak", ["W/\"abc123\""], null, Changed, true },
        { "the same tag among others", ["\"old\"", ETag], null, Changed, true },
        { "any tag", ["*"], null, Changed, true },
        { "another tag", ["\"old\""], null, Changed, false },
        { "another tag beats a matching date", ["\"old\""], Changed.AddDays(1), Changed, false },
        { "the same second", [], new DateTimeOffset(2026, 11, 26, 14, 30, 15, TimeSpan.Zero), Changed, true },
        { "a later date", [], Changed.AddMinutes(5), Changed, true },
        { "an earlier second", [], new DateTimeOffset(2026, 11, 26, 14, 30, 14, TimeSpan.Zero), Changed, false },
        { "a date for a feed never changed", [], Changed, null, false },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void A_request_is_not_modified_only_while_its_validators_match(string why, string[] ifNoneMatch, DateTimeOffset? ifModifiedSince, DateTimeOffset? lastModified, bool notModified)
    {
        _ = why;

        Assert.Equal(notModified, FeedValidators.NotModified(ETag, lastModified, ifNoneMatch, ifModifiedSince));
    }
}
