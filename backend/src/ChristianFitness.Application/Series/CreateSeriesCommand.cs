using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Events;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Events;
using MediatR;

namespace ChristianFitness.Application.Series;

/// <summary>
/// New series (L2-071 AC12): a series with no dates. A staff command, audited as
/// <c>series.created</c> with the series' id (L2-071 AC16; ADR 0023, ADR 0091).
/// </summary>
public sealed class CreateSeriesCommand : SeriesFields, IRequest<AdminSeriesDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "series.created";
}

/// <summary>A new series' rules: the editor's (<see cref="SeriesFieldsValidator{T}"/>).</summary>
public sealed class CreateSeriesValidator(IImageStore images, IAppDbContext db) : SeriesFieldsValidator<CreateSeriesCommand>(images, db)
{
}

/// <summary>
/// Saves the series and answers it as the page shows it. The body was validated before this runs, so
/// every field is there and within its limits.
/// </summary>
internal sealed class CreateSeriesHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit) : IRequestHandler<CreateSeriesCommand, AdminSeriesDto>
{
    public async Task<AdminSeriesDto> Handle(CreateSeriesCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var series = EventSeries.Create(
            request.Title,
            EventNames.CategoryOf(request.Category) ?? throw new InvalidOperationException("The validator lets no unknown category through."),
            request.Summary,
            request.ImageKey,
            request.HostListingId ?? throw new InvalidOperationException("The validator lets no missing host through."),
            request.PriceCents ?? throw new InvalidOperationException("The validator lets no missing price through."),
            request.DropInPriceCents,
            request.Capacity ?? throw new InvalidOperationException("The validator lets no missing capacity through."),
            request.Place,
            request.Area,
            now);

        db.EventSeries.Add(series);
        audit.Record(current.Id, nameof(EventSeries), series.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await AdminSeriesAnswer.OfAsync(db, series, now, cancellationToken).ConfigureAwait(false);
    }
}
