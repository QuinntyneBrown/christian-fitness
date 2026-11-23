using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>
/// L2-029 AC1, AC2 and AC6 (ADR 0025): the transition table, one case per row. A change the
/// status allows moves the status and keeps the note, trimmed; one it does not allow changes
/// nothing, the earlier note included.
/// </summary>
public sealed class MemberModerationTests
{
    private const string Flag = "flag";
    private const string Suspend = "suspend";
    private const string Earlier = "An earlier note";

    public static TheoryData<MemberStatus, string, MemberStatus?> Rows() => new()
    {
        // from, action, the status after, or none when the change is refused
        { MemberStatus.Active, Flag, MemberStatus.Flagged },
        { MemberStatus.Flagged, Flag, null },
        { MemberStatus.Suspended, Flag, null },
        { MemberStatus.Active, Suspend, MemberStatus.Suspended },
        { MemberStatus.Flagged, Suspend, MemberStatus.Suspended },
        { MemberStatus.Suspended, Suspend, null },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public void Given_a_member_When_they_are_flagged_or_suspended_Then_only_what_their_status_allows_changes_them(MemberStatus from, string action, MemberStatus? after)
    {
        var member = Member.Join("Priya Nair", "priya.nair@gmail.com", "hash", new DateTimeOffset(2026, 2, 20, 17, 0, 0, TimeSpan.Zero));
        if (from != MemberStatus.Active)
        {
            Assert.True(member.TryFlag(Earlier));
        }

        if (from == MemberStatus.Suspended)
        {
            Assert.True(member.TrySuspend(Earlier));
        }

        var changed = action == Flag
            ? member.TryFlag("  Two members asked about messages from this account ")
            : member.TrySuspend("  Two members asked about messages from this account ");

        Assert.Equal(after is not null, changed);
        Assert.Equal(after ?? from, member.Status);
        Assert.Equal(
            after is not null ? "Two members asked about messages from this account" : Earlier,
            member.ModerationNote);
    }

    [Fact]
    public void Given_a_new_member_When_nothing_has_been_done_Then_they_are_active_with_no_note()
    {
        var member = Member.Join("Priya Nair", "priya.nair@gmail.com", "hash", DateTimeOffset.UnixEpoch);

        Assert.Equal(MemberStatus.Active, member.Status);
        Assert.Null(member.ModerationNote);
    }
}
