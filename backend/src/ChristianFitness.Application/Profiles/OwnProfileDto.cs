namespace ChristianFitness.Application.Profiles;

/// <summary>
/// The signed-in member's own profile (L2-005 AC1; ADR 0015): every field, the optional ones
/// <c>null</c> until given. It is answered only to its owner, so it may carry the home church.
/// </summary>
public sealed record OwnProfileDto(
    string Name,
    string? City,
    DateTimeOffset JoinedAt,
    string? Bio,
    string? HomeChurch,
    IReadOnlyList<string> Goals,
    IReadOnlyList<string> Interests,
    IReadOnlyList<UpcomingEventDto> UpcomingEvents);
