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

    /// <summary>
    /// The directory listing that hosts it (ADR 0067, ADR 0082): the Christian Fitness team listing
    /// until an Admin chooses another in the editor (journey 7).
    /// </summary>
    public Guid HostListingId { get; private set; } = Directory.DirectoryListing.TeamListingId;

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The series this event is a session of, or none for a standalone event (ADR 0080, ADR 0091).</summary>
    public Guid? SeriesId { get; private set; }

    /// <summary>What a session covers, such as "First 5-minute run"; none for a standalone event or a session without one.</summary>
    public string? Topic { get; private set; }

    /// <summary>When a session ends; none for a standalone event, which has only a start.</summary>
    public DateTimeOffset? EndsAt { get; private set; }

    /// <summary>The longest topic a session takes.</summary>
    public const int TopicMaxLength = 200;

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
    /// A dated session of <paramref name="series"/> (L2-071 AC14; ADR 0091): published at once, with
    /// the series' details (<see cref="FollowSeries"/>), and the given start, end and topic, trimmed
    /// (a blank topic is none). The handler has checked the start is after now and the end after it.
    /// </summary>
    public static Event CreateSession(EventSeries series, DateTimeOffset startsAt, DateTimeOffset endsAt, string? topic, DateTimeOffset createdAt)
    {
        ArgumentNullException.ThrowIfNull(series);
        var session = new Event
        {
            Id = Guid.CreateVersion7(createdAt),
            StartsAt = startsAt.ToUniversalTime(),
            EndsAt = endsAt.ToUniversalTime(),
            Topic = string.IsNullOrWhiteSpace(topic) ? null : topic.Trim(),
            SeriesId = series.Id,
            Status = EventStatus.Published,
            CreatedAt = createdAt,
        };
        session.FollowSeries(series);
        return session;
    }

    /// <summary>
    /// Takes the series' title, category, place, area, capacity, description, image, host and the
    /// price of one date (ADR 0091), so the event members see follows the series (L2-071 AC6, AC13).
    /// </summary>
    public void FollowSeries(EventSeries series)
    {
        ArgumentNullException.ThrowIfNull(series);
        if (SeriesId != series.Id)
        {
            throw new InvalidOperationException("Only a session of the series follows it.");
        }

        Title = series.Title;
        Category = series.Category;
        Place = series.Place;
        Area = series.Area;
        Capacity = series.Capacity;
        Summary = series.Summary;
        ImageKey = series.ImageKey;
        HostListingId = series.HostListingId;
        PriceCents = series.SessionPriceCents;
    }

    /// <summary>Makes <paramref name="listingId"/> its host (ADR 0067); the caller has checked it is a Listed directory listing.</summary>
    public void HostedBy(Guid listingId) => HostListingId = listingId;

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

    /// <summary>
    /// Makes a cancelled series date published again (L2-071 AC5; ADR 0103), only while its start
    /// is after <paramref name="now"/>; a standalone event's cancellation stays final (L2-023). The
    /// registrations were kept, so every place held is held again; it marks the registrations token.
    /// The handler refuses any other case before it asks.
    /// </summary>
    public void Restore(DateTimeOffset now)
    {
        if (SeriesId is null || Status != EventStatus.Cancelled || StartsAt <= now)
        {
            throw new InvalidOperationException("Only a cancelled series date that has not started can be restored.");
        }

        Status = EventStatus.Published;
        RegistrationVersion++;
    }
}
