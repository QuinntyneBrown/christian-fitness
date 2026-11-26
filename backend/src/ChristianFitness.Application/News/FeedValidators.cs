using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace ChristianFitness.Application.News;

/// <summary>
/// A feed's validators (L2-060 AC2; ADR 0108): a strong <c>ETag</c> over what its items show, and
/// whether a request's <c>If-None-Match</c> or <c>If-Modified-Since</c> still matches them.
/// </summary>
public static class FeedValidators
{
    /// <summary>
    /// A strong tag over each item's id, last edit, publication and author, in order: a new story, an
    /// edit, an unpublished story or a renamed byline changes it.
    /// </summary>
    public static string ETagOf(IEnumerable<(Guid Id, DateTimeOffset EditedAt, DateTimeOffset PublishedAt, string? Author)> items)
    {
        ArgumentNullException.ThrowIfNull(items);
        var text = new StringBuilder();
        foreach (var (id, editedAt, publishedAt, author) in items)
        {
            text.Append(CultureInfo.InvariantCulture, $"{id:N}|{editedAt.UtcTicks}|{publishedAt.UtcTicks}|{author}\n");
        }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(text.ToString()));
        return $"\"{Convert.ToHexStringLower(hash.AsSpan(0, 16))}\"";
    }

    /// <summary>
    /// Whether the request may be answered 304: an <c>If-None-Match</c>, when sent, decides alone (any
    /// listed tag equal to <paramref name="etag"/> by weak comparison, or <c>*</c>); otherwise an
    /// <c>If-Modified-Since</c> at or after <paramref name="lastModified"/>, which HTTP dates to the second.
    /// </summary>
    public static bool NotModified(string etag, DateTimeOffset? lastModified, IReadOnlyCollection<string> ifNoneMatch, DateTimeOffset? ifModifiedSince)
    {
        ArgumentNullException.ThrowIfNull(ifNoneMatch);
        if (ifNoneMatch.Count > 0)
        {
            var opaque = Opaque(etag);
            return ifNoneMatch.Any(tag => tag == "*" || Opaque(tag) == opaque);
        }

        if (ifModifiedSince is not { } since || lastModified is not { } changed)
        {
            return false;
        }

        var toTheSecond = changed.AddTicks(-(changed.UtcTicks % TimeSpan.TicksPerSecond));
        return toTheSecond <= since;
    }

    private static string Opaque(string tag) => tag.StartsWith("W/", StringComparison.Ordinal) ? tag[2..] : tag;
}
