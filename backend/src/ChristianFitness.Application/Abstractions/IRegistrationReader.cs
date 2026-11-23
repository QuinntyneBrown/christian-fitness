using ChristianFitness.Application.Profiles;

namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// The events a member registered for (ADR 0015). Until registration exists (slice 6.1) the
/// implementation answers none; slice 6.1 reads the member's registrations instead.
/// </summary>
public interface IRegistrationReader
{
    /// <summary>The member's registered events that start after <paramref name="now"/>, soonest first.</summary>
    Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken);
}
