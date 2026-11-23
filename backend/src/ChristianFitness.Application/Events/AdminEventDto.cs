using ChristianFitness.Domain.Events;

namespace ChristianFitness.Application.Events;

/// <summary>
/// An event as the admin app shows it (ADR 0021): the start as an instant in UTC, which the app
/// shows in Toronto, the price in cents, and the category and status by their lower-case names.
/// Numbers are fields, never words (AGENTS.md).
/// </summary>
public sealed record AdminEventDto(
    Guid Id,
    string Title,
    string Category,
    DateTimeOffset StartsAt,
    string Place,
    string Area,
    int PriceCents,
    int Capacity,
    int Going,
    string Status)
{
    /// <summary>The event as staff see it; nobody registers before slice 6.1, so going is 0 until then.</summary>
    public static AdminEventDto Of(Event e, int going)
    {
        ArgumentNullException.ThrowIfNull(e);
        return new AdminEventDto(e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area, e.PriceCents, e.Capacity, going, EventNames.Of(e.Status));
    }
}

/// <summary>How many events each tab of the staff list holds (L2-022 AC5).</summary>
public sealed record AdminEventCountsDto(int All, int Published, int Draft);

/// <summary>The staff list: every tab's count and the events of the tab asked for, soonest first.</summary>
public sealed record AdminEventListDto(AdminEventCountsDto Counts, IReadOnlyList<AdminEventDto> Events);

/// <summary>The names the API reads and writes for categories and statuses: lower case, as the apps send them.</summary>
public static class EventNames
{
    private static readonly Dictionary<string, EventCategory> Categories = new(StringComparer.Ordinal)
    {
        ["run"] = EventCategory.Run,
        ["workout"] = EventCategory.Workout,
        ["basketball"] = EventCategory.Basketball,
        ["mobility"] = EventCategory.Mobility,
        ["workshop"] = EventCategory.Workshop,
        ["retreat"] = EventCategory.Retreat,
    };

    /// <summary>The category named <paramref name="name"/>, or none for anything else.</summary>
    public static EventCategory? CategoryOf(string? name) =>
        name is not null && Categories.TryGetValue(name, out var category) ? category : null;

    public static string Of(EventCategory category) => Categories.Single(pair => pair.Value == category).Key;

    public static string Of(EventStatus status) => status switch
    {
        EventStatus.Draft => "draft",
        EventStatus.Published => "published",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "An event status with no name."),
    };
}
