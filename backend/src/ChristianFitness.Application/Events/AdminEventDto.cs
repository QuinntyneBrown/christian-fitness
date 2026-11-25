using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// An event as the admin app shows it (ADR 0021): the start as an instant in UTC, which the app
/// shows in Toronto, the price in cents, and the category and status by their lower-case names.
/// A series' session names its series, which Events tags it with (L2-071 AC6; ADR 0091); any other
/// event names none. Numbers are fields, never words (AGENTS.md).
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
    string Status,
    AdminEventSeriesDto? Series)
{
    /// <summary>The event as staff see it, with its series from <paramref name="series"/> when it is a session.</summary>
    public static AdminEventDto Of(Event e, int going, IReadOnlyDictionary<Guid, AdminEventSeriesDto>? series = null)
    {
        ArgumentNullException.ThrowIfNull(e);
        var tag = e.SeriesId is { } id && series is not null ? series.GetValueOrDefault(id) : null;
        return new AdminEventDto(e.Id, e.Title, EventNames.Of(e.Category), e.StartsAt, e.Place, e.Area, e.PriceCents, e.Capacity, going, EventNames.Of(e.Status), tag);
    }
}

/// <summary>The series a session belongs to, as Events tags it (L2-071 AC6; ADR 0091).</summary>
public sealed record AdminEventSeriesDto(Guid Id, string Title)
{
    /// <summary>The series of each of <paramref name="events"/> that is a session, by id.</summary>
    public static async Task<IReadOnlyDictionary<Guid, AdminEventSeriesDto>> OfAsync(IAppDbContext db, IEnumerable<Event> events, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        List<Guid> ids = [.. events.Select(e => e.SeriesId).OfType<Guid>().Distinct()];
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, AdminEventSeriesDto>();
        }

        return await db.EventSeries.AsNoTracking()
            .Where(s => ids.Contains(s.Id))
            .Select(s => new AdminEventSeriesDto(s.Id, s.Title))
            .ToDictionaryAsync(s => s.Id, cancellationToken)
            .ConfigureAwait(false);
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
        EventStatus.Cancelled => "cancelled",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "An event status with no name."),
    };
}
