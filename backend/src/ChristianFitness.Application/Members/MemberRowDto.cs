using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Members;

/// <summary>
/// A member as the admin Members table shows them (L2-028 AC1; ADR 0022): the join date as an
/// instant in UTC, which the app shows in Toronto, and the status by its lower-case name. The home
/// church is optional and sensitive, and the note is staff's own words about a person: both are
/// answered for display and never logged (L2-033). This is
/// a class, not a record, so no generated <c>ToString</c> can print the email or the home church.
/// </summary>
public sealed class MemberRowDto(Guid id, string name, string email, string? homeChurch, DateTimeOffset joinedAt, int eventsAttended, string status, string? note)
{
    /// <summary>The member as staff see them, with <paramref name="eventsAttended"/> from the registrations.</summary>
    public static MemberRowDto Of(Member member, int eventsAttended)
    {
        ArgumentNullException.ThrowIfNull(member);
        return new MemberRowDto(
            member.Id, member.Name, member.Email, member.HomeChurch, member.JoinedAt, eventsAttended, MemberStatusNames.Of(member.Status), member.ModerationNote);
    }

    public Guid Id { get; } = id;

    public string Name { get; } = name;

    public string Email { get; } = email;

    public string? HomeChurch { get; } = homeChurch;

    public DateTimeOffset JoinedAt { get; } = joinedAt;

    /// <summary>How many events the member registered for; a number, never words (AGENTS.md).</summary>
    public int EventsAttended { get; } = eventsAttended;

    public string Status { get; } = status;

    /// <summary>Why staff last flagged or suspended them, in staff's words; none otherwise (L2-029 AC1).</summary>
    public string? Note { get; } = note;
}

/// <summary>
/// One page of the staff list of members: <see cref="Total"/> counts every member of the
/// community, <see cref="Matches"/> those the search and status leave, and <see cref="Page"/> is
/// the page answered, which is the last one when a later page was asked for.
/// </summary>
public sealed record MemberListDto(int Total, int Matches, int Page, int PageSize, IReadOnlyList<MemberRowDto> Members);

/// <summary>The names the API reads and writes for a member's status: lower case, as the admin app sends them.</summary>
public static class MemberStatusNames
{
    public static string Of(MemberStatus status) => status switch
    {
        MemberStatus.Active => "active",
        MemberStatus.Flagged => "flagged",
        MemberStatus.Suspended => "suspended",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "A member status with no name."),
    };

    /// <summary>The status named <paramref name="name"/>, or none for anything else, <c>all</c> included.</summary>
    public static MemberStatus? StatusOf(string? name) => name switch
    {
        "active" => MemberStatus.Active,
        "flagged" => MemberStatus.Flagged,
        "suspended" => MemberStatus.Suspended,
        _ => null,
    };
}
