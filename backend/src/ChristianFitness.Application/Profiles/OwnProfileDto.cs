using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Profiles;

/// <summary>
/// The signed-in member's own profile (L2-005 AC1; ADR 0015): every field, the optional ones
/// <c>null</c> until given. It is answered only to its owner, so it may carry the home church and
/// whether other members see it; <see cref="MemberId"/> names the profile to write (ADR 0024).
/// </summary>
public sealed record OwnProfileDto(
    Guid MemberId,
    string Name,
    string? City,
    DateTimeOffset JoinedAt,
    string? Bio,
    string? HomeChurch,
    bool ShowHomeChurch,
    IReadOnlyList<string> Goals,
    IReadOnlyList<string> Interests,
    IReadOnlyList<UpcomingEventDto> UpcomingEvents)
{
    /// <summary>The profile of <paramref name="member"/>, going to <paramref name="upcoming"/>.</summary>
    public static OwnProfileDto Of(Member member, IReadOnlyList<UpcomingEventDto> upcoming)
    {
        ArgumentNullException.ThrowIfNull(member);
        return new OwnProfileDto(
            member.Id,
            member.Name,
            member.City,
            member.JoinedAt,
            member.Bio,
            member.HomeChurch,
            member.ShowHomeChurch,
            member.Goals,
            member.Interests,
            upcoming);
    }
}
