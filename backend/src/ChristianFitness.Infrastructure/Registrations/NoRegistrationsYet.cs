using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Profiles;

namespace ChristianFitness.Infrastructure.Registrations;

/// <summary>
/// The registrations before registration exists: none for anyone (ADR 0014). Slice 6.1 replaces it
/// with a query of the member's registrations for upcoming, published events, soonest first.
/// </summary>
internal sealed class NoRegistrationsYet : IRegistrationReader
{
    public Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<UpcomingEventDto>>([]);
}
