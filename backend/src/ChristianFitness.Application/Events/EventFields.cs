using System.Globalization;

namespace ChristianFitness.Application.Events;

/// <summary>
/// The event editor's fields, as the admin app sends them (L2-022 AC1; ADR 0021): the start as the
/// Toronto date (<c>yyyy-MM-dd</c>) and time (<c>HH:mm</c>) staff typed, the price in cents (0 is
/// free), the category by its lower-case name and an optional image by its key (ADR 0025). Creating
/// and editing an event send the same body.
/// </summary>
public abstract class EventFields
{
    public const string DateFormat = "yyyy-MM-dd";
    public const string TimeFormat = "HH:mm";

    public string Title { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public string Date { get; init; } = string.Empty;

    public string StartTime { get; init; } = string.Empty;

    public string Place { get; init; } = string.Empty;

    public string Area { get; init; } = string.Empty;

    public int? PriceCents { get; init; }

    public int? Capacity { get; init; }

    public string Summary { get; init; } = string.Empty;

    /// <summary>The stored image's key (<c>POST /api/admin/events/images</c>), or none.</summary>
    public string? ImageKey { get; init; }

    /// <summary>The directory listing that hosts the event, chosen in the Host picker (L2-022 AC11; ADR 0088).</summary>
    public Guid? HostListingId { get; init; }

    /// <summary>The Toronto date, or none when it is missing or not a <see cref="DateFormat"/> date.</summary>
    public DateOnly? ParsedDate() =>
        DateOnly.TryParseExact(Date, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : null;

    /// <summary>The Toronto time, or none when it is missing or not a <see cref="TimeFormat"/> time.</summary>
    public TimeOnly? ParsedStartTime() =>
        TimeOnly.TryParseExact(StartTime, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) ? time : null;
}
