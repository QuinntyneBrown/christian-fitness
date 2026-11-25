using System.Text.Json.Serialization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// Save changes (L2-071 AC13): the editor's fields, the series named by the address. A staff
/// command, audited as <c>series.updated</c> with the series' id (L2-071 AC16; ADR 0091).
/// </summary>
public sealed class UpdateSeriesCommand : SeriesFields, IRequest<AdminSeriesDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "series.updated";

    /// <summary>The series to change, from the address; never read from the body.</summary>
    [JsonIgnore]
    public Guid Id { get; set; }
}

/// <summary>A saved series' rules: the editor's (<see cref="SeriesFieldsValidator{T}"/>).</summary>
public sealed class UpdateSeriesValidator(IImageStore images, IAppDbContext db) : SeriesFieldsValidator<UpdateSeriesCommand>(images, db)
{
}

/// <summary>
/// Replaces the series' details (L2-071 AC13) and copies them to every session that has not started,
/// cancelled ones included, so the events listed follow (L2-071 AC6; ADR 0091); a session already
/// started keeps what members attended. A capacity below the members who joined is refused with
/// <c>capacity_below_joined</c>; an unknown series with <c>not_found</c>.
/// </summary>
internal sealed class UpdateSeriesHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit) : IRequestHandler<UpdateSeriesCommand, AdminSeriesDto>
{
    public async Task<AdminSeriesDto> Handle(UpdateSeriesCommand request, CancellationToken cancellationToken)
    {
        var series = await db.EventSeries.SingleOrDefaultAsync(s => s.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var capacity = request.Capacity ?? throw new InvalidOperationException("The validator lets no missing capacity through.");
        var joined = await db.SeriesEnrolments.CountAsync(e => e.SeriesId == series.Id, cancellationToken).ConfigureAwait(false);
        if (capacity < joined)
        {
            throw new RefusalException(RefusalCodes.CapacityBelowJoined, RefusalKind.Conflict);
        }

        series.Edit(
            request.Title,
            EventNames.CategoryOf(request.Category) ?? throw new InvalidOperationException("The validator lets no unknown category through."),
            request.Summary,
            request.ImageKey,
            request.HostListingId ?? throw new InvalidOperationException("The validator lets no missing host through."),
            request.PriceCents ?? throw new InvalidOperationException("The validator lets no missing price through."),
            request.DropInPriceCents,
            capacity,
            request.Place,
            request.Area);

        var now = time.GetUtcNow();
        var toCome = await db.Events
            .Where(e => e.SeriesId == series.Id && e.StartsAt > now)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        foreach (var session in toCome)
        {
            session.FollowSeries(series);
        }

        audit.Record(current.Id, nameof(EventSeries), series.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await AdminSeriesAnswer.OfAsync(db, series, now, cancellationToken).ConfigureAwait(false);
    }
}
