using System.Globalization;
using System.Text;

namespace ChristianFitness.Domain.News;

/// <summary>
/// A story's link under <c>/stories/</c> (L2-069 AC8; ADR 0071, ADR 0097): only lowercase letters,
/// digits and single hyphens between them, at most <see cref="Story.SlugMaxLength"/> characters.
/// </summary>
public static class StorySlug
{
    /// <summary>What a headline with no letter or digit becomes.</summary>
    public const string Fallback = "story";

    /// <summary>Whether <paramref name="slug"/> is a link a story may hold.</summary>
    public static bool IsValid(string? slug)
    {
        if (string.IsNullOrEmpty(slug) || slug.Length > Story.SlugMaxLength || slug[0] == '-' || slug[^1] == '-' || slug.Contains("--", StringComparison.Ordinal))
        {
            return false;
        }

        return slug.All(c => c is (>= 'a' and <= 'z') or (>= '0' and <= '9') or '-');
    }

    /// <summary>
    /// The link made from <paramref name="headline"/>: accents dropped, lower-cased, every run of
    /// other characters one hyphen, cut at a word to fit; a headline with no letter or digit gives
    /// <see cref="Fallback"/>.
    /// </summary>
    public static string From(string headline)
    {
        ArgumentNullException.ThrowIfNull(headline);
        var builder = new StringBuilder();
        var hyphen = false;
        foreach (var c in headline.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark || c is '\'' or '’')
            {
                continue;
            }

            var lower = char.ToLowerInvariant(c);
            if (lower is (>= 'a' and <= 'z') or (>= '0' and <= '9'))
            {
                if (hyphen && builder.Length > 0)
                {
                    builder.Append('-');
                }

                builder.Append(lower);
                hyphen = false;
            }
            else
            {
                hyphen = true;
            }
        }

        var slug = builder.ToString();
        if (slug.Length > Story.SlugMaxLength)
        {
            slug = slug[..Story.SlugMaxLength];
            var cut = slug.LastIndexOf('-');
            slug = cut > 0 ? slug[..cut] : slug;
        }

        return slug.Length == 0 ? Fallback : slug;
    }

    /// <summary><paramref name="slug"/> with the <paramref name="n"/>th number added, kept within the limit (<c>fasting-2</c>).</summary>
    public static string Numbered(string slug, int n)
    {
        ArgumentNullException.ThrowIfNull(slug);
        var suffix = string.Create(CultureInfo.InvariantCulture, $"-{n}");
        var room = Story.SlugMaxLength - suffix.Length;
        return (slug.Length > room ? slug[..room].TrimEnd('-') : slug) + suffix;
    }
}
