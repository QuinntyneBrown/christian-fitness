using System.Diagnostics.CodeAnalysis;

namespace ChristianFitness.Domain.Events;

/// <summary>
/// A gathering members register for: a run, a workout, basketball, mobility, a workshop or a
/// retreat (L1-005, L1-010). Staff create it as a <see cref="EventStatus.Draft"/>, hidden from
/// members until it is published (L2-022 AC1; ADR 0021).
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

    public const int ImageKeyMaxLength = 64;

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

    /// <summary>The stored image's key, or none (L2-022 AC4; ADR 0025).</summary>
    public string? ImageKey { get; private set; }

    public EventStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>
    /// Counts the places taken; the store refuses a save whose count is no longer the one read, so
    /// two registrations for the last place cannot both commit (L2-011 AC3; ADR 0033).
    /// </summary>
    public int RegistrationVersion { get; private set; }

    /// <summary>Marks that a place is being taken, so a racing save is refused.</summary>
    public void TakePlace() => RegistrationVersion++;

    /// <summary>Marks that a place is being given up, so a racing save is refused (ADR 0034).</summary>
    public void ReleasePlace() => RegistrationVersion++;

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
        DateTimeOffset createdAt,
        string? imageKey = null)
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
            ImageKey = imageKey,
            Status = EventStatus.Draft,
            CreatedAt = createdAt,
        };
    }

    /// <summary>
    /// Replaces what staff edit (L2-022 AC7; ADR 0025). The status, the creation time and the id never
    /// change here; each text is trimmed.
    /// </summary>
    public void Edit(
        string title,
        EventCategory category,
        DateTimeOffset startsAt,
        string place,
        string area,
        int priceCents,
        int capacity,
        string summary,
        string? imageKey)
    {
        ArgumentNullException.ThrowIfNull(title);
        ArgumentNullException.ThrowIfNull(place);
        ArgumentNullException.ThrowIfNull(area);
        ArgumentNullException.ThrowIfNull(summary);
        Title = title.Trim();
        Category = category;
        StartsAt = startsAt.ToUniversalTime();
        Place = place.Trim();
        Area = area.Trim();
        PriceCents = priceCents;
        Capacity = capacity;
        Summary = summary.Trim();
        ImageKey = imageKey;
    }

    /// <summary>
    /// Makes a draft visible to members (L2-023 AC3; ADR 0026). Only a draft can be published; the
    /// handler refuses any other status before it asks.
    /// </summary>
    public void Publish()
    {
        if (Status != EventStatus.Draft)
        {
            throw new InvalidOperationException("Only a draft event can be published.");
        }

        Status = EventStatus.Published;
    }

    /// <summary>
    /// Withdraws a published event (L2-023 AC2; ADR 0035). Only a published event can be cancelled; the
    /// handler refuses any other status before it asks. It marks the registrations token, so a
    /// registration racing the cancel cannot commit (ADR 0033).
    /// </summary>
    public void Cancel()
    {
        if (Status != EventStatus.Published)
        {
            throw new InvalidOperationException("Only a published event can be cancelled.");
        }

        Status = EventStatus.Cancelled;
        RegistrationVersion++;
    }
}
