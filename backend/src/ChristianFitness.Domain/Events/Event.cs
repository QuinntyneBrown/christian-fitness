using System.Diagnostics.CodeAnalysis;

namespace ChristianFitness.Domain.Events;

/// <summary>
/// A gathering members register for: a run, a workout, basketball, mobility, a workshop or a
/// retreat (L1-005, L1-010). Staff create it as a <see cref="EventStatus.Draft"/>, hidden from
/// members until it is published (L2-022 AC1; ADR 0015).
/// </summary>
[SuppressMessage("Naming", "CA1716:Identifiers should not match keywords", Justification = "The design and the product call it an event; no Visual Basic code consumes the domain.")]
public sealed class Event
{
    public const int TitleMaxLength = 120;
    public const int PlaceMaxLength = 200;
    public const int AreaMaxLength = 100;
    public const int SummaryMaxLength = 1000;
    public const int CapacityMin = 1;
    public const int CapacityMax = 10_000;

    /// <summary>The highest price, $10,000, in cents.</summary>
    public const int PriceCentsMax = 1_000_000;

    private Event()
    {
    }

    public Guid Id { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public EventCategory Category { get; private set; }

    /// <summary>When it starts, as an instant in UTC; staff give it as a Toronto date and time (<see cref="EventSchedule"/>).</summary>
    public DateTimeOffset StartsAt { get; private set; }

    /// <summary>Where it happens, such as "Martin Goodman Trail, Marilyn Bell Park".</summary>
    public string Place { get; private set; } = string.Empty;

    /// <summary>The neighbourhood and city under the place, such as "Waterfront, Toronto".</summary>
    public string Area { get; private set; } = string.Empty;

    /// <summary>The price in cents; 0 is free.</summary>
    public int PriceCents { get; private set; }

    public int Capacity { get; private set; }

    public string Summary { get; private set; } = string.Empty;

    public EventStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>A new draft with the given fields, trimmed; the validator has checked every limit.</summary>
    public static Event CreateDraft(
        string title,
        EventCategory category,
        DateTimeOffset startsAt,
        string place,
        string area,
        int priceCents,
        int capacity,
        string summary,
        DateTimeOffset createdAt)
    {
        ArgumentNullException.ThrowIfNull(title);
        ArgumentNullException.ThrowIfNull(place);
        ArgumentNullException.ThrowIfNull(area);
        ArgumentNullException.ThrowIfNull(summary);
        return new Event
        {
            Id = Guid.CreateVersion7(createdAt),
            Title = title.Trim(),
            Category = category,
            StartsAt = startsAt.ToUniversalTime(),
            Place = place.Trim(),
            Area = area.Trim(),
            PriceCents = priceCents,
            Capacity = capacity,
            Summary = summary.Trim(),
            Status = EventStatus.Draft,
            CreatedAt = createdAt,
        };
    }
}
