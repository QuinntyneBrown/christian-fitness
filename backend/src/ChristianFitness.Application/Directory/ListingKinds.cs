using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Application.Directory;

/// <summary>
/// Each listing kind's address name (ADR 0071's slug of the singular name: <c>church-ministry</c>),
/// as the API's <c>kind</c> parameter and row field carry it (ADR 0082).
/// </summary>
public static class ListingKinds
{
    /// <summary>The kinds in the directory's order (L2-054 AC1).</summary>
    public static readonly IReadOnlyList<ListingKind> InOrder = Enum.GetValues<ListingKind>();

    private static readonly Dictionary<ListingKind, string> Slugs = new()
    {
        [ListingKind.Organization] = "organization",
        [ListingKind.Person] = "person",
        [ListingKind.Instructor] = "instructor",
        [ListingKind.Ambassador] = "ambassador",
        [ListingKind.Company] = "company",
        [ListingKind.ChurchMinistry] = "church-ministry",
    };

    public static string SlugOf(ListingKind kind) => Slugs[kind];

    /// <summary>The kind an exact slug names, or none: another case or a number is not one.</summary>
    public static ListingKind? KindOf(string? slug) =>
        slug is null ? null : Slugs.Where(pair => pair.Value == slug).Select(pair => (ListingKind?)pair.Key).FirstOrDefault();
}
