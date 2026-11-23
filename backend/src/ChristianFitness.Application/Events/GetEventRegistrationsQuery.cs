using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>One registered member as staff see them: the name and when they registered, nothing else (L2-024 AC1; ADR 0036).</summary>
public sealed record RegistrationRowDto(string Name, DateTimeOffset RegisteredAt);

/// <summary>An event's capacity, how many are going and the registered members, oldest first (L2-024 AC1; ADR 0036).</summary>
public sealed record EventRegistrationsDto(Guid EventId, string Title, int Capacity, int Going, IReadOnlyList<RegistrationRowDto> Registrations);

/// <summary>Opens an event's registrations; an unknown event is 404 <c>not_found</c>.</summary>
public sealed record GetEventRegistrationsQuery(Guid Id) : IRequest<EventRegistrationsDto>
{
    /// <summary>The most rows one answer holds; a capacity above it lists the earliest registrations (ADR 0036).</summary>
    public const int Limit = 500;
}

internal sealed class GetEventRegistrationsHandler(IAppDbContext db, IRegistrationReader registrations)
    : IRequestHandler<GetEventRegistrationsQuery, EventRegistrationsDto>
{
    public async Task<EventRegistrationsDto> Handle(GetEventRegistrationsQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var e = await db.Events.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        var going = await registrations.GoingAsync(e.Id, cancellationToken).ConfigureAwait(false);
        var rows = await db.Registrations.AsNoTracking()
            .Where(r => r.EventId == e.Id)
            .Join(db.Members, r => r.MemberId, m => m.Id, (r, m) => new { m.Name, r.CreatedAt, r.Id })
            .OrderBy(r => r.CreatedAt)
            .ThenBy(r => r.Id)
            .Take(GetEventRegistrationsQuery.Limit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return new EventRegistrationsDto(e.Id, e.Title, e.Capacity, going, [.. rows.Select(r => new RegistrationRowDto(r.Name, r.CreatedAt))]);
    }
}
