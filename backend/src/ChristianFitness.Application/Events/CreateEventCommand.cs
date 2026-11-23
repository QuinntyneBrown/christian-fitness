using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using MediatR;

namespace ChristianFitness.Application.Events;

/// <summary>
/// The event editor's fields, as the admin app sends them (L2-022 AC1; ADR 0020): the start as the
/// Toronto date (<c>yyyy-MM-dd</c>) and time (<c>HH:mm</c>) staff typed, the price in cents (0 is
/// free) and the category by its lower-case name. A plain staff command: Admin-only access and its
/// audit entry are slices 29.1 and 29.2.
/// </summary>
public sealed class CreateEventCommand : IRequest<AdminEventDto>
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

    /// <summary>The Toronto date, or none when it is missing or not a <see cref="DateFormat"/> date.</summary>
    public DateOnly? ParsedDate() =>
        DateOnly.TryParseExact(Date, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : null;

    /// <summary>The Toronto time, or none when it is missing or not a <see cref="TimeFormat"/> time.</summary>
    public TimeOnly? ParsedStartTime() =>
        TimeOnly.TryParseExact(StartTime, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) ? time : null;
}

/// <summary>
/// Saves the event as a draft (L2-022 AC1), its start read in Toronto (<see cref="EventSchedule"/>).
/// The body was validated before this runs (<see cref="CreateEventValidator"/>), so every field is
/// there and within its limits.
/// </summary>
internal sealed class CreateEventHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<CreateEventCommand, AdminEventDto>
{
    public async Task<AdminEventDto> Handle(CreateEventCommand request, CancellationToken cancellationToken)
    {
        var created = Event.CreateDraft(
            request.Title,
            EventNames.CategoryOf(request.Category) ?? throw new InvalidOperationException("The validator lets no unknown category through."),
            EventSchedule.StartOf(
                request.ParsedDate() ?? throw new InvalidOperationException("The validator lets no missing date through."),
                request.ParsedStartTime() ?? throw new InvalidOperationException("The validator lets no missing time through.")),
            request.Place,
            request.Area,
            request.PriceCents ?? 0,
            request.Capacity ?? 0,
            request.Summary,
            time.GetUtcNow());
        db.Events.Add(created);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return AdminEventDto.Of(created, going: 0);
    }
}
