using ChristianFitness.Application.Profiles;

namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// The events a member registered for (ADR 0015) and how many (ADR 0022). Until registration
/// exists (slice 6.1) the implementation answers none; slice 6.1 reads the registrations instead.
/// </summary>
public interface IRegistrationReader
{
    /// <summary>The member's registered events that start after <paramref name="now"/>, soonest first.</summary>
    Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken);

    /// <summary>
    /// How many events each of <paramref name="memberIds"/> registered for, in one question for the
    /// whole page; a member with none may be left out (L2-028 AC1, "events attended").
    /// </summary>
    Task<IReadOnlyDictionary<Guid, int>> CountsForAsync(IReadOnlyCollection<Guid> memberIds, CancellationToken cancellationToken);
}
