using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Profiles;

namespace ChristianFitness.Infrastructure.Registrations;

/// <summary>
/// The registrations before registration exists: none for anyone (ADR 0015, ADR 0022). Slice 6.1
/// replaces it with a query of the member's registrations for upcoming, published events, soonest
/// first, and a count of each member's registrations.
/// </summary>
internal sealed class NoRegistrationsYet : IRegistrationReader
{
    public Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<UpcomingEventDto>>([]);

    public Task<int> GoingAsync(Guid eventId, CancellationToken cancellationToken) => Task.FromResult(0);

    public Task<IReadOnlyDictionary<Guid, int>> GoingForAsync(IReadOnlyCollection<Guid> eventIds, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyDictionary<Guid, int>>(new Dictionary<Guid, int>());

    public Task<IReadOnlyDictionary<Guid, int>> CountsForAsync(IReadOnlyCollection<Guid> memberIds, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyDictionary<Guid, int>>(new Dictionary<Guid, int>());
}
