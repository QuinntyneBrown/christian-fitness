using System.Globalization;
using System.Text.Json.Serialization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Events;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// Add a date (L2-071 AC14; ADR 0091): the Toronto date (<c>yyyy-MM-dd</c>), start and end
/// (<c>HH:mm</c>) staff typed, and an optional topic, for the series named by the address. A staff
/// command, audited as <c>series.session_added</c> with the series' id (L2-071 AC16).
/// </summary>
public sealed class AddSessionCommand : IRequest<AdminSeriesDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "series.session_added";

    /// <summary>The series, from the address; never read from the body.</summary>
    [JsonIgnore]
    public Guid SeriesId { get; set; }

    public string Date { get; init; } = string.Empty;

    public string StartTime { get; init; } = string.Empty;

    public string EndTime { get; init; } = string.Empty;

    public string? Topic { get; init; }

    public DateOnly? ParsedDate() =>
        DateOnly.TryParseExact(Date, EventFields.DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : null;

    public TimeOnly? ParsedStartTime() => TimeOf(StartTime);

    public TimeOnly? ParsedEndTime() => TimeOf(EndTime);

    /// <summary>The session's start in UTC, or none when the date or start is missing.</summary>
    public DateTimeOffset? StartsAt() =>
        ParsedDate() is { } date && ParsedStartTime() is { } start ? EventSchedule.StartOf(date, start) : null;

    /// <summary>The session's end in UTC, on the same Toronto date, or none when the date or end is missing.</summary>
    public DateTimeOffset? EndsAt() =>
        ParsedDate() is { } date && ParsedEndTime() is { } end ? EventSchedule.StartOf(date, end) : null;

    private static TimeOnly? TimeOf(string value) =>
        TimeOnly.TryParseExact(value, EventFields.TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) ? time : null;
}

/// <summary>
/// A date's rules (L2-071 AC14), each failure its field's code: a date, a start and an end are
/// required; the start must be after now (named on the date, mock <c>add-session/invalid</c>); the
/// end must be after the start; a topic is at most 200 characters.
/// </summary>
public sealed class AddSessionValidator : AbstractValidator<AddSessionCommand>
{
    public AddSessionValidator(TimeProvider time)
    {
        ArgumentNullException.ThrowIfNull(time);
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(c => c.Date)
            .Must((command, _) => command.ParsedDate() is not null).WithErrorCode(EventFieldCodes.DateRequired).WithMessage("Pick a date")
            .Must((command, _) => command.StartsAt() is not { } starts || starts > time.GetUtcNow())
            .WithErrorCode(EventFieldCodes.StartInPast).WithMessage("Pick a date and start time after now");

        RuleFor(c => c.StartTime)
            .Must((command, _) => command.ParsedStartTime() is not null).WithErrorCode(EventFieldCodes.StartTimeRequired).WithMessage("Pick a start time");

        RuleFor(c => c.EndTime)
            .Must((command, _) => command.ParsedEndTime() is not null).WithErrorCode(EventFieldCodes.EndTimeRequired).WithMessage("Pick an end time")
            .Must((command, _) => command.StartsAt() is not { } starts || command.EndsAt() > starts)
            .WithErrorCode(EventFieldCodes.EndNotAfterStart).WithMessage("End the session after it starts");

        RuleFor(c => c.Topic)
            .Must(topic => topic is null || topic.Trim().Length <= Event.TopicMaxLength)
            .WithErrorCode(EventFieldCodes.TopicTooLong).WithMessage("Use 200 characters or fewer");
    }
}

/// <summary>
/// Adds a published session event with the series' details (<see cref="Event.CreateSession"/>), so
/// it sits among the sessions in date order and is listed under Events (L2-071 AC6, AC14); an
/// unknown series is <c>not_found</c>. Answers the series as it now is.
/// </summary>
internal sealed class AddSessionHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit) : IRequestHandler<AddSessionCommand, AdminSeriesDto>
{
    public async Task<AdminSeriesDto> Handle(AddSessionCommand request, CancellationToken cancellationToken)
    {
        var series = await db.EventSeries.SingleOrDefaultAsync(s => s.Id == request.SeriesId, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var now = time.GetUtcNow();
        var session = Event.CreateSession(
            series,
            request.StartsAt() ?? throw new InvalidOperationException("The validator lets no missing start through."),
            request.EndsAt() ?? throw new InvalidOperationException("The validator lets no missing end through."),
            request.Topic,
            now);
        db.Events.Add(session);
        audit.Record(current.Id, nameof(EventSeries), series.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await AdminSeriesAnswer.OfAsync(db, series, now, cancellationToken).ConfigureAwait(false);
    }
}
