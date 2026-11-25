namespace ChristianFitness.Domain.Events;

/// <summary>
/// A program of dated sessions with one host, one place, one capacity and one price, such as eight
/// Tuesdays of Couch to 5K (L1-010, L2-071; ADR 0080, ADR 0091). Each session is an
/// <see cref="Event"/> carrying the series' id; staff create the series first, with no dates, and
/// add the dates one by one.
/// </summary>
public sealed class EventSeries
{
    private EventSeries()
    {
    }

    public Guid Id { get; private set; }

    public string Title { get; private set; } = string.Empty;

    /// <summary>The category its sessions file under in Events (ADR 0091).</summary>
    public EventCategory Category { get; private set; }

    /// <summary>What the series is, shown to members (the editor's Description).</summary>
    public string Summary { get; private set; } = string.Empty;

    /// <summary>The stored image's key, or none (ADR 0025).</summary>
    public string? ImageKey { get; private set; }

    /// <summary>The Listed directory listing that hosts it (ADR 0067); its sessions share it.</summary>
    public Guid HostListingId { get; private set; }

    /// <summary>The price of the whole series in cents; 0 is free.</summary>
    public int PriceCents { get; private set; }

    /// <summary>The price of one date in cents, or none when members cannot drop in.</summary>
    public int? DropInPriceCents { get; private set; }

    /// <summary>How many members may join; each session holds as many.</summary>
    public int Capacity { get; private set; }

    /// <summary>Where it meets, such as "Humber Bay Park East".</summary>
    public string Place { get; private set; } = string.Empty;

    /// <summary>The neighbourhood and city where members are told about it, such as "Etobicoke, Toronto".</summary>
    public string Area { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>
    /// A concurrency token that every join and leave moves (ADR 0099), so two changes to the
    /// series' enrolments read at the same moment cannot both commit.
    /// </summary>
    public int EnrolmentVersion { get; private set; }

    /// <summary>Marks a member joining (L2-052 AC2, AC6; ADR 0099).</summary>
    public void Enrol() => EnrolmentVersion++;

    /// <summary>Marks a member leaving (L2-052 AC9; ADR 0099).</summary>
    public void Withdraw() => EnrolmentVersion++;

    /// <summary>
    /// What a session costs one member who drops in (ADR 0091): the drop-in price, or the series
    /// price when there is no drop-in.
    /// </summary>
    public int SessionPriceCents => DropInPriceCents ?? PriceCents;

    /// <summary>A new series with no dates; each text is trimmed, and the validator has checked every limit.</summary>
    public static EventSeries Create(
        string title,
        EventCategory category,
        string summary,
        string? imageKey,
        Guid hostListingId,
        int priceCents,
        int? dropInPriceCents,
        int capacity,
        string place,
        string area,
        DateTimeOffset createdAt)
    {
        var series = new EventSeries { Id = Guid.CreateVersion7(createdAt), CreatedAt = createdAt };
        series.Edit(title, category, summary, imageKey, hostListingId, priceCents, dropInPriceCents, capacity, place, area);
        return series;
    }

    /// <summary>Replaces what staff edit (L2-071 AC13); the id and the creation time never change.</summary>
    public void Edit(
        string title,
        EventCategory category,
        string summary,
        string? imageKey,
        Guid hostListingId,
        int priceCents,
        int? dropInPriceCents,
        int capacity,
        string place,
        string area)
    {
        ArgumentNullException.ThrowIfNull(title);
        ArgumentNullException.ThrowIfNull(summary);
        ArgumentNullException.ThrowIfNull(place);
        ArgumentNullException.ThrowIfNull(area);
        Title = title.Trim();
        Category = category;
        Summary = summary.Trim();
        ImageKey = imageKey;
        HostListingId = hostListingId;
        PriceCents = priceCents;
        DropInPriceCents = dropInPriceCents;
        Capacity = capacity;
        Place = place.Trim();
        Area = area.Trim();
    }
}
