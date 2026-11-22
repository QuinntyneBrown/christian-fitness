using ChristianFitness.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Sessions;

/// <summary>The signed-in member's session (ADR 0007; sign-in adds the rest in slice 3.1).</summary>
public sealed record GetSessionQuery : IRequest<SessionDto>;

internal sealed class GetSessionHandler(IAppDbContext db, ICurrentMember current) : IRequestHandler<GetSessionQuery, SessionDto>
{
    public Task<SessionDto> Handle(GetSessionQuery request, CancellationToken cancellationToken)
    {
        var id = current.Id;
        return db.Members
            .Where(member => member.Id == id)
            .Select(member => new SessionDto(member.Id, member.Name))
            .SingleAsync(cancellationToken);
    }
}
