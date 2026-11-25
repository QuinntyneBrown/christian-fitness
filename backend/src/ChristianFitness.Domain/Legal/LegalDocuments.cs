namespace ChristianFitness.Domain.Legal;

/// <summary>Server-owned, immutable effective dates. Each document can change independently.</summary>
public sealed class LegalDocuments(IReadOnlyList<DateOnly> privacy, IReadOnlyList<DateOnly> terms)
{
    public static LegalDocuments Published { get; } = new([new(2026, 4, 1)], [new(2026, 4, 1)]);

    public IReadOnlyList<DateOnly> Versions(string document) => document switch
    {
        "privacy" => privacy,
        "terms" => terms,
        _ => throw new ArgumentOutOfRangeException(nameof(document)),
    };

    public DateOnly? InForce(string document, DateOnly today) =>
        Versions(document).Where(day => day <= today).Select(day => (DateOnly?)day).Max();

    public DateOnly? Upcoming(string document, DateOnly today) =>
        Versions(document).Where(day => day > today && day.DayNumber - today.DayNumber <= 30).Select(day => (DateOnly?)day).Min();
}
