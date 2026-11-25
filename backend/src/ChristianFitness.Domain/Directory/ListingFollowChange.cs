using ChristianFitness.Domain.Members;

namespace ChristianFitness.Domain.Directory;

/// <summary>
/// One follow or unfollow a member sent, kept only to count them (L2-056 AC9; ADR 0088): at most
/// <see cref="HourlyWindow"/>'s 60 in a rolling hour. A change older than the hour is deleted when
/// the member's next is stored, so the log never grows past the window.
/// </summary>
public sealed class ListingFollowChange
{
    /// <summary>60 follows and unfollows in a rolling hour (ADR 0077, ADR 0088).</summary>
    public static readonly AttemptWindow HourlyWindow = new(60, TimeSpan.FromHours(1));

    private ListingFollowChange()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public DateTimeOffset ChangedAt { get; private set; }

    /// <summary><paramref name="memberId"/> followed or unfollowed a listing at <paramref name="at"/>.</summary>
    public static ListingFollowChange Of(Guid memberId, DateTimeOffset at) =>
        new() { Id = Guid.CreateVersion7(), MemberId = memberId, ChangedAt = at };
}
