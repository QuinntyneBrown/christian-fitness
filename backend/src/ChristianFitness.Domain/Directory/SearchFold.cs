using System.Globalization;
using System.Text;

namespace ChristianFitness.Domain.Directory;

/// <summary>
/// Folds text for the directory's search and name order (L2-054 AC4; ADR 0082): decomposed, its
/// combining marks dropped and lower-cased invariantly, so "Café" and "CAFE" both read "cafe". A
/// listing's stored keys and a member's search are folded by this one helper, so InMemory and
/// PostgreSQL agree.
/// </summary>
public static class SearchFold
{
    public static string Of(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(c);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }
}
